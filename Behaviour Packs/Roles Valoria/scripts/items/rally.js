import { world, system } from "@minecraft/server";

function activateRallyHorn(player, entities, rally) {
  const limited = entities.slice(0, rally.maxRally);
  
  for (const entity of limited) {
    const tameable = entity.getComponent("minecraft:tameable");

    if (tameable && !tameable.tamedToPlayerId) {
      tameable.tame(player);
    }

    entity.triggerEvent("rally:start_rally");
  }

  player.sendMessage(`§aRally started! Mobs should follow for ${rally.durationSeconds} seconds.`);

  system.runTimeout(() => {
    for (const entity of limited) {
      try {
        entity.triggerEvent("rally:end_rally");
      } catch {}
    }
    player.sendMessage("§cRally ended! Mobs are returning to normal.");
  }, rally.durationTicks);
}

const RALLIES = [
  {
    itemId: "rally:horn",
    tag: "role_granjero",
    cooldownSeconds: 5,
    durationTicks: 600,
    radius: 30,
    maxRally: 10,
    entityTypes: ["minecraft:cow", "minecraft:pig"],
    onActivate: activateRallyHorn
  }
];

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
  const cooldownTicks = rally.cooldownSeconds * 20;

  if (now - lastUsed < cooldownTicks) return;

  const entities = rally.entityTypes.flatMap(type =>
    player.dimension.getEntities({ location: player.location, maxDistance: rally.radius, type })
  );

  console.warn("nearby entities: " + entities.length);

  rally.onActivate(player, entities, rally)

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
  player.onScreenDisplay.setActionBar(`§aRallied ${count} creature${count !== 1 ? "s" : ""}!`);
});