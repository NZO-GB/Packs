# 👑 Valoria Role Manager - User Manual

## 🛠️ Admin Setup
Before you can assign or remove roles, you must give yourself the admin tag using standard Minecraft chat:
```mcfunction
/tag @s add admin
```

## Enabling the different features

These are the commands to enable the different features:

/scoreboard objectives add featureFlags dummy
/scoreboard players set boundary featureFlags 1
/scoreboard players set netherBoundary featureFlags 1
/scoreboard players set spawnSpeedBoost featureFlags 1

## 📜 Available Roles
- `infernalista`
- `explorer`
- `guard`
- `miner`

## ⌨️ Commands
These are custom slash commands — type them directly into the Minecraft chat or put them in command blocks.

**View your own roles:** *(Available to all players)*
```mcfunction
/role:vlist
```

**Grant a role:** *(Admin only)*
```mcfunction
/role:vgrant <role> [player]
```
*Example:* `/role:vgrant miner Steve`

**Revoke a single role:** *(Admin only)*
```mcfunction
/role:vrevoke <role> [player]
```
*Example:* `/role:vrevoke guard Steve`

**Wipe all roles from a player:** *(Admin only)*
```mcfunction
/role:vclear [player]
```
*Example:* `/role:vclear Steve`

**Rebuild the in-memory role cache:** *(Admin only — use only if roles seem out of sync)*
```mcfunction
/role:vrefresh
```

> **Note:** If you leave the player name blank, the command automatically targets you.