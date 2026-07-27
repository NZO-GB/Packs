import { world, system } from "@minecraft/server";
import { consumeItem } from "./consumeItem";
import { CooldownManager } from "../cooldownManager.js";
import { hasRole } from "../roles/roleManager.js";

const RALLIES = [
  {
    itemId: "rally:horn",
    tag: "role_granjero",
    cooldownTicks: 12000,
    durationTicks: 12000, // REMEMBER TO USE THE SAME AS TIMER IN JSON
    radius: 30,
    maxRally: 10,
    entityTypes: ["minecraft:cow", "minecraft:pig"],
    onActivate: activateRally
  },
  {
    itemId: "rally:shell",
    tag: "role_pescador",
    cooldownTicks: 12000,
    durationTicks: 12000, // REMEMBER TO USE THE SAME AS TIMER IN JSON
    radius: 30,
    maxRally: 10,
    entityTypes: ["minecraft:cod", "minecraft:salmon", "minecraft:pufferfish", "minecraft:tropicalfish"],
    onActivate: seaWrapper
  }
];

function seaWrapper(player, rally) {
  const dimension = player.dimension;
  const spawnLocation = player.location;
  const targetBlock = dimension.getBlock(spawnLocation);

  if (!targetBlock || targetBlock.typeId !== "minecraft:water") {
    player.sendMessage("No estás en el agua!");
    return false; // it returns a false so that we skip the rest of the rally event later
  }

  const companionDolphin = dimension.spawnEntity("minecraft:dolphin", spawnLocation);
  companionDolphin.triggerEvent("valoria:make_fisherman_companion");
  companionDolphin.addTag("is_fisherman_companion");

  activateRally(player, rally) // We don't care if there's no fishes nearby so we're not returning its value
}

function activateRally(player, rally) {

    const entities = rally.entityTypes.flatMap(type =>
    player.dimension.getEntities({ location: player.location, maxDistance: rally.radius, type })
  );

  if (entities.length === 0) {
    player.sendMessage("No se encontraron compañeros que reclutar")
    return false // Signaling that no eligible entities were found
  }

  console.warn("nearby entities: " + entities.length);
  const limited = entities.slice(0, rally.maxRally);
  
  for (const entity of limited) {
    const tameable = entity.getComponent("minecraft:tameable");

    if (tameable && !tameable.tamedToPlayerId) {
      tameable.tame(player);
    }

    entity.triggerEvent("rally:start_rally");
  }

  player.sendMessage(`§aRally started! Mobs should follow for ${rally.durationTicks} seconds.`);

  system.runTimeout(() => {
    for (const entity of limited) {
      try {
        entity.triggerEvent("rally:end_rally");
      } catch {}
    }
    player.sendMessage("§cRally ended! Mobs are returning to normal.");
  }, rally.durationTicks);
}

world.afterEvents.itemUse.subscribe((event) => {
  const player = event.source;
  const item = event.itemStack;

  const rally = RALLIES.find(r => r.itemId === item.typeId);
  if (!rally) return;
  
  if (!hasRole(player, "pescador")) return;

  if (!CooldownManager.isReady(player, rally.itemId, rally.cooldownTicks)) {
    const remaining = CooldownManager.getRemainingTicks(player, rally.itemId, rally.cooldownTicks);
    const seconds = Math.ceil(remaining / 20);
    player.onScreenDisplay.setActionBar(`§cWait ${seconds}s before rallying again!`);
    return;
  }

  if (!rally.onActivate(player, rally)) {
    return; // Skip if conditions aren't met (not in water, no animals, etc.)
  }

  consumeItem(player);
  CooldownManager.set(player, rally.itemId);

  const count = Math.min(rally.maxRally, entities.length);
  player.onScreenDisplay.setActionBar(`§aReclutadas ${count} criaturas${count !== 1 ? "s" : ""}!`);
});