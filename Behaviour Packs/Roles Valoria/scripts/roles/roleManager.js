import {
  world,
  system,
  Player,
  CommandPermissionLevel,
  CustomCommandParamType,
  CustomCommandStatus
} from "@minecraft/server";

// ----- DATA -----
const ROLES = {
  INFERNALISTA: "infernalista",
  EXPLORADOR: "explorador",
  CONSTRUCTOR: "constructor",
  PESCADOR: "pescador",
  GRANJERO: "granjero"
};
const VALID_ROLES = new Set(Object.values(ROLES));
const DYNAMIC_PROP_KEY = "player_roles";
const ADMIN_TAG = "admin";

const roleCache = new Map();

function loadRoleCacheFor(player) {
  const set = new Set(getPlayerRoles(player));
  roleCache.set(player.id, set);
  return set;
}

export function cachedHasRole(player, role) {
  const set = roleCache.get(player.id) ?? loadRoleCacheFor(player);
  return set.has(role.toLowerCase());
}

export function refreshRoleCache() {
  for (const player of world.getAllPlayers()) {
    loadRoleCacheFor(player);
  }
}

world.afterEvents.playerSpawn.subscribe((event) => {
  if (event.initialSpawn) loadRoleCacheFor(event.player);
});

world.afterEvents.playerLeave.subscribe((event) => {
  roleCache.delete(event.playerId);
});

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
    player.addTag("role_" + normalized);
  }
  loadRoleCacheFor(player);
  return { success: true };
}

export function removeRole(player, role) {
  const normalized = role.toLowerCase();
  const current = getPlayerRoles(player);
  if (!current.includes(normalized)) return { success: false, error: "No tiene ese rol" };

  const updated = current.filter(r => r !== normalized);
  player.setDynamicProperty(DYNAMIC_PROP_KEY, JSON.stringify(updated));
  player.removeTag("role_" + normalized);
  loadRoleCacheFor(player);
  return { success: true };
}

export function clearRoles(player) {
  const current = getPlayerRoles(player);
  for (const r of current) player.removeTag("role_" + r);
  player.setDynamicProperty(DYNAMIC_PROP_KEY, JSON.stringify([]));
  loadRoleCacheFor(player);
  return { success: true };
}

function isAdmin(player) {
  if (!player) return false;
  return player.hasTag(ADMIN_TAG) || player.commandPermissionLevel >= CommandPermissionLevel.GameDirectors;
}

function resolveTarget(sender, players) {
  return players && players.length > 0 ? players[0] : sender;
}

function getCommandPlayer(origin) {
  return origin.sourceEntity instanceof Player ? origin.sourceEntity : undefined;
}

// ----- SLASH COMMANDS -----
function registerRoleCommands(registry) {
  registry.registerEnum("role:role_name", Array.from(VALID_ROLES));

  registry.registerCommand(
    {
      name: "role:vlist",
      description: "Lista tus roles actuales.",
      permissionLevel: CommandPermissionLevel.Any
    },
    (origin) => {
      const player = getCommandPlayer(origin);
      if (!player) {
        return { status: CustomCommandStatus.Failure, message: "Solo un jugador puede usar esto." };
      }
      const roles = getPlayerRoles(player);
      system.run(() => {
        player.sendMessage("§b[Roles] Tus roles: §e" + (roles.join(", ") || "Ninguno"));
      });
      return { status: CustomCommandStatus.Success };
    }
  );

  registry.registerCommand(
    {
      name: "role:vgrant",
      description: "Otorga un rol a un jugador.",
      permissionLevel: CommandPermissionLevel.Any,
      mandatoryParameters: [
        { type: CustomCommandParamType.Enum, name: "role:role_name" }
      ],
      optionalParameters: [
        { type: CustomCommandParamType.PlayerSelector, name: "player" }
      ]
    },
    (origin, roleName, players) => {
      const sender = getCommandPlayer(origin);
      if (!isAdmin(sender)) {
        return { status: CustomCommandStatus.Failure, message: "Sin permisos." };
      }
      const target = resolveTarget(sender, players);
      if (!target) {
        return { status: CustomCommandStatus.Failure, message: "Jugador objetivo no encontrado." };
      }
      system.run(() => {
        const result = addRole(target, roleName);
        if (!result.success) { sender.sendMessage("§c" + result.error); return; }
        sender.sendMessage("§aRol '§e" + roleName + "§a' → §e" + target.name);
        target.sendMessage("§aTe dieron el rol: §e" + roleName);
      });
      return { status: CustomCommandStatus.Success };
    }
  );

  registry.registerCommand(
    {
      name: "role:vrevoke",
      description: "Quita un rol a un jugador.",
      permissionLevel: CommandPermissionLevel.Any,
      mandatoryParameters: [
        { type: CustomCommandParamType.Enum, name: "role:role_name" }
      ],
      optionalParameters: [
        { type: CustomCommandParamType.PlayerSelector, name: "player" }
      ]
    },
    (origin, roleName, players) => {
      const sender = getCommandPlayer(origin);
      if (!isAdmin(sender)) {
        return { status: CustomCommandStatus.Failure, message: "Sin permisos." };
      }
      const target = resolveTarget(sender, players);
      if (!target) {
        return { status: CustomCommandStatus.Failure, message: "Jugador objetivo no encontrado." };
      }
      system.run(() => {
        const result = removeRole(target, roleName);
        if (!result.success) { sender.sendMessage("§c" + result.error); return; }
        sender.sendMessage("§cRol '§e" + roleName + "§c' quitado a §e" + target.name);
        target.sendMessage("§cTe quitaron el rol: §e" + roleName);
      });
      return { status: CustomCommandStatus.Success };
    }
  );

  registry.registerCommand(
    {
      name: "role:vclear",
      description: "Borra todos los roles de un jugador.",
      permissionLevel: CommandPermissionLevel.Any,
      optionalParameters: [
        { type: CustomCommandParamType.PlayerSelector, name: "player" }
      ]
    },
    (origin, players) => {
      const sender = getCommandPlayer(origin);
      if (!isAdmin(sender)) {
        return { status: CustomCommandStatus.Failure, message: "Sin permisos." };
      }
      const target = resolveTarget(sender, players);
      if (!target) {
        return { status: CustomCommandStatus.Failure, message: "Jugador objetivo no encontrado." };
      }
      system.run(() => {
        clearRoles(target);
        sender.sendMessage("§eRoles borrados de §e" + target.name);
        target.sendMessage("§eSe borraron todos tus roles.");
      });
      return { status: CustomCommandStatus.Success };
    }
  );

  registry.registerCommand(
    {
      name: "role:vrefresh",
      description: "Reconstruye la caché de roles en memoria desde los datos guardados.",
      permissionLevel: CommandPermissionLevel.Any
    },
    (origin) => {
      const sender = getCommandPlayer(origin);
      if (!isAdmin(sender)) {
        return { status: CustomCommandStatus.Failure, message: "Sin permisos." };
      }
      refreshRoleCache();
      system.run(() => {
        sender?.sendMessage("§aCaché de roles reconstruida.");
      });
      return { status: CustomCommandStatus.Success };
    }
  );
}

system.beforeEvents.startup.subscribe((init) => {
  registerRoleCommands(init.customCommandRegistry);
});
