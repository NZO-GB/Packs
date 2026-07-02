import { world, system } from "@minecraft/server";

// ── Configuration ────────────────────────────────────────────────────────────
const DARKER_NIGHT_CHANCE = 1;       // 20% chance each day
const STALKER_ZOMBIE_ID   = "noche:stalker_zombie";
const SPAWN_INTERVAL_TICKS = 200;       // how often to attempt spawning (every 10s)
const MAX_TRACKERS_PER_PLAYER = 4;      // max tracker zombies near each player
const SPAWN_RADIUS = 24;               // blocks from player to try spawning
const SPAWN_RADIUS_MIN = 10;           // minimum distance (don't spawn on top of player)

// In-memory state (resets on world reload — acceptable for this mechanic)
let isDarkerNight = false;
let lastCheckedDay = -1;
let spawnTick = 0;

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

// ── Daily roll at midday ──────────────────────────────────────────────────────
function checkDarkerNight() {
  const { time, day } = getDayAndTime();

  // Roll once per day, around midday (6000 ± 200 ticks)
  if (day !== lastCheckedDay && time >= 6000 && time <= 6200) {
    lastCheckedDay = day;
    const roll = Math.random();
    isDarkerNight = roll < DARKER_NIGHT_CHANCE;

    if (isDarkerNight) {
      world.sendMessage("§8§lThe darkness stirs... tonight will be different.");
    } else {
      // Clear any leftover state from previous darker night
      isDarkerNight = false;
    }
  }

  // Clear at sunrise
  if (time >= 23000 && time <= 23200) {
    isDarkerNight = false;
  }
}

// ── Tracker zombie spawning ───────────────────────────────────────────────────
function trySpawnTrackers() {
  if (!isDarkerNight) return;

  const overworld = world.getDimension("overworld");

  for (const player of world.getPlayers()) {
    // Only spawn at night
    const { time } = getDayAndTime();
    if (!isNight(time)) continue;

    // Count existing tracker zombies near this player
    const nearby = overworld.getEntities({
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

    // Use the player's Y as a starting point; Bedrock will adjust to surface
    const spawnLocation = {
      x: spawnX,
      y: player.location.y,
      z: spawnZ
    };

    try {
      const block = overworld.getBlock(spawnLocation);
      if (block && overworld.getBrightness(spawnLocation) <= 7) {
        overworld.spawnEntity(STALKER_ZOMBIE_ID, spawnLocation);
      }
    } catch (e) {
      // Location may be unloaded or invalid — silently skip
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
}, 1)};
