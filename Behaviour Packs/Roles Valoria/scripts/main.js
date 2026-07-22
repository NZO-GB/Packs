import { world, system } from "@minecraft/server";
import "./roles/roleManager.js";    
import { initBoundaryDamage } from "./features/boundaryDamage.js";
import "./stations/workstationManager.js";

system.run(() => {
  initBoundaryDamage();
  world.sendMessage("§a[Roles Valoria] Sistema inicializado correctamente.");
});
