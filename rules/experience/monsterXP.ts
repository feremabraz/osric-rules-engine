import type { Monster } from '@rules/types';
import type { MonsterXPTable, XPRewardFactors } from './types';

/**
 * Base XP rewards for monsters based on Hit Dice
 * Following OSRIC rules for monster XP calculation
 */
export const monsterXPTable: MonsterXPTable = {
  // Format: 'HD': baseXP
  '< 1': 5, // Less than 1 HD
  '1': 10, // 1 HD
  '1+': 15, // 1+ HD
  '2': 20, // 2 HD
  '2+': 35, // 2+ HD
  '3': 50, // 3 HD
  '3+': 65, // 3+ HD
  '4': 90, // 4 HD
  '4+': 150, // 4+ HD
  '5': 200, // 5 HD
  '5+': 300, // 5+ HD
  '6': 400, // 6 HD
  '6+': 550, // 6+ HD
  '7': 700, // 7 HD
  '7+': 900, // 7+ HD
  '8': 1100, // 8 HD
  '8+': 1400, // 8+ HD
  '9': 1700, // 9 HD
  '9+': 2000, // 9+ HD
  '10': 2500, // 10 HD
  '11': 3000, // 11 HD
  '12': 4000, // 12 HD
  '13': 5000, // 13 HD
  '14': 6000, // 14 HD
  '15': 7000, // 15 HD
  '16': 8000, // 16 HD
  '17': 9000, // 17 HD
  '18': 10000, // 18 HD
  '19': 11000, // 19 HD
  '20': 12000, // 20 HD
  '21+': 15000, // 21+ HD
};

/**
 * Special ability XP bonuses
 * Used to calculate additional XP for monsters with special abilities
 */
export const specialAbilityBonuses = {
  // Special attack forms (breath weapon, petrification, etc.)
  specialAttack: 250,

  // Special defenses (invisibility, regeneration, etc.)
  specialDefense: 200,

  // Exceptional abilities (spellcasting, shape-changing, etc.)
  exceptionalAbility: 300,

  // Magic resistance
  magicResistance: 400,

  // Powerful abilities (instant death, level drain, etc.)
  powerfulAbility: 500,
};

/**
 * Calculate XP reward factors for a monster
 */
export function calculateXPRewardFactors(
  monster: Monster,
  characterLevel: number
): XPRewardFactors {
  // Get base XP from hit dice
  const hitDiceKey = getHitDiceKey(monster.hitDice);
  const baseXP = monsterXPTable[hitDiceKey] || 0;

  // Calculate special ability bonuses
  let specialAbilityBonus = 0;

  // Add all special ability bonuses based on monster traits
  if (monster.specialAbilities) {
    for (const ability of monster.specialAbilities) {
      if (ability === 'attack') specialAbilityBonus += specialAbilityBonuses.specialAttack;
      if (ability === 'defense') specialAbilityBonus += specialAbilityBonuses.specialDefense;
      if (ability === 'exceptional')
        specialAbilityBonus += specialAbilityBonuses.exceptionalAbility;
      if (ability === 'resistance') specialAbilityBonus += specialAbilityBonuses.magicResistance;
      if (ability === 'powerful') specialAbilityBonus += specialAbilityBonuses.powerfulAbility;
    }
  }

  // Exceptional challenge bonus (for unique or particularly difficult encounters)
  const exceptionalChallengeBonus = monster.exceptional ? Math.floor(baseXP * 0.5) : 0;

  // Level difference modifier
  // OSRIC rules suggest reduced XP for monsters much weaker than the character
  let levelDifferenceModifier = 1.0;

  // Parse hitDice string (format like "3+1") to extract the base number
  const hitDiceBase = Number.parseFloat(monster.hitDice.split('+')[0].split('-')[0]);
  const monsterLevel = Math.ceil(hitDiceBase);

  if (monsterLevel < characterLevel - 4) {
    // Reduce XP for monsters significantly below character level
    levelDifferenceModifier = 0.5;
  } else if (monsterLevel > characterLevel + 4) {
    // Bonus XP for monsters significantly above character level
    levelDifferenceModifier = 1.5;
  }

  return {
    baseXP,
    specialAbilityBonus,
    exceptionalChallengeBonus,
    levelDifferenceModifier,
  };
}

/**
 * Convert a monster's hit dice to a key for the XP table
 */
function getHitDiceKey(hitDice: string): string {
  // Parse the hit dice string format (e.g., "3+1" for 3d8+1)
  // We only care about the main number before any plus or minus
  const hitDiceNumber = Number.parseFloat(hitDice.split(/[+\-]/)[0]);

  const wholePart = Math.floor(hitDiceNumber);
  const hasFraction = hitDiceNumber > wholePart;

  if (hitDiceNumber < 1) return '< 1';
  if (hitDiceNumber >= 21) return '21+';

  return hasFraction ? `${wholePart}+` : `${wholePart}`;
}

/**
 * Calculate the total XP value for a monster
 */
export function calculateMonsterXP(monster: Monster, characterLevel: number): number {
  const factors = calculateXPRewardFactors(monster, characterLevel);

  // Total XP calculation
  const totalXP = Math.floor(
    (factors.baseXP + factors.specialAbilityBonus + factors.exceptionalChallengeBonus) *
      factors.levelDifferenceModifier
  );

  return totalXP;
}

/**
 * Calculate XP for a group of monsters
 */
export function calculateGroupXP(monsters: Monster[], characterLevel: number): number {
  return monsters.reduce((total, monster) => {
    return total + calculateMonsterXP(monster, characterLevel);
  }, 0);
}
