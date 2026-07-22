import { system, CommandPermissionLevel, CustomCommandStatus } from "@minecraft/server";
import { activateDarkerNight } from "./darker_night.js";

system.beforeEvents.startup.subscribe((init) => {
    init.customCommandRegistry.registerCommand(
        {
            name: "noche:force",
            description: "Fuerza el inicio de una Noche Oscura.",
            permissionLevel: CommandPermissionLevel.Admin // Restrict to Ops/Admins
        },
        (origin) => {
            const player = origin.sourceEntity;

            if (!player || player.typeId !== "minecraft:player") {
                return { 
                    status: CustomCommandStatus.Failure, 
                    message: "Solo un jugador puede usar este comando." 
                };
            }

            // Execute on the next tick
            system.run(() => {
                activateDarkerNight();
            });

            return { status: CustomCommandStatus.Success };
        }
    );
});