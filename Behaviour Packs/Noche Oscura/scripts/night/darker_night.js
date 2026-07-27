import { world, system } from "@minecraft/server";
import { resetNightScores } from "./scoreboard.js";
import { trySpawnTrackers} from "./spawnTracker.js";

// ── Configuration ────────────────────────────────────────────────────────────
const DARKER_NIGHT_CHANCE = 0.15;          
const SPAWN_INTERVAL_TICKS = 30;
const HORDE_INTERVAL_TICKS = 3000;
const ZOMBIES_PER_PLAYER_PER_HORDE = 30;

// ── State ────────────────────────────────────────────────────────────────────
let overworld = null;
let isDarkerNight = false;
let lastCheckedDay = -1;
let zombiesRemaining = 0;
let hordesRemaining = 0;
let hordeTimer = 0;
let hasAnnouncedNight = false;

// ── Time helpers ─────────────────────────────────────────────────────────────
const isNight = (timeOfDay) => timeOfDay >= 12500 || timeOfDay <= 500;

// ── Horde logic ──────────────────────────────────────────────────────────────
// ── Horde logic ──────────────────────────────────────────────────────────────
function triggerHorde() {
    const playersInOverworld = overworld.getPlayers();
    if (playersInOverworld.length === 0) return;
    
    // Add 12 scattered zombies per player to the spawn pool
    zombiesRemaining += playersInOverworld.length * ZOMBIES_PER_PLAYER_PER_HORDE; 
    hordesRemaining--;
    hordeTimer = HORDE_INTERVAL_TICKS;

    // Optional: Keep sound here too if you want an audio cue during mid-night hordes
    for (const player of overworld.getPlayers()) {
        player.playSound("noche.horde_horn", { volume: 0.8, pitch: 1.0 });
    }

    world.sendMessage("§c§l¡Las sombras se agitan a tu alrededor!");
}

// ── Night lifecycle ──────────────────────────────────────────────────────────
export function activateDarkerNight() {
    isDarkerNight = true;
    zombiesRemaining = 0;
    hordesRemaining = Math.floor(Math.random() * 3) + 1; 

    resetNightScores();

    world.sendMessage("§8§lLas sombras se remueven... Esta noche va a ser más oscura.");

    overworld.runCommand("gamerule doMobSpawning false");
    overworld.runCommand("gamerule playersSleepingPercentage 101");
}

function deactivateDarkerNight() {
    if (!isDarkerNight) return;
    isDarkerNight = false;
    zombiesRemaining = 0;
    hordesRemaining = 0;
    hordeTimer = 0;
    hasAnnouncedNight = false
    
    world.sendMessage("§2§lLas sombras se disipan, están a salvo...");
    overworld.runCommand("gamerule doMobSpawning true");
    overworld.runCommand("gamerule playersSleepingPercentage 100");
}

// ── Initialization & Loop ────────────────────────────────────────────────────
export function initDarkerNight() {
    overworld = world.getDimension("overworld");

    // Run every 30 ticks instead of 1. Massive performance savings.
    system.runInterval(() => {
        if (!overworld) return;

        // Fetch time exactly once per cycle
        const absoluteTime = world.getAbsoluteTime();
        const timeOfDay = absoluteTime % 24000;
        
        // 1. Morning Deactivation (widened check window for 30-tick interval safety)
        if (isDarkerNight && timeOfDay >= 0 && timeOfDay <= 200) {
            deactivateDarkerNight();
        }

        // 2. Daily Roll Check (triggers once per day after noon)
        const currentDay = Math.floor(absoluteTime / 24000);
        if (currentDay !== lastCheckedDay && timeOfDay >= 6000) {
            lastCheckedDay = currentDay;
            if (Math.random() < DARKER_NIGHT_CHANCE) {
                activateDarkerNight();
            }
        }

        // 3. Nighttime Logic (Hordes & Spawns)
        if (isDarkerNight && isNight(timeOfDay)) {

        if (!hasAnnouncedNight) {
                hasAnnouncedNight = true;
                for (const player of overworld.getPlayers()) {
                    player.playSound("noche.horde_horn", { volume: 1.0, pitch: 0.8 });
                }
            }
            
            if (hordesRemaining > 0) {
                hordeTimer -= SPAWN_INTERVAL_TICKS; 
                if (hordeTimer <= 0) {
                    triggerHorde();
                }
            }
            trySpawnTrackers(zombiesRemaining, overworld);
        }
    }, SPAWN_INTERVAL_TICKS); 
}