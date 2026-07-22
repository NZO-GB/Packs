import { 
    world, 
    system, 
    CommandPermissionLevel, 
    CustomCommandStatus 
} from "@minecraft/server";

const STALKER_ZOMBIE_ID = "noche:stalker_zombie";
const nightScores = new Map();

export function initScoreboard() {
    world.afterEvents.entityDie.subscribe((event) => {
        const { deadEntity, damageSource } = event;

        if (deadEntity.typeId !== STALKER_ZOMBIE_ID) return;

        const killer = damageSource.damagingEntity;
        
        if (killer && killer.typeId === "minecraft:player") {
            const killerName = killer.name;
            const currentNightKills = nightScores.has(killerName) ? nightScores.get(killerName).nightKills : 0;
            
            const totalKills = (killer.getDynamicProperty("total_stalker_kills") || 0) + 1;
            killer.setDynamicProperty("total_stalker_kills", totalKills);

            nightScores.set(killerName, {
                nightKills: currentNightKills + 1,
                totalKills: totalKills
            });
        }
    });
}

function sendPlayerStats(player) {
    const playerName = player.name;
    const nightKills = nightScores.has(playerName) ? nightScores.get(playerName).nightKills : 0;
    const totalKills = player.getDynamicProperty("total_stalker_kills") || 0;

    player.sendMessage("§8§l--- [ Tus Stalkers Eliminados ] ---");
    player.sendMessage(`§eEsta noche: §c${nightKills}`);
    player.sendMessage(`§eTotal histórico: §4${totalKills}`);
    player.sendMessage("§8§l-----------------------------------------");
}

export function resetNightScores() {
    nightScores.clear();
}

// ----- SLASH COMMANDS -----
system.beforeEvents.startup.subscribe((init) => {
    init.customCommandRegistry.registerCommand(
        {
            name: "noche:stats",
            description: "Muestra tu registro de bajas de stalkers.",
            permissionLevel: CommandPermissionLevel.Any 
        },
        (origin) => {

            const player = origin.sourceEntity; 
            
            if (!player || player.typeId !== "minecraft:player") {
                return { status: CustomCommandStatus.Failure, message: "Solo un jugador puede usar esto." };
            }
            
            system.run(() => {
                sendPlayerStats(player);
            });
            
            return { status: CustomCommandStatus.Success };
        }
    );
});