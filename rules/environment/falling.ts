import type { FallingDamageParams, FallingDamageResult } from '@rules/types';
import { rollFromNotation } from '@rules/utils/dice';

/**
 * Calculate falling damage based on OSRIC rules, converted to metric
 * In OSRIC, falling damage is typically 1d6 per 10 feet (≈3 meters) fallen
 *
 * @param params The falling damage parameters
 * @returns A result object containing success, message, and damage information
 */
export const calculateFallingDamage = (params: FallingDamageParams): FallingDamageResult => {
  const { distance, character, modifiers = {} } = params;
  const { damageFactor = 1 } = modifiers;

  // In OSRIC, falling damage is typically 1d6 per 10 feet (≈3 meters) fallen
  const damagePerDie = 6;
  const distancePerDie = 3; // meters (converted from 10 feet)

  // Calculate number of dice to roll (rounded down as per OSRIC)
  const diceRolled = Math.floor(distance / distancePerDie);

  // No damage for falls less than 3 meters
  if (diceRolled <= 0) {
    return {
      success: true,
      message: `${character.name} falls ${distance} meters, but takes no damage.`,
      damage: null,
      effects: null,
      distance,
      damagePerDie,
      diceRolled,
    };
  }

  // Generate dice notation string (e.g., "3d6" for 9 meter fall)
  const diceNotation = `${diceRolled}d${damagePerDie}`;

  // Roll the damage dice
  const damageRolls = rollFromNotation(diceNotation);

  // Apply damage factor (for magical effects that might reduce damage)
  const finalDamage = Math.floor(damageRolls.total * damageFactor);

  // Apply damage to character
  character.hitPoints.current -= finalDamage;

  // Determine if the character is unconscious or dead
  let effects: string[] | null = null;
  let message = '';

  if (character.hitPoints.current <= 0) {
    effects = ['Unconscious'];

    // In OSRIC, a character dies at -10 HP
    if (character.hitPoints.current <= -10) {
      effects.push('Dead');
      message = `${character.name} falls ${distance} meters, taking ${finalDamage} damage and dies from the impact.`;
    } else {
      message = `${character.name} falls ${distance} meters, taking ${finalDamage} damage and falls unconscious.`;
    }
  } else {
    // Character is still conscious
    message = `${character.name} falls ${distance} meters, taking ${finalDamage} damage.`;

    // Check for broken bones or other injuries for severe falls
    if (diceRolled >= 3) {
      // Falls of 9+ meters might cause additional injuries
      const injuryCheck = rollFromNotation('1d20').total;
      const constitutionBonus = character.abilityModifiers.constitutionHitPoints || 0;
      const injuryThreshold = 10 - constitutionBonus; // Higher constitution means less chance of injury

      if (injuryCheck <= injuryThreshold) {
        if (!effects) effects = [];
        effects.push('Broken Bone');
        message += ` ${character.name} also suffers a broken bone from the fall.`;
      }
    }
  }

  return {
    success: true,
    message,
    damage: [finalDamage],
    effects,
    distance,
    damagePerDie,
    diceRolled,
  };
};
