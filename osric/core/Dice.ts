export interface DiceResult {
  roll: number;
  sides: number;
  modifier: number;
  result: number;
}

export interface LegacyDiceResult {
  rolls: number[];
  total: number;
  modifier?: number;
}

function rollSingleDie(sides: number): number {
  return Math.floor(Math.random() * sides) + 1;
}

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

export function rollExpression(notation: string): number {
  const match = notation.match(/^(\d+)d(\d+)([+-]\d+)?$/i);

  if (!match) {
    throw new Error(`Invalid dice notation: ${notation}`);
  }

  const count = Number.parseInt(match[1], 10);
  const sides = Number.parseInt(match[2], 10);
  const modifier = match[3] ? Number.parseInt(match[3], 10) : 0;

  return rollDice(count, sides, modifier).result;
}

export function rollWithAdvantage(sides: number): number {
  const roll1 = rollSingleDie(sides);
  const roll2 = rollSingleDie(sides);
  return Math.max(roll1, roll2);
}

export function rollWithDisadvantage(sides: number): number {
  const roll1 = rollSingleDie(sides);
  const roll2 = rollSingleDie(sides);
  return Math.min(roll1, roll2);
}

export function rollPercentile(): number {
  return rollDice(1, 100).result;
}

export function rollAbilityScore(): number {
  return rollDice(3, 6).result;
}

export function rollAbilityScore4d6DropLowest(): number {
  const rolls = [rollSingleDie(6), rollSingleDie(6), rollSingleDie(6), rollSingleDie(6)];

  rolls.sort((a, b) => b - a);
  return rolls[0] + rolls[1] + rolls[2];
}

export function rollHitPoints(hitDie: number, level: number, constitutionModifier: number): number {
  let totalHP = 0;

  for (let i = 0; i < level; i++) {
    const roll = rollSingleDie(hitDie);
    const modifiedRoll = Math.max(1, roll + constitutionModifier);
    totalHP += modifiedRoll;
  }

  return totalHP;
}

export function checkTHAC0Hit(thac0: number, targetAC: number, attackRoll: number): boolean {
  const numberNeeded = thac0 - targetAC;
  return attackRoll >= numberNeeded;
}

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

export function rollD20(): number {
  return rollSingleDie(20);
}

export function roll(sides: number): number {
  return rollSingleDie(sides);
}

export function rollMultiple(count: number, sides: number): LegacyDiceResult {
  const rolls: number[] = [];
  for (let i = 0; i < count; i++) {
    rolls.push(rollSingleDie(sides));
  }
  const total = rolls.reduce((sum, roll) => sum + roll, 0);
  return { rolls, total };
}

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

export function sumDice(results: LegacyDiceResult[]): number {
  return results.reduce((sum, result) => sum + result.total, 0);
}

export function rollWithAdvantageLegacy(sides: number): LegacyDiceResult {
  const roll1 = rollSingleDie(sides);
  const roll2 = rollSingleDie(sides);
  const higher = Math.max(roll1, roll2);
  return {
    rolls: [roll1, roll2],
    total: higher,
  };
}

export function rollWithDisadvantageLegacy(sides: number): LegacyDiceResult {
  const roll1 = rollSingleDie(sides);
  const roll2 = rollSingleDie(sides);
  const lower = Math.min(roll1, roll2);
  return {
    rolls: [roll1, roll2],
    total: lower,
  };
}

export function rollAbilityScoreLegacy(): LegacyDiceResult {
  return rollFromNotation('3d6');
}

export function rollAbilityScoreHeroic(): LegacyDiceResult {
  const rolls = [rollSingleDie(6), rollSingleDie(6), rollSingleDie(6), rollSingleDie(6)];
  rolls.sort((a, b) => b - a);
  const top3 = rolls.slice(0, 3);
  return {
    rolls: top3,
    total: top3.reduce((sum, roll) => sum + roll, 0),
  };
}
