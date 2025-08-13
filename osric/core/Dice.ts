/**
 * Unified Dice Engine for the OSRIC Rules Engine
 * Replaces all fragmented dice implementations with a single, consistent system
 */

export interface DiceRoll {
  readonly notation: string; // "1d20+5"
  readonly rolls: number[]; // Individual die results [15]
  readonly modifier: number; // Flat modifier: 5
  readonly total: number; // Final result: 20
  readonly breakdown: string; // "15 + 5 = 20"
}

export interface MockDiceConfig {
  enabled: boolean;
  forcedResults?: number[];
  resultIndex?: number;
}

// Internal state for dice mocking
let mockConfig: MockDiceConfig = { enabled: false };

/**
 * Parse dice notation into components
 */
function parseNotation(notation: string): { count: number; sides: number; modifier: number } {
  const match = notation.match(/^(\d+)?d(\d+)([+-]\d+)?$/i);

  if (!match) {
    throw new Error(`Invalid dice notation: ${notation}`);
  }

  const count = match[1] ? Number.parseInt(match[1], 10) : 1;
  const sides = Number.parseInt(match[2], 10);
  const modifier = match[3] ? Number.parseInt(match[3], 10) : 0;

  if (count < 1 || sides < 1) {
    throw new Error(`Invalid dice parameters in notation: ${notation}`);
  }

  return { count, sides, modifier };
}

/**
 * Roll a single die, handling mocking for tests
 */
function rollSingleDie(sides: number): number {
  if (mockConfig.enabled && mockConfig.forcedResults) {
    const result = mockConfig.forcedResults[mockConfig.resultIndex || 0];
    mockConfig.resultIndex = ((mockConfig.resultIndex || 0) + 1) % mockConfig.forcedResults.length;
    return result;
  }

  return Math.floor(Math.random() * sides) + 1;
}

/**
 * Create a human-readable breakdown of the roll
 */
function createBreakdown(rolls: number[], modifier: number, total: number): string {
  if (rolls.length === 1 && modifier === 0) {
    return total.toString();
  }

  const rollsStr = rolls.join(' + ');

  if (modifier === 0) {
    return `${rollsStr} = ${total}`;
  }

  const modifierStr = modifier >= 0 ? `+ ${modifier}` : `- ${Math.abs(modifier)}`;
  return `${rollsStr} ${modifierStr} = ${total}`;
}

/**
 * Unified Dice Engine that handles all random number generation in the system
 */
export namespace DiceEngine {
  /**
   * Configure dice mocking for testing purposes
   */
  export function configureMocking(config: MockDiceConfig): void {
    mockConfig = { ...config, resultIndex: 0 };
  }

  /**
   * Roll dice using standard notation (e.g., "1d20+5", "3d6", "2d8-1")
   */
  export function roll(notation: string): DiceRoll {
    const parsed = parseNotation(notation);
    const rolls: number[] = [];

    for (let i = 0; i < parsed.count; i++) {
      rolls.push(rollSingleDie(parsed.sides));
    }

    const rollSum = rolls.reduce((sum, roll) => sum + roll, 0);
    const total = rollSum + parsed.modifier;
    const breakdown = createBreakdown(rolls, parsed.modifier, total);

    return {
      notation,
      rolls,
      modifier: parsed.modifier,
      total,
      breakdown,
    };
  }

  /**
   * Roll multiple dice of the same type
   */
  export function rollMultiple(notation: string, count: number): DiceRoll[] {
    const results: DiceRoll[] = [];
    for (let i = 0; i < count; i++) {
      results.push(roll(notation));
    }
    return results;
  }

  /**
   * Roll with advantage (take the higher of two rolls)
   */
  export function rollWithAdvantage(notation: string): DiceRoll {
    const roll1 = roll(notation);
    const roll2 = roll(notation);
    return roll1.total >= roll2.total ? roll1 : roll2;
  }

  /**
   * Roll with disadvantage (take the lower of two rolls)
   */
  export function rollWithDisadvantage(notation: string): DiceRoll {
    const roll1 = roll(notation);
    const roll2 = roll(notation);
    return roll1.total <= roll2.total ? roll1 : roll2;
  }

  /**
   * Standard OSRIC ability score generation methods
   */
  export function rollAbilityScore(): DiceRoll {
    return roll('3d6');
  }

  export function rollAbilityScoreHeroic(): DiceRoll {
    const rolls = [rollSingleDie(6), rollSingleDie(6), rollSingleDie(6), rollSingleDie(6)];
    rolls.sort((a, b) => b - a);
    const top3 = rolls.slice(0, 3);
    const total = top3.reduce((sum, roll) => sum + roll, 0);

    return {
      notation: '4d6 drop lowest',
      rolls: top3,
      modifier: 0,
      total,
      breakdown: `${top3.join(' + ')} = ${total}`,
    };
  }

  /**
   * Standard combat rolls
   */
  export function rollD20(): DiceRoll {
    return roll('1d20');
  }

  export function rollPercentile(): DiceRoll {
    return roll('1d100');
  }

  /**
   * Hit point calculation for OSRIC characters
   */
  export function rollHitPoints(
    hitDie: number,
    level: number,
    constitutionModifier: number
  ): DiceRoll {
    const rolls: number[] = [];
    let totalHP = 0;

    for (let i = 0; i < level; i++) {
      const roll = rollSingleDie(hitDie);
      const modifiedRoll = Math.max(1, roll + constitutionModifier);
      rolls.push(roll);
      totalHP += modifiedRoll;
    }

    return {
      notation: `${level}d${hitDie}+${constitutionModifier * level} (min 1 per die)`,
      rolls,
      modifier: constitutionModifier * level,
      total: totalHP,
      breakdown: `${rolls.join(' + ')} + ${constitutionModifier * level} = ${totalHP} (min 1 per die)`,
    };
  }

  /**
   * OSRIC saving throw roll
   */
  export function rollSavingThrow(
    saveValue: number,
    modifier = 0
  ): {
    kind: 'success' | 'failure';
    roll: DiceRoll;
    target: number;
  } {
    const rollResult = roll(`1d20+${modifier}`);
    const succeeded = rollResult.total >= saveValue;

    return {
      kind: succeeded ? 'success' : 'failure',
      roll: rollResult,
      target: saveValue,
    };
  }

  /**
   * THAC0 attack roll
   */
  export function rollAttack(
    thac0: number,
    targetAC: number,
    modifier = 0
  ): {
    hit: boolean;
    roll: DiceRoll;
    numberNeeded: number;
  } {
    const rollResult = roll(`1d20+${modifier}`);
    const numberNeeded = thac0 - targetAC;
    const hit = rollResult.total >= numberNeeded;

    return {
      hit,
      roll: rollResult,
      numberNeeded,
    };
  }
}

/**
 * Legacy compatibility functions - these wrap the new DiceEngine
 * These should be gradually replaced with direct DiceEngine calls
 */

// Deprecated wrapper functions removed; use DiceEngine directly
