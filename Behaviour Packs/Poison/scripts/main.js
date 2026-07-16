import { world, system } from "@minecraft/server";

const BOUNDARY = 3000;
const CHECK_INTERVAL = 40;
const EXEMPT_PLAYERS = ["Lozor10"];
const WARNING_TICKS = 100; 

const playerWarningTimers = new Map();

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
    if (!isEnabled("boundary")) {
      playerWarningTimers.clear();
      return;
    }

    for (const player of world.getAllPlayers()) {
      if (EXEMPT_PLAYERS.includes(player.name)) {
        playerWarningTimers.delete(player.name);
        continue;
      }

      const { x, z } = player.location;
      const outside = x > BOUNDARY || x < -BOUNDARY || z > BOUNDARY || z < -BOUNDARY;

      if (outside) {
        const ticksOutside = (playerWarningTimers.get(player.name) ?? 0) + CHECK_INTERVAL;
        playerWarningTimers.set(player.name, ticksOutside);

        if (ticksOutside <= WARNING_TICKS) {
          // Warning phase
          player.onScreenDisplay.setActionBar("§cNo eres explorador, respiras veneno");
        } else {
          // Poison phase
          player.onScreenDisplay.setActionBar("§4Has sido advertido, ahora perece...");
          player.addEffect("minecraft:poison", 40, {
            amplifier: 1,
            showParticles: true
          });
        }
      } else {
        // Player is back inside, reset their timer
        if (playerWarningTimers.has(player.name)) {
          player.onScreenDisplay.setActionBar("§aEstás seguro, por ahora...");
          playerWarningTimers.delete(player.name);
        }
      }
    }
  }, CHECK_INTERVAL);

});