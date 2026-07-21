# 👑 Valoria Role Manager - User Manual

## 🛠️ Admin Setup
Before you can assign or remove roles, you must give yourself the admin tag using standard Minecraft chat:
```mcfunction
/tag @s add admin
```

## 📜 Available Roles
- `infernalista`
- `explorer`
- `guard`
- `miner`

## ⌨️ Commands
Type these directly into the Minecraft chat or put them in command blocks. 

**View your own roles:** *(Available to all players)*
```mcfunction
/scriptevent valoria:role list
```

**Grant a role:**
```mcfunction
/scriptevent valoria:role grant <role> [player]
```
*Example:* `/scriptevent valoria:role grant miner Steve`

**Revoke a single role:**
```mcfunction
/scriptevent valoria:role revoke <role> [player]
```
*Example:* `/scriptevent valoria:role revoke guard Steve`

**Wipe all roles from a player:**
```mcfunction
/scriptevent valoria:role clear [player]
```
*Example:* `/scriptevent valoria:role clear Steve`

> **Note:** If you leave the player name blank, the command automatically targets you.