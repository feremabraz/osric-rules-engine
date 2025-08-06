/**
 * OSRIC Dice System - Core foundational game mechanic
 * Self-contained dice rolling utilities for the OSRIC rules engine
 * Based on OSRIC AD&D 1st Edition mechanics
 */

export interface DiceResult {
  roll: number;
  sides: number;
  modifier: number;
  result: number;
}

/**
 * Legacy DiceResult interface for backward compatibility
 * Used by the old rules system
 */
export interface LegacyDiceResult {
  rolls: number[];
  total: number;
  modifier?: number;
}

/**
 * Roll a single die with the specified number of sides
 */
function rollSingleDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

/**
 * Roll a specific number of dice with a given number of sides
 * @param count Number of dice to roll
 * @param sides Number of sides per die
 * @param modifier Modifier to add to the total
 * @returns The dice result object
 */
export function rollDice(count: number, sides: number, modifier = 0): DiceResult {
  let total = 0;

  for (let i = 0; i < count; i++) {
    total += rollSingleDie(sides);
  }

  const result = total + modifier;

  return {
    roll: count,
    sides,
    modifier,
    result,
  };
}

/**
 * Roll a dice expression using standard RPG notation (e.g., "2d6+3", "1d20-2")
 * @param notation Dice notation to roll
 * @returns The total result
 */
export function rollExpression(notation: string): number {
  // Parse dice notation like "2d6+3" or "1d20-2"
  const match = notation.match(/^(\d+)d(\d+)([+-]\d+)?$/i);

  if (!match) {
    throw new Error(`Invalid dice notation: ${notation}`);
  }

  const count = Number.parseInt(match[1], 10);
  const sides = Number.parseInt(match[2], 10);
  const modifier = match[3] ? Number.parseInt(match[3], 10) : 0;

  return rollDice(count, sides, modifier).result;
}

/**
 * Roll with advantage (roll twice, take higher)
 * Commonly used for certain OSRIC mechanics
 */
export function rollWithAdvantage(sides: number): number {
  const roll1 = rollSingleDie(sides);
  const roll2 = rollSingleDie(sides);
  return Math.max(roll1, roll2);
}

/**
 * Roll with disadvantage (roll twice, take lower)
 * Commonly used for certain OSRIC penalty mechanics
 */
export function rollWithDisadvantage(sides: number): number {
  const roll1 = rollSingleDie(sides);
  const roll2 = rollSingleDie(sides);
  return Math.min(roll1, roll2);
}

/**
 * Roll percentile dice (1d100)
 * Common in OSRIC for percentage-based checks
 */
export function rollPercentile(): number {
  return rollDice(1, 100).result;
}

/**
 * Roll ability scores using 3d6 method
 * Standard OSRIC ability score generation
 */
export function rollAbilityScore(): number {
  return rollDice(3, 6).result;
}

/**
 * Roll ability scores using 4d6 drop lowest method
 * Optional OSRIC ability score generation
 */
export function rollAbilityScore4d6DropLowest(): number {
  const rolls = [rollSingleDie(6), rollSingleDie(6), rollSingleDie(6), rollSingleDie(6)];

  // Sort descending and take top 3
  rolls.sort((a, b) => b - a);
  return rolls[0] + rolls[1] + rolls[2];
}

/**
 * Roll hit points for a character level
 * @param hitDie The character's hit die (e.g., 8 for fighters)
 * @param level Character level
 * @param constitutionModifier Constitution modifier per level
 */
export function rollHitPoints(hitDie: number, level: number, constitutionModifier: number): number {
  let totalHP = 0;

  for (let i = 0; i < level; i++) {
    const roll = rollSingleDie(hitDie);
    const modifiedRoll = Math.max(1, roll + constitutionModifier); // Minimum 1 HP per level
    totalHP += modifiedRoll;
  }

  return totalHP;
}

/**
 * THAC0 attack roll
 * @param thac0 Character's THAC0 value
 * @param targetAC Target's armor class
 * @param attackRoll The d20 roll result
 * @returns Whether the attack hits
 */
export function checkTHAC0Hit(thac0: number, targetAC: number, attackRoll: number): boolean {
  const numberNeeded = thac0 - targetAC;
  return attackRoll >= numberNeeded;
}

/**
 * Saving throw roll
 * @param saveValue Required saving throw value
 * @param modifier Any modifiers to the roll
 * @returns Whether the saving throw succeeds
 */
export function rollSavingThrow(
  saveValue: number,
  modifier = 0
): {
  success: boolean;
  roll: number;
  total: number;
  target: number;
} {
  const roll = rollDice(1, 20).result;
  const total = roll + modifier;
  const success = total >= saveValue;

  return {
    success,
    roll,
    total,
    target: saveValue,
  };
}

/**
 * Roll a d20 (most common OSRIC roll)
 */
export function rollD20(): number {
  return rollSingleDie(20);
}

// ========================================
// LEGACY COMPATIBILITY FUNCTIONS
// ========================================
// These functions provide backward compatibility with the old dice system
// while using the new implementation internally

/**
 * Legacy: Roll a single die with the specified number of sides
 * @param sides Number of sides on the die
 * @returns The result of the roll
 */
export function roll(sides: number): number {
  return rollSingleDie(sides);
}

/**
 * Legacy: Roll multiple dice and return the sum with individual rolls tracked
 * @param count Number of dice to roll
 * @param sides Number of sides per die
 * @returns LegacyDiceResult with rolls array and total
 */
export function rollMultiple(count: number, sides: number): LegacyDiceResult {
  const rolls: number[] = [];
  for (let i = 0; i < count; i++) {
    rolls.push(rollSingleDie(sides));
  }
  const total = rolls.reduce((sum, roll) => sum + roll, 0);
  return { rolls, total };
}

/**
 * Legacy: Roll dice from notation like "2d6+1", "1d20", "3d8-2"
 * @param notation Dice notation string
 * @returns LegacyDiceResult with rolls array, total, and modifier
 */
export function rollFromNotation(notation: string): LegacyDiceResult {
  const match = notation.match(/^(\d+)d(\d+)([+-]\d+)?$/i);
  if (!match) {
    throw new Error(`Invalid dice notation: ${notation}`);
  }

  const count = Number.parseInt(match[1], 10);
  const sides = Number.parseInt(match[2], 10);
  const modifier = match[3] ? Number.parseInt(match[3], 10) : 0;

  const result = rollMultiple(count, sides);
  result.total += modifier;
  result.modifier = modifier;

  return result;
}

/**
 * Legacy: Sum the results of multiple dice rolls
 * @param results Array of LegacyDiceResult objects
 * @returns Total sum of all results
 */
export function sumDice(results: LegacyDiceResult[]): number {
  return results.reduce((sum, result) => sum + result.total, 0);
}

/**
 * Legacy: Roll with advantage (roll twice, take higher) - returns LegacyDiceResult
 * @param sides Number of sides on the die
 * @returns LegacyDiceResult with both rolls and the higher total
 */
export function rollWithAdvantageLegacy(sides: number): LegacyDiceResult {
  const roll1 = rollSingleDie(sides);
  const roll2 = rollSingleDie(sides);
  const higher = Math.max(roll1, roll2);
  return {
    rolls: [roll1, roll2],
    total: higher,
  };
}

/**
 * Legacy: Roll with disadvantage (roll twice, take lower) - returns LegacyDiceResult
 * @param sides Number of sides on the die
 * @returns LegacyDiceResult with both rolls and the lower total
 */
export function rollWithDisadvantageLegacy(sides: number): LegacyDiceResult {
  const roll1 = rollSingleDie(sides);
  const roll2 = rollSingleDie(sides);
  const lower = Math.min(roll1, roll2);
  return {
    rolls: [roll1, roll2],
    total: lower,
  };
}

/**
 * Legacy: Roll ability scores using 3d6
 * @returns LegacyDiceResult with 3 rolls and total
 */
export function rollAbilityScoreLegacy(): LegacyDiceResult {
  return rollFromNotation('3d6');
}

/**
 * Legacy: Roll ability scores using 4d6, drop lowest
 * @returns LegacyDiceResult with top 3 rolls and total
 */
export function rollAbilityScoreHeroic(): LegacyDiceResult {
  const rolls = [rollSingleDie(6), rollSingleDie(6), rollSingleDie(6), rollSingleDie(6)];
  rolls.sort((a, b) => b - a); // Sort descending
  const top3 = rolls.slice(0, 3); // Take top 3
  return {
    rolls: top3,
    total: top3.reduce((sum, roll) => sum + roll, 0),
  };
}
