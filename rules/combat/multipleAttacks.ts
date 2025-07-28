import type { Character, CombatResult, Monster, Weapon } from '@rules/types';
import { attackRoll } from './attackRoll';
import { SpecializationLevel } from './specialization';

// Type guard to check if entity is a Monster
function isMonster(entity: Character | Monster): entity is Monster {
  return 'hitDice' in entity;
}

// Helper function to parse hitDice string to number
function parseHitDice(hitDice: string): number {
  // Extract the numeric part before any '+' or '-'
  const match = hitDice.match(/^([\d.]+)/);
  if (match) {
    return Number.parseFloat(match[1]);
  }
  return 0; // Default if parsing fails
}

/**
 * Enum for tracking which attack in a sequence this is
 */
export enum AttackSequence {
  FIRST = 'first',
  SUBSEQUENT = 'subsequent',
  FINAL = 'final',
}

/**
 * Determines how many attacks a character gets per round
 */
export const getAttacksPerRound = (
  attacker: Character | Monster,
  weapon?: Weapon,
  againstLessThan1HD = false
): number => {
  // Monsters use their defined number of attacks
  if (!('class' in attacker)) {
    // For monsters, we'll use the number of damage entries as an indicator of attacks
    return attacker.damagePerAttack ? attacker.damagePerAttack.length : 1;
  }

  // Check if attacker is a fighter class (Fighter, Paladin, Ranger)
  const isFighterClass = ['Fighter', 'Paladin', 'Ranger'].includes(attacker.class);

  // Special case: Fighters vs. creatures with less than 1 HD
  if (isFighterClass && againstLessThan1HD) {
    return attacker.level;
  }

  // Base number of attacks based on fighter level
  let attacksPerRound = 1;

  if (isFighterClass) {
    if (attacker.level >= 13) {
      attacksPerRound = 2; // 2 attacks per round (2/1)
    } else if (attacker.level >= 7) {
      attacksPerRound = 1.5; // 3 attacks every 2 rounds (3/2)
    }
  }

  // Check for weapon specialization if a weapon is specified
  if (weapon && 'weaponSpecializations' in attacker && attacker.weaponSpecializations) {
    const specialization = attacker.weaponSpecializations.find(
      (spec) => spec.weaponName.toLowerCase() === weapon.name.toLowerCase()
    );

    if (!specialization) {
      // No specialization found, continue with base attacks per round
      return attacksPerRound;
    }

    // Handle specialized weapons
    if (specialization.level === SpecializationLevel.SPECIALIZED) {
      // Specialized weapon attack rates based on level
      if (attacker.level >= 13) return 2.5; // 5/2 attacks per round
      if (attacker.level >= 7) return 2.0; // 2/1 attacks per round
      return 1.5; // 3/2 attacks per round
    }

    // Handle double specialized weapons
    if (specialization.level === SpecializationLevel.DOUBLE_SPECIALIZED) {
      // Double specialized weapon attack rates based on level
      if (attacker.level >= 13) return 3.0; // 3/1 attacks per round
      if (attacker.level >= 7) return 2.5; // 5/2 attacks per round
      return 2.0; // 2/1 attacks per round
    }
  }

  return attacksPerRound;
};

/**
 * Calculate attack order precedence for multiple attacks
 */
export const getAttackPrecedence = (hasMultipleAttacks: boolean): number => {
  // Regular combatants go in normal initiative order
  if (!hasMultipleAttacks) return 0;

  // Fighter with multiple attacks automatically goes first unless fighting
  // an opponent who also has multiple attacks
  return -1; // Negative means "goes first"
};

/**
 * Process multiple attacks in a single combat turn
 */
export const resolveMultipleAttacks = (
  attacker: Character | Monster,
  target: Character | Monster,
  weapon?: Weapon,
  situationalModifiers = 0,
  roundState?: {
    currentRound: number;
    fractionalAttacksCarriedOver: number;
  }
): {
  results: CombatResult[];
  fractionalAttacksCarriedOver: number;
} => {
  // Use a local variable for round state
  const effectiveRoundState = roundState ?? {
    currentRound: 1,
    fractionalAttacksCarriedOver: 0,
  };

  // Determine number of attacks
  // If target is a Monster with less than 1 HD, use that info. Otherwise, default to false
  const againstLessThan1HD = isMonster(target) ? parseHitDice(target.hitDice) < 1 : false;
  const attacksThisRound = getAttacksPerRound(attacker, weapon, againstLessThan1HD);

  // Add any fractional attacks carried over from the previous round
  let totalAttacks = Math.floor(attacksThisRound);
  let fractionalPart = attacksThisRound % 1;

  // Add previous round's fractional attacks and check if we get an extra attack
  const combinedFraction = effectiveRoundState.fractionalAttacksCarriedOver + fractionalPart;
  if (combinedFraction >= 1) {
    totalAttacks += 1;
    fractionalPart = combinedFraction - 1;
  } else {
    fractionalPart = combinedFraction;
  }

  const results: CombatResult[] = [];

  // Process each attack
  for (let i = 0; i < totalAttacks; i++) {
    const attackSequence =
      totalAttacks === 1
        ? AttackSequence.FIRST
        : i === 0
          ? AttackSequence.FIRST
          : i === totalAttacks - 1
            ? AttackSequence.FINAL
            : AttackSequence.SUBSEQUENT;

    // Apply proper modifiers for each attack
    let attackModifier = situationalModifiers;

    // Apply sequence-based modifiers if needed
    if (attackSequence === AttackSequence.SUBSEQUENT) {
      // Subsequent attacks typically have penalties
      attackModifier -= 2; // -2 penalty for subsequent attacks
    } else if (attackSequence === AttackSequence.FINAL) {
      // Final attacks might have additional penalties
      attackModifier -= 5; // -5 penalty for final attack
    }

    // Execute the attack
    const result = attackRoll(attacker, target, weapon, attackModifier);

    // Add attack sequence info to the message
    if (totalAttacks > 1) {
      result.message = `Attack ${i + 1}/${totalAttacks}: ${result.message}`;
    }

    results.push(result);

    // Stop attacking if target is defeated
    if (target.hitPoints.current <= 0) {
      break;
    }
  }

  return {
    results,
    fractionalAttacksCarriedOver: fractionalPart,
  };
};
