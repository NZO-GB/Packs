import { world, system } from "@minecraft/server";

const RALLIES = [
  {
    itemId: "rally:horn",
    tag: "role_granjero",
    cooldownTicks: 120,
    durationTicks: 640, // REMEMBER TO USE THE SAME AS TIMER IN JSON
    radius: 30,
    maxRally: 10,
    entityTypes: ["minecraft:cow", "minecraft:pig"],
    onActivate: activateRally
  },
  {
    itemId: "rally:shell",
    tag: "role_pescador",
    cooldownTicks: 120,
    durationTicks: 640, // REMEMBER TO USE THE SAME AS TIMER IN JSON
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

const cooldowns = new Map();

world.afterEvents.itemUse.subscribe((event) => {
  const player = event.source;
  const item = event.itemStack;

  const rally = RALLIES.find(r => r.itemId === item.typeId);
  if (!rally) return;
  if (!player.hasTag(rally.tag)) return;

  const now = system.currentTick;
  const cooldownKey = rally.itemId + player.name
  const lastUsed = cooldowns.get(cooldownKey) ?? 0;
  const cooldownTicks = rally.cooldownTicks;

  player.sendMessage(`time between now and used: ${now - lastUsed}`)

  if (now - lastUsed < cooldownTicks) return;

  if (!rally.onActivate(player, rally)) {
    return // here's where we skip if (case shell: not in water, case horn: no animals)
  }

  // Consume one item
  const container = player.getComponent("inventory").container;
  const slot = player.selectedSlotIndex;
  const heldItem = container.getItem(slot);

  if (heldItem && heldItem.amount > 1) {
    heldItem.amount -= 1;
    container.setItem(slot, heldItem);
  } else {
    container.setItem(slot, undefined);
  }

  cooldowns.set(cooldownKey, now);

  const count = Math.min(rally.maxRally, entities.length);
  player.onScreenDisplay.setActionBar(`§aReclutadas ${count} criaturas${count !== 1 ? "s" : ""}!`);
});