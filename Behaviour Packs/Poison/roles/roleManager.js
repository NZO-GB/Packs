import { Player } from "@minecraft/server";

// Saves an array of roles to a player
export function setPlayerRoles(player, roles) {
    const rolesString = JSON.stringify(roles);
    player.setDynamicProperty("player_roles", rolesString);
}

// Retrieves the array of roles for a player
export function getPlayerRoles(player) {
    const data = player.getDynamicProperty("player_roles");
    if (!data) return []; // Return empty array if they have no roles yet
    
    try {
        return JSON.parse(data);
    } catch (e) {
        return [];
    }
}

// Quick helper to check if a player has a specific role
export function hasRole(player, role) {
    const roles = getPlayerRoles(player);
    return roles.includes(role);
}