import { world, system } from "@minecraft/server";
import { isEnabled } from "./featureFlags.js";
import { cachedHasRole } from "../roles/roleManager.js";

const CHECK_INTERVAL = 20;
const WARNING_TICKS = 100;
const GENERAL_BOUNDARY = 3000;
const NETHER_BOUNDARY = 2000;

const netherTimers = new Map();
const boundaryTimers = new Map();

export function initBoundaryDamage() {
  system.runInterval(() => {
    const netherOn = isEnabled("netherBoundary");
    const boundaryOn = isEnabled("boundary");

    if (!netherOn) netherTimers.clear();
    if (!boundaryOn) boundaryTimers.clear();
    if (!netherOn && !boundaryOn) return;

    const onlinePlayers = world.getAllPlayers();
    const onlineNames = new Set(onlinePlayers.map(p => p.name));

    // Optional optimization: Clean up timers for players who left the game
    for (const name of netherTimers.keys()) {
      if (!onlineNames.has(name)) netherTimers.delete(name);
    }
    for (const name of boundaryTimers.keys()) {
      if (!onlineNames.has(name)) boundaryTimers.delete(name);
    }

    for (const player of onlinePlayers) {
      const name = player.name;
      const { x, z } = player.location;

      // NETHER (Coordinate check > 2000)
      if (netherOn) {
        if (cachedHasRole(player, "infernalista")) {
          netherTimers.delete(name);
        } else if (player.dimension.id === "minecraft:nether") {
          const outNether = x > NETHER_BOUNDARY || x < -NETHER_BOUNDARY ||
                            z > NETHER_BOUNDARY || z < -NETHER_BOUNDARY;

          if (outNether) {
            const ticks = (netherTimers.get(name) ?? 0) + CHECK_INTERVAL;
            netherTimers.set(name, ticks);
            if (ticks <= WARNING_TICKS) {
              player.onScreenDisplay.setActionBar("§6Más allá de 2000 bloques, te arde la piel");
            } else {
              player.onScreenDisplay.setActionBar("§4Has sido advertido, ahora perece...");
              player.setOnFire(5, true);
            }
          } else if (netherTimers.has(name)) {
            player.onScreenDisplay.setActionBar("§aEstás seguro, por ahora...");
            netherTimers.delete(name);
          }
        } else if (netherTimers.has(name)) {
          netherTimers.delete(name);
        }
      }

      // GENERAL BOUNDARY (Coordinate check > 3000)
      if (boundaryOn) {
        if (cachedHasRole(player, "explorador")) {
          boundaryTimers.delete(name);
        } else {
          const outBoundary = x > GENERAL_BOUNDARY || x < -GENERAL_BOUNDARY ||
                              z > GENERAL_BOUNDARY || z < -GENERAL_BOUNDARY;

          if (outBoundary) {
            const ticks = (boundaryTimers.get(name) ?? 0) + CHECK_INTERVAL;
            boundaryTimers.set(name, ticks);
            if (ticks <= WARNING_TICKS) {
              player.onScreenDisplay.setActionBar("§cNo eres explorador, respiras veneno");
            } else {
              player.onScreenDisplay.setActionBar("§4Has sido advertido, ahora perece...");
              player.addEffect("minecraft:poison", 40, { amplifier: 1, showParticles: true });
            }
          } else if (boundaryTimers.has(name)) {
            player.onScreenDisplay.setActionBar("§aEstás seguro, por ahora...");
            boundaryTimers.delete(name);
          }
        }
      }
    }
  }, CHECK_INTERVAL);
}