import { world, system } from "@minecraft/server";

const STALKER_ZOMBIE_ID   = "noche:stalker_zombie";
const MAX_TRACKERS_PER_PLAYER = 18;
const SPAWN_RADIUS = 40;
const SPAWN_RADIUS_MIN = 15;

export function trySpawnTrackers(zombiesRemaining, overworld) {
    if (zombiesRemaining <= 0) return;

    const players = overworld.getPlayers();
    if (players.length === 0) return;

    // ─────────────────────────────────────────────────────────────────
    // 1. CHUNK-BASED CACHING (Spatial Partitioning)
    // ─────────────────────────────────────────────────────────────────
    const zombieGrid = new Map();
    const allStalkers = overworld.getEntities({ type: STALKER_ZOMBIE_ID });

    // Group every existing zombie into a grid based on their chunk coordinates
    for (const zombie of allStalkers) {
        const loc = zombie.location;
        // Divide by 16 to get chunk coordinates
        const chunkX = Math.floor(loc.x / 16);
        const chunkZ = Math.floor(loc.z / 16);
        const chunkKey = `${chunkX},${chunkZ}`;

        if (!zombieGrid.has(chunkKey)) {
            zombieGrid.set(chunkKey, []);
        }
        zombieGrid.get(chunkKey).push(loc);
    }

    // Determine how many chunks outwards we need to check
    // Radius 50 (40 + 10) divided by 16 blocks per chunk = ~3.125 (round up to 4)
    const MAX_SEARCH_DIST = SPAWN_RADIUS + 10;
    const maxDistSq = MAX_SEARCH_DIST ** 2;
    const chunkSearchRadius = Math.ceil(MAX_SEARCH_DIST / 16); 

    // ─────────────────────────────────────────────────────────────────
    // 2. SCANNING NEIGHBORING CHUNKS
    // ─────────────────────────────────────────────────────────────────
    const playerStats = [];

    for (const player of players) {
        const pLoc = player.location;
        const pChunkX = Math.floor(pLoc.x / 16);
        const pChunkZ = Math.floor(pLoc.z / 16);
        let nearbyCount = 0;

        // ONLY check the chunks directly surrounding the player
        for (let dx = -chunkSearchRadius; dx <= chunkSearchRadius; dx++) {
            for (let dz = -chunkSearchRadius; dz <= chunkSearchRadius; dz++) {
                const searchKey = `${pChunkX + dx},${pChunkZ + dz}`;
                const zombiesInChunk = zombieGrid.get(searchKey);

                if (zombiesInChunk) {
                    // Check exact distance only for zombies inside these nearby chunks
                    for (const zLoc of zombiesInChunk) {
                        const diffX = zLoc.x - pLoc.x;
                        const diffY = zLoc.y - pLoc.y;
                        const diffZ = zLoc.z - pLoc.z;
                        if ((diffX * diffX + diffY * diffY + diffZ * diffZ) <= maxDistSq) {
                            nearbyCount++;
                        }
                    }
                }
            }
        }
        
        // Save the data for the sorting phase
        playerStats.push({ player, pLoc, nearbyCount });
    }

    // ─────────────────────────────────────────────────────────────────
    // 3. PRIORITY SORTING (Density-based Target Sorting)
    // ─────────────────────────────────────────────────────────────────
    // Sort players from least zombies nearby to most zombies nearby.
    // This ensures players who are alone or out of combat get spawns first.
    playerStats.sort((a, b) => a.nearbyCount - b.nearbyCount);

    // ─────────────────────────────────────────────────────────────────
    // 4. SPAWN EXECUTION
    // ─────────────────────────────────────────────────────────────────
    for (const stats of playerStats) {
        if (zombiesRemaining <= 0) break;
        if (stats.nearbyCount >= MAX_TRACKERS_PER_PLAYER) continue;

        // Math remains the same for the actual spawn calculation
        const angle = Math.random() * Math.PI * 2;
        const dist = SPAWN_RADIUS_MIN + Math.random() * (SPAWN_RADIUS - SPAWN_RADIUS_MIN);
        const spawnX = stats.pLoc.x + Math.cos(angle) * dist;
        const spawnZ = stats.pLoc.z + Math.sin(angle) * dist;

        const topBlock = overworld.getTopmostBlock({ x: spawnX, z: spawnZ });
        const spawnLoc = {
            x: spawnX,
            y: topBlock ? topBlock.location.y + 1 : stats.pLoc.y,
            z: spawnZ,
        };

        const block = overworld.getBlock(spawnLoc);
        if (block?.getLightLevel() <= 7) {
            overworld.spawnEntity(STALKER_ZOMBIE_ID, spawnLoc);
            zombiesRemaining--;
            
            // If we successfully spawn a zombie, increment their count 
            // so we don't accidentally overload them if the loop continues
            stats.nearbyCount++; 
        }
    }
}