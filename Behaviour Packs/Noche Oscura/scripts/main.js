import { system } from "@minecraft/server";
import { initScoreboard } from "./scoreboard.js"; 
import { initDarkerNight } from "./darker_night.js";

system.run(() => {
    initScoreboard();
    initDarkerNight();
});