import { ActionFormData, MessageFormData } from "@minecraft/server-ui";
import { hasItems, tryCraft, friendlyName } from "./inventoryUtils.js";

function formatRequirements(recipe) {
    return recipe.inputs
        .map(req => `${req.amount}x ${req.displayName ?? friendlyName(req.typeId)}`)
        .join(", ");
}

export async function openWorkbench(player, station) {

    const inventory = player.getComponent("minecraft:inventory");
    const container = inventory?.container;

    const form = new ActionFormData()
        .title(station.title)
        .body("Elige una receta para craftear:");

    for (const recipe of station.recipes) {
        const affordable = container ? hasItems(container, recipe.inputs) : false;
        const label =
            (affordable ? "§a" : "§c") +
            friendlyName(recipe.output.typeId) +
            `\n§7${formatRequirements(recipe)}`;
        form.button(label);
    }

    const result = await form.show(player);

    if (result.canceled || result.selection === undefined)
        return;

    const recipe = station.recipes[result.selection];
    if (!recipe)
        return;

    const craftResult = tryCraft(player, recipe);

    const message = new MessageFormData()
        .title(station.title)
        .button1("Cerrar")
        .button2("Seguir craftando");

    if (craftResult.success) {
        message.body(`§aCrafteaste: ${friendlyName(recipe.output.typeId)} x${recipe.output.amount ?? 1}`);
    } else {
        message.body(`§c${craftResult.error}`);
    }

    const followUp = await message.show(player);

    // button2 ("Seguir craftando") reopens the menu; button1 or closing ends it.
    if (!followUp.canceled && followUp.selection === 1) {
        await openWorkbench(player, station);
    }
}
