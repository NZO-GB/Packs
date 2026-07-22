import "./night/commands.js";
import { system } from "@minecraft/server";
import { initScoreboard } from "./night/scoreboard.js"; 
import { initDarkerNight } from "./night/darker_night.js";

system.run(() => {
    initScoreboard();
    initDarkerNight();
});