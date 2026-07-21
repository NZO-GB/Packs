import { world, system } from "@minecraft/server";
import "./roles/roleManager.js";    
import { initBoundaryDamage } from "./features/boundaryDamage.js";

system.runTimeout(() => {
  initBoundaryDamage();
  world.sendMessage("§a[Roles Valoria] Sistema inicializado correctamente.");
}, 1);
