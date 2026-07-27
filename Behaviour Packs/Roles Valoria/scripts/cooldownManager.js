import { system } from "@minecraft/server";

const cooldowns = new Map();

export const CooldownManager = {
  /**
   * Checks if an action is off cooldown.
   */
  isReady(player, actionId, cooldownTicks) {
    const key = `${player.id}_${actionId}`;
    const lastUsed = cooldowns.get(key) ?? 0;
    
    return (system.currentTick - lastUsed) >= cooldownTicks;
  },

  /**
   * Starts or resets the cooldown timer for an action.
   */
  set(player, actionId) {
    const key = `${player.id}_${actionId}`;
    cooldowns.set(key, system.currentTick);
  },

  /**
   * (Optional) Returns remaining ticks. Great for telling the player 
   * exactly how long they have to wait via an action bar.
   */
  getRemainingTicks(player, actionId, cooldownTicks) {
    const key = `${player.id}_${actionId}`;
    const lastUsed = cooldowns.get(key) ?? 0;
    const passed = system.currentTick - lastUsed;
    
    return Math.max(0, cooldownTicks - passed);
  }
};