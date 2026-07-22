import { ItemStack } from "@minecraft/server";

export function countItem(container, typeId) {
    let total = 0;
    for (let i = 0; i < container.size; i++) {
        const slot = container.getItem(i);
        if (slot && slot.typeId === typeId) {
            total += slot.amount;
        }
    }
    return total;
}

export function hasItems(container, requirements) {
    return requirements.every(req => countItem(container, req.typeId) >= req.amount);
}

function removeItems(container, requirements) {
    for (const req of requirements) {
        let remaining = req.amount;
        for (let i = 0; i < container.size && remaining > 0; i++) {
            const slot = container.getItem(i);
            if (!slot || slot.typeId !== req.typeId) continue;

            if (slot.amount <= remaining) {
                remaining -= slot.amount;
                container.setItem(i, undefined);
            } else {
                slot.amount -= remaining;
                container.setItem(i, slot);
                remaining = 0;
            }
        }
    }
}

// Attempts to craft a recipe for the given player. Returns
// { success: true } or { success: false, error: "..." }.
export function tryCraft(player, recipe) {
    const inventory = player.getComponent("minecraft:inventory");
    const container = inventory?.container;
    if (!container) {
        return { success: false, error: "No se pudo acceder al inventario." };
    }

    if (!hasItems(container, recipe.inputs)) {
        return { success: false, error: "No tienes suficientes materiales." };
    }

    removeItems(container, recipe.inputs);

    const result = new ItemStack(recipe.output.typeId, recipe.output.amount ?? 1);
    const leftover = container.addItem(result);
    if (leftover) {
        // Inventory was full for the output stack — drop it at the
        // player's feet instead of silently deleting it.
        player.dimension.spawnItem(leftover, player.location);
    }

    return { success: true };
}

// "minecraft:iron_ingot" -> "Iron Ingot" (used for menu labels).
// Prefer recipe.displayName / req.displayName if you set one explicitly.
export function friendlyName(typeId) {
    const short = typeId.includes(":") ? typeId.split(":")[1] : typeId;
    return short
        .split("_")
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
}
