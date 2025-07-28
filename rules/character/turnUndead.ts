import type { Monster } from '@rules/types';
import { roll } from '@rules/utils/dice';
import type { TurnUndeadFunction, TurnUndeadResult } from './advancedClassTypes';
import { UndeadTypes } from './advancedClassTypes';
import type { UndeadType } from './advancedClassTypes';

// Turn Undead table data (Cleric level × Undead Type)
// Values: Number = roll needed, "T" = auto Turn, "D" = auto Destroy, "-" = no effect possible
export const TURN_UNDEAD_TABLE: Record<number, Record<UndeadType, number | 'T' | 'D' | '-'>> = {
  1: {
    Skeleton: 10,
    Zombie: 13,
    Ghoul: 16,
    Shadow: 19,
    Wight: 20,
    Ghast: '-',
    Wraith: '-',
    Mummy: '-',
    Spectre: '-',
    Vampire: '-',
    Ghost: '-',
    Lich: '-',
    Fiend: '-',
  },
  2: {
    Skeleton: 7,
    Zombie: 10,
    Ghoul: 13,
    Shadow: 16,
    Wight: 19,
    Ghast: 20,
    Wraith: '-',
    Mummy: '-',
    Spectre: '-',
    Vampire: '-',
    Ghost: '-',
    Lich: '-',
    Fiend: '-',
  },
  3: {
    Skeleton: 4,
    Zombie: 7,
    Ghoul: 10,
    Shadow: 13,
    Wight: 16,
    Ghast: 19,
    Wraith: 20,
    Mummy: '-',
    Spectre: '-',
    Vampire: '-',
    Ghost: '-',
    Lich: '-',
    Fiend: '-',
  },
  4: {
    Skeleton: 'T',
    Zombie: 'T',
    Ghoul: 4,
    Shadow: 7,
    Wight: 10,
    Ghast: 13,
    Wraith: 16,
    Mummy: 19,
    Spectre: 20,
    Vampire: '-',
    Ghost: '-',
    Lich: '-',
    Fiend: '-',
  },
  5: {
    Skeleton: 'T',
    Zombie: 'T',
    Ghoul: 'T',
    Shadow: 4,
    Wight: 7,
    Ghast: 10,
    Wraith: 13,
    Mummy: 16,
    Spectre: 19,
    Vampire: 20,
    Ghost: '-',
    Lich: '-',
    Fiend: '-',
  },
  6: {
    Skeleton: 'D',
    Zombie: 'D',
    Ghoul: 'T',
    Shadow: 'T',
    Wight: 4,
    Ghast: 7,
    Wraith: 10,
    Mummy: 13,
    Spectre: 16,
    Vampire: 19,
    Ghost: 20,
    Lich: '-',
    Fiend: '-',
  },
  7: {
    Skeleton: 'D',
    Zombie: 'D',
    Ghoul: 'D',
    Shadow: 'T',
    Wight: 'T',
    Ghast: 4,
    Wraith: 7,
    Mummy: 10,
    Spectre: 13,
    Vampire: 16,
    Ghost: 19,
    Lich: 20,
    Fiend: '-',
  },
  8: {
    Skeleton: 'D',
    Zombie: 'D',
    Ghoul: 'D',
    Shadow: 'D',
    Wight: 'T',
    Ghast: 'T',
    Wraith: 4,
    Mummy: 7,
    Spectre: 10,
    Vampire: 13,
    Ghost: 16,
    Lich: 19,
    Fiend: 20,
  },
  9: {
    Skeleton: 'D',
    Zombie: 'D',
    Ghoul: 'D',
    Shadow: 'D',
    Wight: 'D',
    Ghast: 'T',
    Wraith: 'T',
    Mummy: 4,
    Spectre: 7,
    Vampire: 10,
    Ghost: 13,
    Lich: 16,
    Fiend: 19,
  },
  // For clerics level 14-18
  14: {
    Skeleton: 'D',
    Zombie: 'D',
    Ghoul: 'D',
    Shadow: 'D',
    Wight: 'D',
    Ghast: 'D',
    Wraith: 'T',
    Mummy: 'T',
    Spectre: 'T',
    Vampire: 7,
    Ghost: 10,
    Lich: 13,
    Fiend: 16,
  },
  // For clerics level 19+
  19: {
    Skeleton: 'D',
    Zombie: 'D',
    Ghoul: 'D',
    Shadow: 'D',
    Wight: 'D',
    Ghast: 'D',
    Wraith: 'D',
    Mummy: 'D',
    Spectre: 'T',
    Vampire: 4,
    Ghost: 7,
    Lich: 10,
    Fiend: 13,
  },
};

/**
 * Get the appropriate table row for a cleric level
 */
export const getClericTurnLevel = (level: number): number => {
  if (level <= 8) return level;
  if (level <= 13) return 9;
  if (level <= 18) return 14;
  return 19;
};

/**
 * Determine which undead type a monster belongs to
 */
export const classifyUndead = (monster: Monster): UndeadType | null => {
  // This is a simplified implementation - in a full game you'd
  // have more robust monster typing

  // Check monster name for undead type
  const name = monster.name.toLowerCase();

  for (const undeadType of UndeadTypes) {
    if (name.includes(undeadType.toLowerCase())) {
      return undeadType as UndeadType;
    }
  }

  // Check special abilities or other properties
  if (
    monster.specialAbilities?.some(
      (ability) =>
        ability.toLowerCase().includes('undead') ||
        ability.toLowerCase().includes('energy drain') ||
        ability.toLowerCase().includes('level drain')
    )
  ) {
    // Classify by hit dice for generic undead
    const hd = Number.parseFloat(monster.hitDice.replace('+', '.'));

    if (hd <= 1) return 'Skeleton';
    if (hd <= 2) return 'Zombie';
    if (hd <= 3) return 'Ghoul';
    if (hd <= 4) return 'Shadow';
    if (hd <= 5) return 'Wight';
    if (hd <= 6) return 'Ghast';
    if (hd <= 7) return 'Wraith';
    if (hd <= 8) return 'Mummy';
    if (hd <= 9) return 'Spectre';
    if (hd <= 10) return 'Vampire';
    if (hd <= 11) return 'Ghost';
    if (hd <= 12) return 'Lich';
    return 'Fiend'; // 13+ HD undead are treated as fiends
  }

  return null; // Not undead
};

/**
 * Turn or destroy undead based on cleric level and undead type
 */
export const turnUndead: TurnUndeadFunction = (cleric, undead, alignmentEvil) => {
  // Check if cleric is high enough level to turn undead
  if (cleric.class !== 'Cleric' && cleric.class !== 'Paladin') {
    return {
      results: {},
      message: `${cleric.name} cannot turn undead.`,
    };
  }

  // Paladins turn undead as clerics of 2 levels lower
  const effectiveLevel = cleric.class === 'Paladin' ? Math.max(1, cleric.level - 2) : cleric.level;

  // Get the appropriate table row
  const turnLevel = getClericTurnLevel(effectiveLevel);
  const turnTable = TURN_UNDEAD_TABLE[turnLevel];

  if (!turnTable) {
    return {
      results: {},
      message: 'Error: Invalid cleric level for turning undead.',
    };
  }

  const results: Record<string, TurnUndeadResult> = {};
  const affectedUndead: string[] = [];
  const unaffectedUndead: string[] = [];

  // Process each undead
  for (const monster of undead) {
    const undeadType = classifyUndead(monster);

    // If not undead, can't be turned
    if (!undeadType) {
      results[monster.id] = 'No Effect';
      unaffectedUndead.push(monster.name);
      continue;
    }

    const turnValue = turnTable[undeadType];

    // Cannot turn this undead type at this level
    if (turnValue === '-') {
      results[monster.id] = 'No Effect';
      unaffectedUndead.push(monster.name);
      continue;
    }

    // Automatic turn
    if (turnValue === 'T') {
      results[monster.id] = alignmentEvil ? 'Control' : 'Turn';
      affectedUndead.push(monster.name);
      continue;
    }

    // Automatic destroy
    if (turnValue === 'D') {
      results[monster.id] = alignmentEvil ? 'Control' : 'Destroy';
      affectedUndead.push(monster.name);
      continue;
    }

    // Need to roll
    const diceRoll = roll(20);
    if (diceRoll >= (turnValue as number)) {
      results[monster.id] = alignmentEvil ? 'Control' : 'Turn';
      affectedUndead.push(monster.name);
    } else {
      results[monster.id] = 'No Effect';
      unaffectedUndead.push(monster.name);
    }
  }

  // Generate result message
  let message = '';

  if (affectedUndead.length === 0) {
    message = `${cleric.name}'s turning attempt has no effect on ${unaffectedUndead.join(', ')}.`;
  } else if (unaffectedUndead.length === 0) {
    const action = alignmentEvil ? 'controls' : 'turns';
    message = `${cleric.name} ${action} ${affectedUndead.join(', ')}!`;
  } else {
    const action = alignmentEvil ? 'controls' : 'turns';
    message = `${cleric.name} ${action} ${affectedUndead.join(', ')} but has no effect on ${unaffectedUndead.join(', ')}.`;
  }

  return { results, message };
};

// Store for turn undead results
export function createTurnUndeadResultsManager(
  initialResults: Record<string, TurnUndeadResult> = {}
) {
  return {
    results: initialResults,
    addResult: (id: string, result: TurnUndeadResult) => ({ ...initialResults, [id]: result }),
    getResult: (id: string) => initialResults[id],
    getAllResults: () => initialResults,
    clearResults: () => ({}),
  };
}
