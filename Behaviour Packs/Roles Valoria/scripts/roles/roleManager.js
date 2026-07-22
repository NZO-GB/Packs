import { world, system } from "@minecraft/server";

// ----- DATA -----
const ROLES = {
  INFERNALISTA: "infernalista",
  EXPLORER: "explorer",
  GUARD: "guard",
  MINER: "miner"
};
const VALID_ROLES = new Set(Object.values(ROLES));
const DYNAMIC_PROP_KEY = "player_roles";
const ADMIN_TAG = "admin";

// ----- FUNCTIONS -----
function isValidRole(role) {
  return VALID_ROLES.has(role);
}

export function getPlayerRoles(player) {
  const raw = player.getDynamicProperty(DYNAMIC_PROP_KEY);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

export function hasRole(player, role) {
  return getPlayerRoles(player).includes(role.toLowerCase());
}

export function addRole(player, role) {
  const normalized = role.toLowerCase();
  if (!isValidRole(normalized)) return { success: false, error: "Rol inválido" };

  const current = getPlayerRoles(player);
  if (!current.includes(normalized)) {
    current.push(normalized);
    player.setDynamicProperty(DYNAMIC_PROP_KEY, JSON.stringify(current));
    player.addTag(normalized);
  }
  return { success: true };
}

export function removeRole(player, role) {
  const normalized = role.toLowerCase();
  const current = getPlayerRoles(player);
  if (!current.includes(normalized)) return { success: false, error: "No tiene ese rol" };

  const updated = current.filter(r => r !== normalized);
  player.setDynamicProperty(DYNAMIC_PROP_KEY, JSON.stringify(updated));
  player.removeTag(normalized);
  return { success: true };
}

export function clearRoles(player) {
  const current = getPlayerRoles(player);
  for (const r of current) player.removeTag(r);
  player.setDynamicProperty(DYNAMIC_PROP_KEY, JSON.stringify([]));
  return { success: true };
}

// ----- SCRIPT EVENT COMMANDS (Stable) -----
system.afterEvents.scriptEventReceive.subscribe((event) => {
  // 1. Only respond to our specific command ID
  if (event.id !== "valoria:role") return;

  // 2. Make sure the entity running the command is a player
  const sender = event.sourceEntity;
  if (!sender || sender.typeId !== "minecraft:player") return;

  // 3. Parse the message (e.g., "grant miner Steve" -> ["grant", "miner", "Steve"])
  const args = event.message.trim().split(/\s+/);
  const action = args[0]?.toLowerCase();
  const targetRole = args[1]?.toLowerCase();
  const targetName = args[2];

  // Relying entirely on tags is safer in stable builds than checking isOp()
  const isAdmin = sender.hasTag(ADMIN_TAG); 

  if (action === "list") {
    const roles = getPlayerRoles(sender);
    sender.sendMessage("§b[Roles] Tus roles: §e" + (roles.join(", ") || "Ninguno"));
    return;
  }

  if (!isAdmin) {
    sender.sendMessage("§c[Roles] Sin permisos.");
    return;
  }

  let target = sender;
  if (targetName) {
    target = world.getAllPlayers().find(p => p.name.toLowerCase() === targetName.toLowerCase());
    if (!target) {
      sender.sendMessage("§cJugador '" + targetName + "' no encontrado.");
      return;
    }
  }

  switch (action) {
    case "grant": {
      if (!targetRole) { sender.sendMessage("§cUso: /scriptevent valoria:role grant <rol> [jugador]"); return; }
      const r = addRole(target, targetRole);
      if (!r.success) { sender.sendMessage("§c" + r.error); return; }
      sender.sendMessage("§aRol '§e" + targetRole + "§a' → §e" + target.name);
      target.sendMessage("§aTe dieron el rol: §e" + targetRole);
      break;
    }
    case "revoke": {
      if (!targetRole) { sender.sendMessage("§cUso: /scriptevent valoria:role revoke <rol> [jugador]"); return; }
      const r = removeRole(target, targetRole);
      if (!r.success) { sender.sendMessage("§c" + r.error); return; }
      sender.sendMessage("§cRol '§e" + targetRole + "§c' quitado a §e" + target.name);
      target.sendMessage("§cTe quitaron el rol: §e" + targetRole);
      break;
    }
    case "clear": {
      clearRoles(target);
      sender.sendMessage("§eRoles borrados de §e" + target.name);
      target.sendMessage("§eSe borraron todos tus roles.");
      break;
    }
    default:
      sender.sendMessage(
        "§fComandos:\n" +
        "§e/scriptevent valoria:role list\n" +
        "§e/scriptevent valoria:role grant <rol> [jugador]\n" +
        "§e/scriptevent valoria:role revoke <rol> [jugador]\n" +
        "§e/scriptevent valoria:role clear [jugador]"
      );
  }
});