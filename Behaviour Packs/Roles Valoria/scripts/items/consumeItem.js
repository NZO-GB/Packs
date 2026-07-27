export function consumeItem(player, slot = player.selectedSlotIndex) {
  const container = player.getComponent("minecraft:inventory")?.container;
  if (!container || slot === undefined) return;

  const item = container.getItem(slot);
  if (!item) return;

  if (item.amount > 1) {
    item.amount -= 1;
    container.setItem(slot, item);
  } else {
    container.setItem(slot, undefined);
  }
}