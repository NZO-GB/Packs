import { world, system } from "@minecraft/server";

// ── Configuration ────────────────────────────────────────────────────────────
const DARKER_NIGHT_CHANCE = 1;       // 20% chance each day
const STALKER_ZOMBIE_ID   = "noche:stalker_zombie";
const SPAWN_INTERVAL_TICKS = 40;       // how often to attempt spawning (every 10s)
const MAX_TRACKERS_PER_PLAYER = 18;    // max tracker zombies near each player
const SPAWN_RADIUS = 40;               // blocks from player to try spawning
const SPAWN_RADIUS_MIN = 15;           // minimum distance (don't spawn on top of player)

// In-memory state (resets on world reload — acceptable for this mechanic)
let isDarkerNight = false;
let lastCheckedDay = -1;
let spawnTick = 0;
let zombiesRemaining = 0;

// ── Time helpers ─────────────────────────────────────────────────────────────
// Bedrock day cycle: 0-23999 ticks
// Midday  = 6000  (good time for the daily roll)
// Sunset  = 12000
// Midnight= 18000
// Sunrise = 23000

function getDayAndTime(dimension) {
  const time = world.getTimeOfDay();
  const absoluteTime = world.getAbsoluteTime();
  const day = Math.floor(absoluteTime / 24000);
  return { time, day };
}

function isNight(time) {
  // Night: after sunset (12500) until sunrise (23500)
  return time >= 12500 || time <= 500;
}

function tryClearNight() {
  world.sendMessage("tryclearnight debugging")
  if (isDarkerNight) {
    world.sendMessage("§8§lLas sombras se disipan, están a salvo...");
    OVERWORLD.runCommand("gamerule doMobSpawning true");
    OVERWORLD.runCommand("gamerule playersSleepingPercentage  100");
    isDarkerNight = false;
  } 
}

// ── Daily roll at midday ──────────────────────────────────────────────────────
function checkDarkerNight() {
  const OVERWORLD = world.getDimension("overworld");
  const { time, day } = getDayAndTime();

  // Roll once per day, around midday (6000 ± 200 ticks)
  if (day !== lastCheckedDay && time >= 6000 && time <= 6200) {
    world.sendMessage("debbuging roll")
    lastCheckedDay = day;
    const roll = Math.random();
    isDarkerNight = roll < DARKER_NIGHT_CHANCE;

    if (isDarkerNight) {
      world.sendMessage("§8§lLas sombras se remueven... Esta noche va a ser más oscura.")
      OVERWORLD.runCommand("gamerule doMobSpawning false");
      OVERWORLD.runCommand("gamerule playersSleepingPercentage  101");
      zombiesRemaining = 40;
    } else {
        tryClearNight();
    }
  }
  // Clear at sunrise
  if (time >= 24000 && time <= 24040) {
    tryClearNight();
  }
}

// ── Tracker zombie spawning ───────────────────────────────────────────────────
function trySpawnTrackers() {
  if (!isDarkerNight || zombiesRemaining <= 0) return;

  const OVERWORLD = world.getDimension("overworld");

  for (const player of world.getPlayers()) {
    // Only spawn at night
    const { time } = getDayAndTime();
    if (!isNight(time)) continue;

    // Count existing tracker zombies near this player
    const nearby = OVERWORLD.getEntities({
      type: STALKER_ZOMBIE_ID,
      location: player.location,
      maxDistance: SPAWN_RADIUS + 10
    });

    if (nearby.length >= MAX_TRACKERS_PER_PLAYER) continue;

    // Pick a random spawn point around the player
    const angle = Math.random() * Math.PI * 2;
    const dist = SPAWN_RADIUS_MIN + Math.random() * (SPAWN_RADIUS - SPAWN_RADIUS_MIN);
    const spawnX = Math.floor(player.location.x + Math.cos(angle) * dist);
    const spawnZ = Math.floor(player.location.z + Math.sin(angle) * dist);

    const top = OVERWORLD.getTopmostBlock({
    x: spawnX,
    z: spawnZ
    });

    const spawnLocation = {
      x: spawnX,
      y: top.location.y + 1,
      z: spawnZ
    };

    const block = OVERWORLD.getBlock(spawnLocation);
    if (block && OVERWORLD.getLightLevel(spawnLocation) <= 7) {
    OVERWORLD.spawnEntity(STALKER_ZOMBIE_ID, spawnLocation);
    zombiesRemaining--;
    }
  }
}

// ── Main tick loop ────────────────────────────────────────────────────────────
system.runInterval(() => {
  checkDarkerNight();

  spawnTick++;
  if (spawnTick >= SPAWN_INTERVAL_TICKS) {
    spawnTick = 0;
    trySpawnTrackers();
  }
}, 1);
