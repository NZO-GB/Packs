import { world, system } from "@minecraft/server";

// 1. Function to activate the effect (Call this when the item is used)
export function activateDrillEffect(player, seconds) {
    // 20 ticks = 1 second in Minecraft
    const durationTicks = seconds * 20; 
    const expiryTick = system.currentTick + durationTicks;
    
    // Store the expiration tick directly on the player
    player.setDynamicProperty("drillEffectExpiry", expiryTick);
    player.sendMessage(`§aDrill effect activated for ${seconds} seconds!`);
}

// 2. Listen for blocks being broken
world.afterEvents.playerBreakBlock.subscribe((event) => {
    const { player, block, dimension } = event;

    // Check if the player has the effect property
    const expiryTick = player.getDynamicProperty("drillEffectExpiry");
    
    // If they don't have it, or the current time has passed the expiry time, do nothing
    if (!expiryTick || system.currentTick > expiryTick) {
        return; 
    }

    // 3. Determine the mining direction based on where the player is looking
    const viewDir = player.getViewDirection();
    let dx = 0, dy = 0, dz = 0;

    // Find the dominant axis the player is looking at (X, Y, or Z)
    const absX = Math.abs(viewDir.x);
    const absY = Math.abs(viewDir.y);
    const absZ = Math.abs(viewDir.z);

    if (absX > absY && absX > absZ) {
        dx = Math.sign(viewDir.x); // Looking along the X axis
    } else if (absY > absX && absY > absZ) {
        dy = Math.sign(viewDir.y); // Looking up or down (Y axis)
    } else {
        dz = Math.sign(viewDir.z); // Looking along the Z axis
    }

    // 4. Break the next 2 blocks in that direction
    for (let i = 1; i <= 2; i++) {
        const targetX = block.x + (dx * i);
        const targetY = block.y + (dy * i);
        const targetZ = block.z + (dz * i);

        const targetBlock = dimension.getBlock({ x: targetX, y: targetY, z: targetZ });

        // Make sure the block is valid, not already air, and not unbreakable like bedrock
        if (targetBlock && !targetBlock.isAir && targetBlock.typeId !== "minecraft:bedrock") {
            // Using the 'destroy' command is the easiest way to break the block AND drop its loot naturally
            dimension.runCommandAsync(`setblock ${targetX} ${targetY} ${targetZ} air destroy`);
        }
    }
});