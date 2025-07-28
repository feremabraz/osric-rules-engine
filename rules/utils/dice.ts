/**
 * Dice rolling utilities for the OSRIC rules engine
 */

export interface DiceResult {
  rolls: number[];
  total: number;
  modifier?: number;
}

/**
 * Roll a single die with the specified number of sides
 */
export function roll(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

/**
 * Roll multiple dice and return the sum
 */
export function rollMultiple(count: number, sides: number): DiceResult {
  const rolls: number[] = [];
  for (let i = 0; i < count; i++) {
    rolls.push(roll(sides));
  }
  const total = rolls.reduce((sum, roll) => sum + roll, 0);
  return { rolls, total };
}

/**
 * Roll dice from notation like "2d6+1", "1d20", "3d8-2"
 */
export function rollFromNotation(notation: string): DiceResult {
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
 * Sum the results of multiple dice rolls
 */
export function sumDice(results: DiceResult[]): number {
  return results.reduce((sum, result) => sum + result.total, 0);
}

/**
 * Roll with advantage (roll twice, take higher)
 */
export function rollWithAdvantage(sides: number): DiceResult {
  const roll1 = roll(sides);
  const roll2 = roll(sides);
  const higher = Math.max(roll1, roll2);
  return {
    rolls: [roll1, roll2],
    total: higher,
  };
}

/**
 * Roll with disadvantage (roll twice, take lower)
 */
export function rollWithDisadvantage(sides: number): DiceResult {
  const roll1 = roll(sides);
  const roll2 = roll(sides);
  const lower = Math.min(roll1, roll2);
  return {
    rolls: [roll1, roll2],
    total: lower,
  };
}

/**
 * Roll a percentile (d100)
 */
export function rollPercentile(): number {
  return roll(100);
}

/**
 * Roll ability scores using 3d6
 */
export function rollAbilityScore(): DiceResult {
  return rollFromNotation('3d6');
}

/**
 * Roll ability scores using 4d6, drop lowest
 */
export function rollAbilityScoreHeroic(): DiceResult {
  const rolls = [roll(6), roll(6), roll(6), roll(6)];
  rolls.sort((a, b) => b - a); // Sort descending
  const top3 = rolls.slice(0, 3); // Take top 3
  return {
    rolls: top3,
    total: top3.reduce((sum, roll) => sum + roll, 0),
  };
}
