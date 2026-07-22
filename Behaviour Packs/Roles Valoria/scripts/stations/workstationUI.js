import { ActionFormData } from "@minecraft/server-ui";

export async function openWorkbench(player, station) {

    const result = await new ActionFormData()
        .title(station.title)
        .body("Recipes coming soon!")
        .button("Close")
        .show(player);

    if (result.canceled)
        return;
}