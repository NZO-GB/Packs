import { world, system } from "@minecraft/server";
import { cachedHasRole } from "../roles/roleManager.js";

// Configuration
const CHECK_INTERVAL = 20; // Check every 20 ticks (1 second)
const REGEN_DURATION = 30;  // 2 seconds duration (keeps effect smooth between checks)
const REGEN_AMPLIFIER = 1; // Regeneration I (0 = Level I, 1 = Level II)
const REQUIRED_ROLE = "pescador";

system.runInterval(() => {
  for (const player of world.getAllPlayers()) {
    if (!cachedHasRole(player, REQUIRED_ROLE)) continue;
    if (player.isInWater || player.isSwimming) {
      player.addEffect("regeneration", REGEN_DURATION, {
        amplifier: REGEN_AMPLIFIER,
        showParticles: true
      });
    }
  }
}, CHECK_INTERVAL);