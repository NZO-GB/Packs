// scripts/roles/roleManager.js
import { world, Player } from "@minecraft/server";

// 1. DEFINE YOUR ROLES HERE
// Add or edit roles in this list as your pack grows.
export const ROLES = {
  INFERNALISTA: "infernalista",
  EXPLORER: "explorer",
  GUARD: "guard",
  MINER: "miner"
};
const VALID_ROLES = new Set(Object.values(ROLES));
const DYNAMIC_PROP_KEY = "player_roles";
const ADMIN_TAG = "admin"; // Players need this vanilla tag to run grant/revoke commands

// ==========================================
// CORE ROLE MANAGEMENT API
// ==========================================

/**
 * Gets the array of roles assigned to a player.
 * @param {Player} player 
 * @returns {string[]} Array of active role names
 */
export function getPlayerRoles(player) {
  const rawData = player.getDynamicProperty(DYNAMIC_PROP_KEY);
  if (!rawData) return [];

  try {
    return JSON.parse(rawData);
  } catch {
    return [];
  }
}

/**
 * Checks if a player has a specific role.
 * @param {Player} player 
 * @param {string} role 
 * @returns {boolean}
 */
export function hasRole(player, role) {
  const roles = getPlayerRoles(player);
  return roles.includes(role.toLowerCase());
}

/**
 * Adds a role to a player, saves to LevelDB, and syncs vanilla tag for mob AI.
 * @param {Player} player 
 * @param {string} role 
 */
export function addRole(player, role) {
  const normalizedRole = role.toLowerCase();
  const currentRoles = getPlayerRoles(player);

    if (!isValidRole(normalizedRole)) {
    sender.sendMessage("§cRol inválido");
    return;
    }

  if (!currentRoles.includes(normalizedRole)) {
    currentRoles.push(normalizedRole);
    player.setDynamicProperty(DYNAMIC_PROP_KEY, JSON.stringify(currentRoles));
    
    // Sync with vanilla entity tag so mobs can check `has_tag: "role_infernalista"`
    player.addTag(`role_${normalizedRole}`);
  }
}

/**
 * Removes a role from a player, updates LevelDB, and removes vanilla tag.
 * @param {Player} player 
 * @param {string} role 
 */
export function removeRole(player, role) {
  const normalizedRole = role.toLowerCase();
  const currentRoles = getPlayerRoles(player);
  
  if (!currentRoles.includes(normalizedRole)) return; // no-op
  
  const updatedRoles = currentRoles.filter(r => r !== normalizedRole);
  player.setDynamicProperty(DYNAMIC_PROP_KEY, JSON.stringify(updatedRoles));
  player.removeTag(`role_${normalizedRole}`);
}

/**
 * Clears all roles from a player.
 * @param {Player} player 
 */
export function clearRoles(player) {
  const currentRoles = getPlayerRoles(player);
  for (const role of currentRoles) {
    player.removeTag(`role_${role}`);
  }
  player.setDynamicProperty(DYNAMIC_PROP_KEY, JSON.stringify([]));
}

// ==========================================
// OPTION A: ADMIN CHAT COMMAND HANDLING
// ==========================================

world.beforeEvents.chatSend.subscribe((event) => {
  const { sender, message } = event;

  // Listen only for commands starting with "!role"
  if (!message.startsWith("!role")) return;

  // Cancel the message so it doesn't display in public chat
  event.cancel = true;

  const args = message.trim().split(/\s+/);
  const action = args[1]?.toLowerCase();  // grant, revoke, list, clear
  const targetRole = args[2]?.toLowerCase();
  const targetPlayerName = args[3]; // Optional: target another player name

  // Check admin privileges (sender must have tag "admin" or be OP)
    const isAdmin = sender.hasTag(ADMIN_TAG) || (typeof sender.isOp === "function" && sender.isOp());

  // Self-service list check available to all players
  if (action === "list") {
    const roles = getPlayerRoles(sender);
    const displayList = roles.length > 0 ? roles.join(", ") : "Ninguno";
    sender.sendMessage(`§b[Roles] Tus roles actuales: §e${displayList}`);
    return;
  }

  // Deny non-admins for modifying commands
  if (!isAdmin) {
    sender.sendMessage("§c[Roles] No tienes permisos para administrar roles.");
    return;
  }

  // Find target player (defaults to the sender if no target name provided)
  let targetPlayer = sender;
  if (targetPlayerName) {
    targetPlayer = world.getAllPlayers().find(p => p.name.toLowerCase() === targetPlayerName.toLowerCase());
    if (!targetPlayer) {
      sender.sendMessage(`§c[Roles] Jugador '${targetPlayerName}' no encontrado en línea.`);
      return;
    }
  }

  switch (action) {
    case "grant": {
      if (!targetRole) {
        sender.sendMessage("§c[Roles] Uso: !role grant <nombre_rol> [jugador]");
        return;
      }
      addRole(targetPlayer, targetRole);
      sender.sendMessage(`§a[Roles] Rol '§e${targetRole}§a' otorgado a §e${targetPlayer.name}`);
      targetPlayer.sendMessage(`§a[Roles] Te han otorgado el rol: §e${targetRole}`);
      break;
    }

    case "revoke": {
      if (!targetRole) {
        sender.sendMessage("§c[Roles] Uso: !role revoke <nombre_rol> [jugador]");
        return;
      }
      removeRole(targetPlayer, targetRole);
      sender.sendMessage(`§c[Roles] Rol '§e${targetRole}§c' eliminado de §e${targetPlayer.name}`);
      targetPlayer.sendMessage(`§c[Roles] Se te ha eliminado el rol: §e${targetRole}`);
      break;
    }

    case "clear": {
      clearRoles(targetPlayer);
      sender.sendMessage(`§e[Roles] Todos los roles borrados de §e${targetPlayer.name}`);
      targetPlayer.sendMessage("§e[Roles] Se han borrado todos tus roles.");
      break;
    }

    default: {
      sender.sendMessage("§fComandos de Roles:\n" +
        "§e!role list §f- Ver tus roles actuales\n" +
        "§e!role grant <rol> [jugador] §f- Dar rol\n" +
        "§e!role revoke <rol> [jugador] §f- Quitar rol\n" +
        "§e!role clear [jugador] §f- Borrar todos los roles"
      );
      break;
    }
  }
});