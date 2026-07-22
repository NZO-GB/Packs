import { world, system } from "@minecraft/server";
import { resetNightScores } from "./scoreboard.js";

// ── Configuration ────────────────────────────────────────────────────────────
const DARKER_NIGHT_CHANCE = 0.15;          
const STALKER_ZOMBIE_ID   = "noche:stalker_zombie";
const SPAWN_INTERVAL_TICKS = 30;
const MAX_TRACKERS_PER_PLAYER = 18;
const SPAWN_RADIUS = 40;
const SPAWN_RADIUS_MIN = 15;

const HORDE_INTERVAL_TICKS = 3200; // ~2.6 minutes between hordes

// ── State ────────────────────────────────────────────────────────────────────
let OVERWORLD = null;
let isDarkerNight = false;
let lastCheckedDay = -1;
let spawnTick = 0;
let zombiesRemaining = 0;

let hordesRemaining = 0;
let hordeTimer = 0;

// ── Time helpers ─────────────────────────────────────────────────────────────
function getDayAndTime() {
    const absoluteTime = world.getAbsoluteTime();
    return { 
        time: absoluteTime % 24000, 
        day: Math.floor(absoluteTime / 24000) 
    };
}

function isNight(time) {
    return time >= 12500 || time <= 500;
}

// ── Horde logic ──────────────────────────────────────────────────────────────
function triggerHorde() {
    const playersInOverworld = OVERWORLD.getPlayers();
    
    // Add 60 zombies per active Overworld player to the spawn pool
    zombiesRemaining += playersInOverworld.length * 40; 
    hordesRemaining--;
    hordeTimer = HORDE_INTERVAL_TICKS;

    // Play warning sound and broadcast message
    for (const player of playersInOverworld) {
        player.playSound("noche.horde_horn", { volume: 1.0, pitch: 0.8 });
    }

    world.sendMessage("§c§l¡Una horda de sombras se aproxima!");
}

// ── Night lifecycle ────────────────────────────────────────────────────────────
export function activateDarkerNight() {
    isDarkerNight = true;
    zombiesRemaining = 0;
    hordesRemaining = Math.floor(Math.random() * 3) + 1; 

    resetNightScores();

    world.sendMessage("§8§lLas sombras se remueven... Esta noche va a ser más oscura.");
    OVERWORLD.runCommand("gamerule doMobSpawning false");
    OVERWORLD.runCommand("gamerule playersSleepingPercentage 101");
}

function deactivateDarkerNight() {
    if (!isDarkerNight) return;
    isDarkerNight = false;
    zombiesRemaining = 0;
    hordesRemaining = 0;
    hordeTimer = 0;
    
    world.sendMessage("§2§lLas sombras se disipan, están a salvo...");
    OVERWORLD.runCommand("gamerule doMobSpawning true");
    OVERWORLD.runCommand("gamerule playersSleepingPercentage 100");
}

// ── Daily roll ────────────────────────────────────────────────────────────────
function checkDarkerNight() {
    const { time, day } = getDayAndTime();

    if (day !== lastCheckedDay && time >= 6000) {
        lastCheckedDay = day;
        if (Math.random() < DARKER_NIGHT_CHANCE) {
            activateDarkerNight();
        }
    }

    if (isDarkerNight && time >= 0 && time <= 100) {
        deactivateDarkerNight();
    }
}

// ── Tracker spawning ─────────────────────────────────────────────────────────
function trySpawnTrackers() {
    if (!isDarkerNight || zombiesRemaining <= 0) return;

    const { time } = getDayAndTime();
    if (!isNight(time)) return;

    // Use OVERWORLD.getPlayers() to only target players currently in the overworld
    for (const player of OVERWORLD.getPlayers()) {
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
        // Safe fallback prevents crashes in unloaded chunks or void areas
        const spawnLoc = {
            x: spawnX,
            y: topBlock ? topBlock.location.y + 1 : player.location.y,
            z: spawnZ,
        };

        if (OVERWORLD.getBlock(spawnLoc)?.getLightLevel() <= 7) {
            OVERWORLD.spawnEntity(STALKER_ZOMBIE_ID, spawnLoc);
            zombiesRemaining--;
            if (zombiesRemaining <= 0) break;
        }
    }
}

// ── Initialization & Loop ─────────────────────────────────────────────────────
export function initDarkerNight() {
    OVERWORLD = world.getDimension("overworld");

    system.runInterval(() => {
        if (!OVERWORLD) return;
        const { time } = getDayAndTime();

        checkDarkerNight();

        // Horde countdown timer
        if (isDarkerNight && hordesRemaining > 0 && isNight(time)) {
            hordeTimer--;
            if (hordeTimer <= 0) {
                triggerHorde();
            }
        }

        spawnTick++;
        if (spawnTick >= SPAWN_INTERVAL_TICKS) {
            spawnTick = 0;
            zombiesRemaining += 1;
            trySpawnTrackers();
        }
    }, 1);
}