import { world, system } from "@minecraft/server";

import { WORKSTATIONS } from "./workstationRegistry.js";
import { openWorkbench } from "./workstationUI.js";
import { hasRole } from "../roles/roleManager.js";

const DEBOUNCE_TICKS = 10; // ~0.5s
const lastInteraction = new Map();

world.beforeEvents.playerInteractWithBlock.subscribe((event) => {

    const station = WORKSTATIONS[event.block.typeId];

    if (!station)
        return;

    event.cancel = true;

    const player = event.player;
    const now = system.currentTick;
    const last = lastInteraction.get(player.id) ?? -Infinity;

    if (now - last < DEBOUNCE_TICKS)
        return;

    lastInteraction.set(player.id, now);

    system.run(() => {
        if (!hasRole(player, station.requiredTag)) {
            player.sendMessage(
                `§cSólo un ${station.requiredTag} puede usar esta mesa de trabajo.`
            );
            return;
        }
        openWorkbench(player, station);
    });

});