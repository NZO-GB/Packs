import { world } from "@minecraft/server";
import { consumeItem } from "./consumeItem";
import { CooldownManager } from "../cooldownManager.js";
import { hasRole } from "../roles/roleManager.js";

// --- CONFIGURATION ---
const SUMMON_ITEM_ID = "horse:call";
const HORSE_IDENTIFIER = "valoria:explorer_horse";
const HORSE_COOLDOWN_TICKS = 12000

export function registerHorseSummoner() {
  world.afterEvents.itemUse.subscribe((event) => {
    const player = event.source;
    const item = event.itemStack;

    if (item.typeId !== SUMMON_ITEM_ID) return;

    if (!hasRole(player, "explorador")) return;

    if (!CooldownManager.isReady(player, SUMMON_ITEM_ID, HORSE_COOLDOWN_TICKS)) return;

    const dimension = player.dimension;
    const location = player.location;
    const viewVector = player.getViewDirection();

    const spawnLocation = {
      x: location.x + viewVector.x * 2,
      y: location.y,
      z: location.z + viewVector.z * 2
    };

    const horse = dimension.spawnEntity(HORSE_IDENTIFIER, spawnLocation);

    dimension.runCommand(`particle minecraft:evoker_spell ${spawnLocation.x} ${spawnLocation.y + 1} ${spawnLocation.z}`);
    dimension.runCommand(`playsound mob.endermen.portal @a ${spawnLocation.x} ${spawnLocation.y} ${spawnLocation.z}`);

    const rideable = horse.getComponent("minecraft:rideable");
    if (rideable) {
      rideable.addRider(player);
    }

    consumeItem(player)

  });
}