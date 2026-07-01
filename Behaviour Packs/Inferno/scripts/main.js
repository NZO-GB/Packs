import { world, system } from "@minecraft/server";

const CHECK_INTERVAL = 20;
const WARNING_TICKS = 100;
const EXEMPT_PLAYERS = ["ray700"];

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
    if (!isEnabled("netherBoundary")) {
      playerWarningTimers.clear();
      return;
    }

    for (const player of world.getAllPlayers()) {
      if (EXEMPT_PLAYERS.includes(player.name)) {
        playerWarningTimers.delete(player.name);
        continue;
      }

      const inNether = player.dimension.id === "minecraft:nether";

      if (inNether) {
        const ticksInNether = (playerWarningTimers.get(player.name) ?? 0) + CHECK_INTERVAL;
        playerWarningTimers.set(player.name, ticksInNether);

        if (ticksInNether <= WARNING_TICKS) {
          player.onScreenDisplay.setActionBar("§6No eres infernalista, te arde la piel");
        } else {
          player.onScreenDisplay.setActionBar("§4Has sido advertido, ahora perece...");
          player.setOnFire(5, true);
        }
      } else {
        // Player left the nether, reset their timer
        if (playerWarningTimers.has(player.name)) {
          player.onScreenDisplay.setActionBar("§aEstás seguro, por ahora...");
          playerWarningTimers.delete(player.name);
        }
      }
    }
  }, CHECK_INTERVAL);

});