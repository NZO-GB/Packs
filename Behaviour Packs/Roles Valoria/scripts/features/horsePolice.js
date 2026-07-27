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