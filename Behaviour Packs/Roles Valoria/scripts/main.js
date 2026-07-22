import { world, system } from "@minecraft/server";
import "./roles/roleManager.js";
import "./features/eatingBoost.js";
import "./features/waterRegen.js";
import { initBoundaryDamage } from "./features/boundaryDamage.js";
import { initSpeedBoost } from "./features/spawnSpeedBoost.js";
import "./stations/workstationManager.js";

system.run(() => {
  initBoundaryDamage();
  initSpeedBoost();
  world.sendMessage("§a[Roles Valoria] Sistema inicializado correctamente.");
});
