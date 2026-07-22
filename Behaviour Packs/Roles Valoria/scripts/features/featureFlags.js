import { world } from "@minecraft/server";

export function isEnabled(feature) {
    try {
        const obj = world.scoreboard.getObjective("featureFlags");
        if (!obj) return false;
        const p = [...obj.getParticipants()].find(p => p.displayName === feature);
        return p ? obj.getScore(p) === 1 : false;
    } catch {
        return false;
    }
}
