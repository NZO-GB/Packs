import { world } from "@minecraft/server";
import { cachedHasRole } from "../roles/roleManager.js"; 

const SPEED_DURATION_TICKS = 60; // 5 seconds
const SPEED_AMPLIFIER = 1;        // Speed I

const REGEN_DURATION_TICKS = 60;  // 3 seconds
const REGEN_AMPLIFIER = 1;        // Regeneration I

world.afterEvents.itemCompleteUse.subscribe((event) => {
  const { source: player, itemStack } = event;

  if (!player || player.typeId !== "minecraft:player") return;

  if (!cachedHasRole(player, "granjero")) return;

  if (itemStack.typeId === "minecraft:potion" || itemStack.typeId === "minecraft:milk_bucket") {
    return;
  }

  player.addEffect("speed", SPEED_DURATION_TICKS, {
    amplifier: SPEED_AMPLIFIER,
    showParticles: true
  });

  player.addEffect("regeneration", REGEN_DURATION_TICKS, {
    amplifier: REGEN_AMPLIFIER,
    showParticles: true
  });

  player.onScreenDisplay.setActionBar("§a¡Ñam!");
});