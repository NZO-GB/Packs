import { world } from "@minecraft/server";
import { WORKSTATIONS } from "./workstationRegistry.js";
import {
    construir,
    explorar,
    pescar,
    infernar,
    granjear
} from "./workstationHandlers.js";

const handlers = {
    construir,
    explorar,
    pescar,
    infernar,
    granjear
};

world.beforeEvents.playerInteractWithBlock.subscribe(event => {

    const station = WORKSTATIONS[event.block.typeId];

    if (!station)
        return;

    const player = event.player;

    if (!player.hasTag(station.requiredTag)) {

        player.sendMessage("§cYou cannot use this workstation.");
        event.cancel = true;
        return;

    }

    handlers[station.handler]?.(player);

});