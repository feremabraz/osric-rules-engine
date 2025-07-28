import type { SwimmingParams, SwimmingResult } from '@rules/types';
import { roll } from '@rules/utils/dice';

/**
 * Difficulty modifiers for different swimming conditions
 */
const DIFFICULTY_MODIFIERS = {
  Calm: 0,
  Choppy: -2,
  Rough: -4,
  Stormy: -6,
  Treacherous: -8,
};

/**
 * Calculate swimming success and determine drowning risks
 * Implements OSRIC-like swimming mechanics
 *
 * @param params Swimming parameters including character and conditions
 * @returns A result object with success information and drowning risk assessment
 */
export const resolveSwimming = (params: SwimmingParams): SwimmingResult => {
  const {
    character,
    difficulty,
    armorWorn,
    encumbered,
    consecutiveRounds = 0,
    modifiers = {},
  } = params;

  const { strengthBonus = 0, constitutionBonus = 0 } = modifiers;

  // Base difficulty determined by swimming conditions
  const difficultyModifier = DIFFICULTY_MODIFIERS[difficulty];

  // Strength and dexterity modifiers
  const strengthMod = character.abilityModifiers.strengthOpenDoors || 0;
  const dexterityMod = character.abilityModifiers.dexterityReaction || 0;

  // Apply penalties for armor and encumbrance
  const armorPenalty = armorWorn ? -5 : 0; // Significant penalty for swimming in armor
  const encumbrancePenalty = encumbered ? -3 : 0; // Penalty for being heavily encumbered

  // Apply penalty for fatigue (consecutive rounds of swimming)
  const fatiguePenalty = Math.floor(consecutiveRounds / 5) * -1;

  // Calculate final swimming check target (higher is better)
  const swimmingCheck =
    10 +
    strengthMod +
    dexterityMod +
    difficultyModifier +
    armorPenalty +
    encumbrancePenalty +
    fatiguePenalty +
    strengthBonus;

  // Roll to determine success (higher is better)
  const swimRoll = roll(20);

  // Calculate how many more rounds the character can continue swimming
  // based on constitution and current fatigue
  const constitutionMod = character.abilityModifiers.constitutionHitPoints || 0;
  // Each constitution bonus point gives 2 additional rounds of swimming endurance
  const baseEndurance = 10 + constitutionMod * 2 + constitutionBonus;
  const roundsBeforeTiring = Math.max(0, baseEndurance - consecutiveRounds);

  // Determine if the character is at risk of drowning
  let roundsBeforeDrowning: number | null = null;
  const success = swimRoll >= swimmingCheck;
  let message = '';
  let effects: string[] | null = null;

  if (!success) {
    // Failed swimming check - at risk of drowning
    effects = ['Struggling'];

    // Constitution check to avoid immediate drowning
    const conCheck = roll(20);
    const conTarget = 10 - (character.abilityModifiers.constitutionHitPoints || 0);

    if (conCheck >= conTarget) {
      // Successful con check - gives some time before drowning
      roundsBeforeDrowning = 1 + (character.abilityModifiers.constitutionHitPoints || 0);
      message = `${character.name} is struggling to stay afloat in ${difficulty.toLowerCase()} waters. They have ${roundsBeforeDrowning} rounds before drowning.`;
    } else {
      // Failed con check - immediate drowning risk
      roundsBeforeDrowning = 1;
      effects.push('Sinking');
      message = `${character.name} is sinking in ${difficulty.toLowerCase()} waters and will drown next round without help!`;
    }
  } else {
    // Successful swimming check
    if (roundsBeforeTiring <= 2) {
      message = `${character.name} is swimming successfully in ${difficulty.toLowerCase()} waters but is becoming exhausted.`;
      effects = ['Fatigued'];
    } else {
      message = `${character.name} is swimming successfully in ${difficulty.toLowerCase()} waters.`;
    }
  }

  return {
    success,
    message,
    damage: null,
    effects,
    roundsBeforeTiring,
    roundsBeforeDrowning,
    difficulty,
  };
};

/**
 * Resolve drowning damage for a character that has failed swimming checks
 *
 * @param character The character that is drowning
 * @param roundsUnderwater Number of rounds the character has been underwater
 * @returns A result object containing the damage and status message
 */
export const resolveDrowning = (
  character: SwimmingParams['character'],
  roundsUnderwater: number
): SwimmingResult => {
  // Calculate damage based on rounds underwater
  // First round: start suffocating
  // Second round: 1d6 damage
  // Each subsequent round: previous damage × 2

  let damage: number[] | null = null;
  let message = '';
  const effects: string[] | null = ['Drowning'];

  if (roundsUnderwater <= 0) {
    return {
      success: true,
      message: `${character.name} resurfaces and is no longer at risk of drowning.`,
      damage: null,
      effects: null,
      roundsBeforeTiring: 0,
      roundsBeforeDrowning: null,
      difficulty: 'Calm', // Default value, not relevant in this context
    };
  }

  if (roundsUnderwater === 1) {
    message = `${character.name} is struggling underwater, beginning to suffocate.`;
  } else if (roundsUnderwater === 2) {
    const drowningDamage = roll(6);
    damage = [drowningDamage];
    character.hitPoints.current -= drowningDamage;
    message = `${character.name} has been underwater for 2 rounds and takes ${drowningDamage} damage from drowning.`;
  } else {
    // Increasing damage for each subsequent round
    const baseDamage = 2 ** (roundsUnderwater - 2); // Exponential damage
    const drowningDamage = Math.min(baseDamage * roll(6), 50); // Cap at 50 to prevent excessive damage
    damage = [drowningDamage];
    character.hitPoints.current -= drowningDamage;
    message = `${character.name} has been underwater for ${roundsUnderwater} rounds and takes ${drowningDamage} damage from drowning.`;
  }

  // Check if character is unconscious or dead
  if (character.hitPoints.current <= 0) {
    effects.push('Unconscious');

    if (character.hitPoints.current <= -10) {
      effects.push('Dead');
      message += ` ${character.name} has drowned and died.`;
    } else {
      message += ` ${character.name} has fallen unconscious from drowning.`;
    }
  }

  return {
    success: false,
    message,
    damage,
    effects,
    roundsBeforeTiring: 0,
    roundsBeforeDrowning: 0, // Already drowning
    difficulty: 'Calm', // Default value, not relevant in this context
  };
};
