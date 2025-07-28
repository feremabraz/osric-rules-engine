import type { Character, CombatResult, Monster } from '@rules/types';
import { roll } from '@rules/utils/dice';

/**
 * Grappling outcomes
 */
export enum GrapplingOutcome {
  MISS = 'miss',
  RESTRAIN = 'restrain', // Standard grapple
  PRONE = 'prone', // Overbearing attack
}

/**
 * Types of grappling attacks
 */
export enum GrapplingType {
  STANDARD = 'standard',
  OVERBEARING = 'overbearing', // At end of charge
}

/**
 * Interface for strength comparison result
 */
interface StrengthComparison {
  stronger: boolean;
  significantlyStronger: boolean;
  breakDifficulty: number; // DC to break the grapple
}

/**
 * Compare strengths between two characters or monsters
 * Used for grappling calculations and breaking free
 */
export const compareStrengths = (
  attacker: Character | Monster,
  defender: Character | Monster
): StrengthComparison => {
  // Get strength values
  let attackerStrength = 10;
  let defenderStrength = 10;

  if ('abilities' in attacker) {
    attackerStrength = attacker.abilities.strength;
  } else if ('hitDice' in attacker) {
    // For monsters, use HD as an approximation of strength
    // Convert something like "3+2" to 3.25
    const hdString = attacker.hitDice;
    const baseDice = Number.parseInt(hdString, 10);
    const bonus = hdString.includes('+') ? Number.parseInt(hdString.split('+')[1], 10) / 4 : 0;
    attackerStrength = Math.min(25, (baseDice + bonus) * 2 + 10);
  }

  if ('abilities' in defender) {
    defenderStrength = defender.abilities.strength;
  } else if ('hitDice' in defender) {
    // Same conversion for defender
    const hdString = defender.hitDice;
    const baseDice = Number.parseInt(hdString, 10);
    const bonus = hdString.includes('+') ? Number.parseInt(hdString.split('+')[1], 10) / 4 : 0;
    defenderStrength = Math.min(25, (baseDice + bonus) * 2 + 10);
  }

  // Compare strengths
  const stronger = attackerStrength > defenderStrength;
  const significantlyStronger = attackerStrength >= defenderStrength + 4;

  // Calculate difficulty to break the grapple
  // Base DC is 10, modified by strength difference
  const strengthDiff = attackerStrength - defenderStrength;
  const breakDifficulty = Math.max(5, Math.min(19, 10 + Math.floor(strengthDiff / 2)));

  return {
    stronger,
    significantlyStronger,
    breakDifficulty,
  };
};

/**
 * Attempt a grapple attack
 */
export const resolveGrapple = (
  attacker: Character | Monster,
  defender: Character | Monster,
  type: GrapplingType = GrapplingType.STANDARD,
  situationalModifiers = 0
): CombatResult => {
  // Base attack roll is d20
  const attackRoll = roll(20);

  // Calculate the THAC0-based hit
  let targetValue = attacker.thac0 - defender.armorClass;

  // Apply modifiers
  targetValue -= situationalModifiers;

  // Strength adjustments for characters
  if ('abilities' in attacker && attacker.abilityModifiers.strengthHitAdj) {
    targetValue -= attacker.abilityModifiers.strengthHitAdj;
  }

  // Determine if the attack hits
  const hit = attackRoll >= targetValue;

  if (!hit) {
    return {
      hit: false,
      damage: [],
      critical: false,
      message: `${attacker.name}'s grapple attempt missed ${defender.name}.`,
      specialEffects: null,
    };
  }

  // Determine damage (0-1 points)
  const damage = Math.max(0, roll(2) - 1);

  // Determine outcome based on grappling type
  const outcome =
    type === GrapplingType.STANDARD ? GrapplingOutcome.RESTRAIN : GrapplingOutcome.PRONE;

  // Create status effect
  const effectName = outcome === GrapplingOutcome.RESTRAIN ? 'Restrained' : 'Prone';
  const effectDuration = -1; // Until broken

  const specialEffects = [
    {
      name: effectName,
      duration: effectDuration,
      effect:
        outcome === GrapplingOutcome.RESTRAIN
          ? 'Cannot move or attack'
          : 'Prone, -4 to attack, +2 to be hit',
      savingThrow: null,
      endCondition: 'Break free with successful strength check',
    },
  ];

  // Get strength comparison for message
  const strengthComparison = compareStrengths(attacker, defender);

  let breakChanceText = '';
  if (strengthComparison.significantlyStronger) {
    breakChanceText = ' (Breaking free will be very difficult)';
  } else if (strengthComparison.stronger) {
    breakChanceText = ' (Breaking free will be difficult)';
  } else {
    breakChanceText = ' (Has a chance to break free)';
  }

  return {
    hit: true,
    damage: damage ? [damage] : [],
    critical: false,
    message: `${attacker.name} successfully ${type === GrapplingType.STANDARD ? 'grappled' : 'overbore'} ${defender.name}${damage ? ` and dealt ${damage} damage` : ''}. ${defender.name} is now ${outcome === GrapplingOutcome.RESTRAIN ? 'restrained' : 'prone'}${breakChanceText}.`,
    specialEffects,
  };
};

/**
 * Attempt to break free from a grapple
 */
export const breakFreeFromGrapple = (
  restrained: Character | Monster,
  restrainer: Character | Monster
): {
  success: boolean;
  message: string;
} => {
  // Get strength comparison
  const strengthComparison = compareStrengths(restrainer, restrained);

  // Roll to break free
  const breakRoll = roll(20);

  // Check if the roll succeeds
  const success = breakRoll >= strengthComparison.breakDifficulty;

  return {
    success,
    message: success
      ? `${restrained.name} breaks free from ${restrainer.name}'s grapple!`
      : `${restrained.name} fails to break free from ${restrainer.name}'s grapple.`,
  };
};
