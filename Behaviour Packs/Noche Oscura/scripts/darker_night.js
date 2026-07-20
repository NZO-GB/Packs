import { world, system } from "@minecraft/server";

// ── Configuration ────────────────────────────────────────────────────────────
const DARKER_NIGHT_CHANCE = 1;          
const STALKER_ZOMBIE_ID   = "noche:stalker_zombie";
const SPAWN_INTERVAL_TICKS = 40;
const MAX_TRACKERS_PER_PLAYER = 18;
const SPAWN_RADIUS = 40;
const SPAWN_RADIUS_MIN = 15;

// ── State ────────────────────────────────────────────────────────────────────
let OVERWORLD = null;
let isDarkerNight = false;
let lastCheckedDay = -1;
let spawnTick = 0;
let zombiesRemaining = 0;

// ── Time helpers ─────────────────────────────────────────────────────────────
function getDayAndTime() {
    const absoluteTime = world.getAbsoluteTime();
    const day = Math.floor(absoluteTime / 24000);
    const time = absoluteTime % 24000;
    return { time, day };
}

function isNight(time) {
    return time >= 12500 || time <= 500;
}

// ── Night lifecycle ────────────────────────────────────────────────────────────
function activateDarkerNight() {
    isDarkerNight = true;
    zombiesRemaining = world.getPlayers().length * 40;
    world.sendMessage("§8§lLas sombras se remueven... Esta noche va a ser más oscura.");
    OVERWORLD.runCommand("gamerule doMobSpawning false");
    OVERWORLD.runCommand("gamerule playersSleepingPercentage 101");
}

function deactivateDarkerNight() {
    if (!isDarkerNight) return;
    isDarkerNight = false;
    zombiesRemaining = 0;
    world.sendMessage("§8§lLas sombras se disipan, están a salvo...");
    OVERWORLD.runCommand("gamerule doMobSpawning true");
    OVERWORLD.runCommand("gamerule playersSleepingPercentage 100");
}

// ── Daily roll ────────────────────────────────────────────────────────────────
function checkDarkerNight() {
    const { time, day } = getDayAndTime();

    // Roll once per day at midday (6000–6200)
    if (day !== lastCheckedDay && time >= 6000 && time <= 6200) {
        lastCheckedDay = day;
        if (Math.random() < DARKER_NIGHT_CHANCE) {
            activateDarkerNight();
        } 
    }

    if (isDarkerNight && time >= 0 && time <= 40) {
        deactivateDarkerNight();
    }
}

// ── Tracker spawning ─────────────────────────────────────────────────────────
function trySpawnTrackers() {
    if (!isDarkerNight || zombiesRemaining <= 0) return;

    const { time } = getDayAndTime();
    if (!isNight(time)) return;

    for (const player of world.getPlayers()) {
        const nearby = OVERWORLD.getEntities({
            type: STALKER_ZOMBIE_ID,
            location: player.location,
            maxDistance: SPAWN_RADIUS + 10,
        });

        if (nearby.length >= MAX_TRACKERS_PER_PLAYER) continue;

        const angle = Math.random() * Math.PI * 2;
        const dist = SPAWN_RADIUS_MIN + Math.random() * (SPAWN_RADIUS - SPAWN_RADIUS_MIN);
        const spawnX = player.location.x + Math.cos(angle) * dist;
        const spawnZ = player.location.z + Math.sin(angle) * dist;

        const topBlock = OVERWORLD.getTopmostBlock({ x: spawnX, z: spawnZ });
        const spawnLoc = {
            x: spawnX,
            y: topBlock.location.y + 1,
            z: spawnZ,
        };

        if (OVERWORLD.getBlock(spawnLoc)?.getLightLevel() <= 7) {
            OVERWORLD.spawnEntity(STALKER_ZOMBIE_ID, spawnLoc);
            zombiesRemaining--;
            if (zombiesRemaining <= 0) break;
        }
    }
}

// ── Initialization ─────────────────────────────────────────────────────────────
system.run(() => {
    OVERWORLD = world.getDimension("overworld");
});

// ── Main tick loop ────────────────────────────────────────────────────────────
system.runInterval(() => {
    if (!OVERWORLD) return;

    checkDarkerNight();

    spawnTick++;
    if (spawnTick >= SPAWN_INTERVAL_TICKS) {
        spawnTick = 0;
        trySpawnTrackers();
    }
}, 1);