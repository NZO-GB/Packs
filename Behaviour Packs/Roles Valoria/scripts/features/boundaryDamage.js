import { world, system, EquipmentSlot } from "@minecraft/server";
import { isEnabled } from "./featureFlags.js";
import { cachedHasRole } from "../roles/roleManager.js";
import { ZONE_CONFIG } from "../config/zoneConfig.js"; // Adjust path if needed

// Single map: player.name -> { building: 0, overworld: 0, nether: 0 }
const playerStates = new Map();

function getPlayerState(name) {
  if (!playerStates.has(name)) {
    playerStates.set(name, { building: 0, overworld: 0, nether: 0 });
  }
  return playerStates.get(name);
}

function isWithinBounds(x, z, limit) {
  return Math.abs(x) <= limit && Math.abs(z) <= limit;
}

function evaluateZone(player, state, stateKey, activeCondition, inZoneMsg, exitZoneMsg, applyEffect) {
  if (activeCondition) {
    state[stateKey] += ZONE_CONFIG.checkInterval;

    if (state[stateKey] <= ZONE_CONFIG.warningTicks) {
      player.onScreenDisplay.setActionBar(inZoneMsg);
    } else {
      applyEffect(player);
    }
  } else if (state[stateKey] > 0) {
    if (exitZoneMsg) player.onScreenDisplay.setActionBar(exitZoneMsg);
    state[stateKey] = 0; // Reset ticks
  }
}

export function initBoundaryDamage() {
  system.runInterval(() => {
    const netherOn = isEnabled("netherBoundary");
    const boundaryOn = isEnabled("boundary");
    const buildingOn = isEnabled("building");

    // Guard clause: Total shutdown if no flags are active
    if (!netherOn && !boundaryOn && !buildingOn) {
      playerStates.clear();
      return;
    }

    const onlinePlayers = world.getAllPlayers();
    const onlineNames = new Set(onlinePlayers.map(p => p.name));

    for (const name of playerStates.keys()) {
      if (!onlineNames.has(name)) playerStates.delete(name);
    }

    for (const player of onlinePlayers) {
      const { x, z } = player.location;
      const dimId = player.dimension.id;
      const state = getPlayerState(player.name);

      if (dimId === "minecraft:overworld") {
        if (state.nether > 0) state.nether = 0;

        // --- BUILDING ZONE ---
        if (buildingOn && cachedHasRole(player, "constructor")) {
          const limit = ZONE_CONFIG.boundaries.building.default;
          const inside = isWithinBounds(x, z, limit);
          
          evaluateZone(player, state, "building", inside,
            `§6Activando poderes de construcción...`,
            `§cFuera de la zona de construcción. Beneficios perdidos.`,
            (p) => {

              p.addEffect("minecraft:haste", 45, { amplifier: 1, showParticles: false });

              // Mini-Mending: Repair mainhand item
              const equipment = p.getComponent("minecraft:equippable");
              if (equipment) {
                const item = equipment.getEquipment(EquipmentSlot.Mainhand);
                
                if (item) {
                  const durability = item.getComponent("minecraft:durability");
                  
                  if (durability && durability.damage > 0) {
                    durability.damage -= 1;
                    equipment.setEquipment(EquipmentSlot.Mainhand, item);
                  }
                }
              }
            }
          );
        } else {
          state.building = 0;
        }

        // --- OVERWORLD BOUNDARY ---
        if (boundaryOn) {
          const isExplorador = cachedHasRole(player, "explorador");
          const limit = isExplorador ? ZONE_CONFIG.boundaries.overworld.explorador : ZONE_CONFIG.boundaries.overworld.default;
          const outOfBounds = !isWithinBounds(x, z, limit);

          evaluateZone(player, state, "overworld", outOfBounds,
            isExplorador ? `§cLímite de explorador (${limit}m) superado, respiras veneno` : `§cNo eres explorador, respiras veneno más allá de ${limit}m`,
            `§aDe vuelta en territorio conocido`,
            (p) => {
              p.onScreenDisplay.setActionBar("§4Has sido advertido, ahora perece...");
              p.addEffect("minecraft:poison", 40, { amplifier: 1, showParticles: true });
            }
          );
        } else {
          state.overworld = 0;
        }

      } else if (dimId === "minecraft:nether") {
        if (state.overworld > 0) state.overworld = 0;
        if (state.building > 0) state.building = 0;

        // --- NETHER BOUNDARY ---
        if (netherOn) {
          const isInfernalista = cachedHasRole(player, "infernalista");
          const limit = isInfernalista ? ZONE_CONFIG.boundaries.nether.infernalista : ZONE_CONFIG.boundaries.nether.default;
          const outOfBounds = !isWithinBounds(x, z, limit);

          evaluateZone(player, state, "nether", outOfBounds,
            isInfernalista ? `§6Límite de infernalista (${limit}m) superado, te arde la piel` : `§6Más allá de ${limit}m, te arde la piel`,
            `§aEstás en zona segura del Nether`,
            (p) => {
              p.onScreenDisplay.setActionBar("§4Has sido advertido, ahora perece...");
              p.setOnFire(5, true);
            }
          );
        } else {
          state.nether = 0;
        }
      }
    }
  }, ZONE_CONFIG.checkInterval);
}