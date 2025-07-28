import { roll } from '@rules/utils/dice';
import type { Character, Monster } from '../types';
import type {
  MoraleCheckParams,
  MoraleCheckResult,
  MoraleOutcome,
  ReactionModifier,
} from './types';

/**
 * OSRIC-based morale system
 * Base morale is 50% + 5% per hit dice/level of the creature
 */

/**
 * Calculate the base morale for a creature based on hit dice or level
 */
export function calculateBaseMorale(hitDiceOrLevel: number): number {
  // Base morale is 50% + 5% per hit die/level
  return 50 + hitDiceOrLevel * 5;
}

/**
 * Common morale modifiers for different combat situations
 */
export const MORALE_MODIFIERS: Record<string, number> = {
  // Positive modifiers
  LEADER_PRESENT: 10,
  WINNING_BATTLE: 15,
  SUPERIOR_NUMBERS: 10,
  DEFENDING_HOME: 20,
  RETREAT_BLOCKED: 15,
  SACRED_QUEST: 25,

  // Negative modifiers
  LEADER_KILLED: -20,
  HALF_GROUP_KILLED: -20,
  SURPRISED: -10,
  FIGHTING_STRONGER_ENEMY: -15,
  AMBUSHED: -10,
  NO_ESCAPE_ROUTE: -5,
  ALLY_SURRENDERED: -15,
  OUTNUMBERED: -5,
  VASTLY_OUTNUMBERED: -15,
  POWERFUL_MAGIC_USED: -15,
};

/**
 * Special modifiers based on alignment and creature type
 */
export function getIntrinsicMoraleModifier(entity: Character | Monster): ReactionModifier {
  // Certain alignments have naturally higher or lower morale
  if (entity.alignment.includes('Lawful')) {
    return { value: 5, source: 'Lawful Alignment' };
  }

  if (entity.alignment.includes('Chaotic')) {
    return { value: -5, source: 'Chaotic Alignment' };
  }

  // For monsters, we can check their base stats
  if ('hitDice' in entity) {
    const isUndead =
      entity.specialAbilities?.some((ability) => ability.includes('Undead')) || false;
    const isFearless =
      entity.specialAbilities?.some((ability) => ability.includes('Fearless')) || false;

    if (isUndead || isFearless) {
      return { value: 999, source: 'Fearless Creature' }; // Effectively never fails morale
    }

    // Cowardly creatures
    const isCowardly =
      entity.specialAbilities?.some((ability) => ability.includes('Cowardly')) || false;
    if (isCowardly) {
      return { value: -20, source: 'Cowardly Nature' };
    }
  }

  return { value: 0, source: 'Base Temperament' };
}

/**
 * Check group morale by analyzing allies and their status
 */
export function getGroupMoraleModifier(allies: (Character | Monster)[] = []): ReactionModifier {
  if (allies.length === 0) return { value: 0, source: 'No Allies' };

  const totalAllies = allies.length;
  const injuredAllies = allies.filter((ally) => {
    const currentHpPercent = (ally.hitPoints.current / ally.hitPoints.maximum) * 100;
    return currentHpPercent <= 50;
  }).length;

  // If more than half the group is injured
  if (injuredAllies > totalAllies / 2) {
    return { value: -15, source: 'Many Injured Allies' };
  }

  // If most of the group is still healthy
  if (injuredAllies < totalAllies / 4) {
    return { value: 5, source: 'Few Injured Allies' };
  }

  return { value: 0, source: 'Group Status' };
}

/**
 * Assess the battle situation based on the relative strength of enemies
 */
export function getBattleSituationModifier(
  _entity: Character | Monster,
  allies: (Character | Monster)[] = [],
  enemies: (Character | Monster)[] = []
): ReactionModifier {
  if (enemies.length === 0) return { value: 0, source: 'No Visible Enemies' };

  const ourStrength = allies.length + 1; // +1 for the entity itself
  const enemyStrength = enemies.length;

  // Simple outnumbering check
  if (ourStrength > enemyStrength * 2) {
    return { value: 15, source: 'Vastly Outnumber Enemies' };
  }

  if (ourStrength > enemyStrength) {
    return { value: 5, source: 'Outnumber Enemies' };
  }

  if (enemyStrength > ourStrength * 2) {
    return { value: -15, source: 'Vastly Outnumbered' };
  }

  if (enemyStrength > ourStrength) {
    return { value: -5, source: 'Outnumbered' };
  }

  // Enemy health assessment
  const injuredEnemies = enemies.filter((enemy) => {
    const currentHpPercent = (enemy.hitPoints.current / enemy.hitPoints.maximum) * 100;
    return currentHpPercent <= 50;
  }).length;

  if (injuredEnemies > enemies.length / 2) {
    return { value: 10, source: 'Enemies Weakened' };
  }

  return { value: 0, source: 'Battle Situation' };
}

/**
 * Perform a morale check to determine if an NPC/monster will continue fighting
 */
export function performMoraleCheck(params: MoraleCheckParams): MoraleCheckResult {
  const {
    character,
    hitDiceOrLevel,
    modifiers = [],
    allies = [],
    enemies = [],
    context = 'Combat',
  } = params;

  // Determine the base morale value
  let baseValue: number;

  if ('morale' in character && typeof character.morale === 'number') {
    // Use the monster's predefined morale value if available
    baseValue = character.morale;
  } else {
    // Otherwise calculate based on hit dice or level
    const effectiveLevel = hitDiceOrLevel || character.level || 1;
    baseValue = calculateBaseMorale(effectiveLevel);
  }

  // Create a list of all modifiers to apply
  const allModifiers: ReactionModifier[] = [
    ...modifiers,
    getIntrinsicMoraleModifier(character),
    getGroupMoraleModifier(allies),
    getBattleSituationModifier(character, allies, enemies),
  ];

  // Add context-specific modifiers
  if (context) {
    const contextModifier = getContextModifier(context);
    if (contextModifier.value !== 0) {
      allModifiers.push(contextModifier);
    }
  }

  // Calculate the total modifier value
  const totalModifier = allModifiers.reduce((sum, mod) => sum + mod.value, 0);

  // Calculate final morale value capped between 5 and 95
  const finalValue = Math.max(5, Math.min(95, baseValue + totalModifier));

  // Roll percentile dice (d100)
  const diceRoll = roll(100);

  // Check if passed morale
  const passed = diceRoll <= finalValue;

  // Determine the outcome based on how much the check failed by
  let outcome: MoraleOutcome = 'StandGround';
  let description = 'Continues fighting at full capacity.';

  if (!passed) {
    const failMargin = diceRoll - finalValue;

    if (failMargin > 50) {
      outcome = 'Surrender';
      description = 'Surrenders immediately, throwing down weapons.';
    } else if (failMargin > 25) {
      outcome = 'Flee';
      description = 'Flees in panic, abandoning allies.';
    } else {
      outcome = 'FightingWithdrawal';
      description = 'Makes a fighting withdrawal, looking for a way to escape.';
    }
  }

  return {
    roll: diceRoll,
    baseValue,
    modifiers: allModifiers,
    finalValue,
    passed,
    outcome,
    description,
  };
}

/**
 * Get modifier based on specific context
 */
function getContextModifier(context: string): ReactionModifier {
  // Check for specific contexts defined in MORALE_MODIFIERS
  for (const [key, value] of Object.entries(MORALE_MODIFIERS)) {
    // Convert key to a more user-friendly format for comparison
    const normalizedKey = key.replace('_', ' ').toLowerCase();

    if (context.toLowerCase().includes(normalizedKey)) {
      return { value, source: normalizedKey.charAt(0).toUpperCase() + normalizedKey.slice(1) };
    }
  }

  return { value: 0, source: 'Context' };
}

/**
 * Generate a narrative description of a morale check
 */
export function narrateMoraleCheck(result: MoraleCheckResult, entityName: string): string {
  const { description, modifiers } = result;

  let narrative = `${entityName} ${result.passed ? 'maintains' : 'loses'} morale`;

  if (!result.passed) {
    narrative += ` and ${description.toLowerCase()}`;
  }

  // Add context about significant modifiers if present
  const significantMods = modifiers.filter((mod) => Math.abs(mod.value) >= 10);

  if (significantMods.length > 0) {
    narrative += ' Significant factors:';

    for (const mod of significantMods) {
      if (mod.value > 0) {
        narrative += ` ${mod.source} (+${mod.value}%),`;
      } else {
        narrative += ` ${mod.source} (${mod.value}%),`;
      }
    }

    // Remove the trailing comma
    narrative = narrative.replace(/,$/, '.');
  }

  return narrative;
}
