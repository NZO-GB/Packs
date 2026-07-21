import { world, system } from "@minecraft/server";
import { hasRole } from "../roles/roleManager.js";

const CHECK_INTERVAL = 20;
const WARNING_TICKS = 100;
const COORDINATE_BOUNDARY = 3000;
const netherTimers = new Map();
const boundaryTimers = new Map();

function isEnabled(feature) {
  try {
    const obj = world.scoreboard.getObjective("featureFlags");
    if (!obj) return false;
    const p = [...obj.getParticipants()].find(p => p.displayName === feature);
    return p ? obj.getScore(p) === 1 : false;
  } catch {
    return false;
  }
}

export function initBoundaryDamage() {
  system.runInterval(() => {
    const netherOn = isEnabled("netherBoundary");
    const boundaryOn = isEnabled("boundary");

    if (!netherOn) netherTimers.clear();
    if (!boundaryOn) boundaryTimers.clear();
    if (!netherOn && !boundaryOn) return;

    for (const player of world.getAllPlayers()) {
      const name = player.name;

      // NETHER
      if (netherOn) {
        if (hasRole(player, "infernalista")) {
          netherTimers.delete(name);
        } else if (player.dimension.id === "minecraft:nether") {
          const ticks = (netherTimers.get(name) ?? 0) + CHECK_INTERVAL;
          netherTimers.set(name, ticks);
          if (ticks <= WARNING_TICKS) {
            player.onScreenDisplay.setActionBar("§6No eres infernalista, te arde la piel");
          } else {
            player.onScreenDisplay.setActionBar("§4Has sido advertido, ahora perece...");
            player.setOnFire(5, true);
          }
        } else if (netherTimers.has(name)) {
          player.onScreenDisplay.setActionBar("§aEstás seguro, por ahora...");
          netherTimers.delete(name);
        }
      }

      // BOUNDARY
      if (boundaryOn) {
        // NOTE: "explorador" can never actually be granted via !role grant,
        // since ROLES in roleManager.js only defines "explorer". Left both
        // checks in place since that's the original design; grant players
        // the "explorer" role for this to take effect, or add "explorador"
        // to ROLES/VALID_ROLES if that's the name you actually want.
        if (hasRole(player, "explorer") || hasRole(player, "explorador")) {
          boundaryTimers.delete(name);
        } else {
          const { x, z } = player.location;
          const out = x > COORDINATE_BOUNDARY || x < -COORDINATE_BOUNDARY ||
                      z > COORDINATE_BOUNDARY || z < -COORDINATE_BOUNDARY;

          if (out) {
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

// initBoundaryDamage() is intentionally NOT called here — main.js owns
// startup sequencing and calls it once after import. Calling it here too
// would create a second overlapping runInterval loop.
