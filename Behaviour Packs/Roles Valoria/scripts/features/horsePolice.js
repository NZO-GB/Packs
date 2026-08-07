import { world, system } from "@minecraft/server";

const HORSE_ID = "valoria:explorer_horse";
const REQUIRED_TAG = "role_explorador";

export function registerHorseProtection() {
  world.beforeEvents.playerInteractWithEntity.subscribe((event) => {
    const { player, target } = event;

    if (target.typeId === HORSE_ID) {
      if (!player.hasTag(REQUIRED_TAG)) {
        event.cancel = true; 

        system.run(() => {
        player.onScreenDisplay.setActionBar("§cSólo un explorador puede montar tal semental");
        });
      }
    }
  });
};

export function initHorseWaterGliding() {
  system.runInterval(() => {
      const overworld = world.getDimension("overworld");
      const horses = overworld.getEntities({ type: "valoria:explorer_horse" });

      for (const horse of horses) {
          const loc = horse.location;
          
          // Check blocks at feet level and slightly below
          const currentBlock = overworld.getBlock(loc);
          const blockBelow = overworld.getBlock({ x: loc.x, y: loc.y - 0.3, z: loc.z });

          const isWater = (b) => b?.typeId === "minecraft:water" || b?.typeId === "minecraft:flowing_water";

          if (isWater(currentBlock) || isWater(blockBelow)) {
              const vel = horse.getVelocity();

              // Whenever gravity tries to pull the horse under water, lift it back to the surface
              if (vel.y < 0) {
                  horse.applyImpulse({
                      x: vel.x * 0.05, // Preserves forward rider momentum so it glides cleanly
                      y: 0.085,        // Exactly cancels out downward gravity over liquid
                      z: vel.z * 0.05
                  });
              }
          }
      }
  }, 1);
}