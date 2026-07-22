import { world, system } from "@minecraft/server";
import { isEnabled } from "./featureFlags.js";

const CHECK_INTERVAL = 40;          // how often to recompute, in ticks
const BLOCKS_PER_LEVEL = 1500;       // +1 amplifier per this many blocks from spawn
const MAX_AMPLIFIER = 3;            // cap so it doesn't scale forever
const DEAD_ZONE = 1000;              // no boost within this radius of spawn
const EFFECT_DURATION = CHECK_INTERVAL + 20; // outlives the gap between checks

export function initSpeedBoost() {
    system.runInterval(() => {

        const spawn = world.getDefaultSpawnLocation();

        for (const player of world.getAllPlayers()) {
            if (player.dimension.id !== "minecraft:overworld") continue;

            const { x, z } = player.location;
            const dx = x - spawn.x;
            const dz = z - spawn.z;
            const distance = Math.sqrt(dx * dx + dz * dz);

            if (distance < DEAD_ZONE) continue;

            const amplifier = Math.min(
                MAX_AMPLIFIER,
                Math.floor((distance - DEAD_ZONE) / BLOCKS_PER_LEVEL)
            );
            if (amplifier < 0) continue;

            console.warn(`spawnSpeedBoost: ${player.name} dist=${distance.toFixed(0)} amp=${amplifier}`);

             const riding = player.getComponent("riding");
            const target = riding?.entityRidingOn ?? player;

            target.addEffect("minecraft:speed", EFFECT_DURATION, {
                amplifier,
                showParticles: false
            });
        }
    }, CHECK_INTERVAL);
}