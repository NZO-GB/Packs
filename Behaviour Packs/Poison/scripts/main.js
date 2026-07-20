import { world, system } from "@minecraft/server";
import { hasRole } from "../roles/roleManager.js"; // Import our new role logic

// Configuration
const CHECK_INTERVAL = 20; // Runs every 20 ticks (1 second)
const WARNING_TICKS = 100; // 5 seconds of warning

// Coordinate Boundary Configuration
const COORDINATE_BOUNDARY = 3000;

// Warning timers mapped by player name
const netherWarningTimers = new Map();
const boundaryWarningTimers = new Map();

/**
 * Checks if a feature flag is enabled via the scoreboard
 */
function isEnabled(feature) {
  try {
    const objective = world.scoreboard.getObjective("featureFlags");
    if (!objective) return false;
    const participant = [...objective.getParticipants()]
      .find(p => p.displayName === feature);
    if (!participant) return false;
    return objective.getScore(participant) === 1;
  } catch {
    return false;
  }
}

world.afterEvents.worldLoad.subscribe(() => {

  system.runInterval(() => {
    const netherEnabled = isEnabled("netherBoundary");
    const boundaryEnabled = isEnabled("boundary");

    // Clear timers if features are disabled globally
    if (!netherEnabled) netherWarningTimers.clear();
    if (!boundaryEnabled) boundaryWarningTimers.clear();

    // If both features are turned off, we don't need to loop through players at all
    if (!netherEnabled && !boundaryEnabled) return;

    for (const player of world.getAllPlayers()) {
      const playerName = player.name;

      // ==========================================
      // HAZARD 1: NETHER BOUNDARY (INFERNALISTA ROLE)
      // ==========================================
      if (netherEnabled) {
        // Exempt if player has the "infernalista" role
        if (hasRole(player, "infernalista")) {
          netherWarningTimers.delete(playerName);
        } else {
          const inNether = player.dimension.id === "minecraft:nether";

          if (inNether) {
            const ticksInNether = (netherWarningTimers.get(playerName) ?? 0) + CHECK_INTERVAL;
            netherWarningTimers.set(playerName, ticksInNether);

            if (ticksInNether <= WARNING_TICKS) {
              player.onScreenDisplay.setActionBar("§6No eres infernalista, te arde la piel");
            } else {
              player.onScreenDisplay.setActionBar("§4Has sido advertido, ahora perece...");
              player.setOnFire(5, true);
            }
          } else {
            // Player left the Nether, reset their timer and clear action bar
            if (netherWarningTimers.has(playerName)) {
              player.onScreenDisplay.setActionBar("§aEstás seguro, por ahora...");
              netherWarningTimers.delete(playerName);
            }
          }
        }
      }

      // ==========================================
      // HAZARD 2: WORLD BOUNDARY (EXPLORER ROLE)
      // ==========================================
      if (boundaryEnabled) {
        // Exempt if player has the "explorer" (or "explorador") role
        if (hasRole(player, "explorer") || hasRole(player, "explorador")) {
          boundaryWarningTimers.delete(playerName);
        } else {
          const { x, z } = player.location;
          const isOutside = x > COORDINATE_BOUNDARY || x < -COORDINATE_BOUNDARY || z > COORDINATE_BOUNDARY || z < -COORDINATE_BOUNDARY;

          if (isOutside) {
            const ticksOutside = (boundaryWarningTimers.get(playerName) ?? 0) + CHECK_INTERVAL;
            boundaryWarningTimers.set(playerName, ticksOutside);

            if (ticksOutside <= WARNING_TICKS) {
              player.onScreenDisplay.setActionBar("§cNo eres explorador, respiras veneno");
            } else {
              player.onScreenDisplay.setActionBar("§4Has sido advertido, ahora perece...");
              player.addEffect("minecraft:poison", 40, {
                amplifier: 1,
                showParticles: true
              });
            }
          } else {
            // Player came back inside the boundary, reset their timer and clear action bar
            if (boundaryWarningTimers.has(playerName)) {
              player.onScreenDisplay.setActionBar("§aEstás seguro, por ahora...");
              boundaryWarningTimers.delete(playerName);
            }
          }
        }
      }
      
    }
  }, CHECK_INTERVAL);

});