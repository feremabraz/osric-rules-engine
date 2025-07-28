import type { Character, Item } from '@rules/types';
import { roll } from '@rules/utils/dice';
import type { DetailedThiefSkills, ThiefSkillCheckFunction } from './advancedClassTypes';

// Base thief skill percentages by level (1-24)
const BASE_THIEF_SKILLS: Record<
  number,
  {
    climbWalls: number;
    findTraps: number;
    hearNoise: number;
    hideInShadows: number;
    moveSilently: number;
    openLocks: number;
    pickPockets: number;
    readLanguages: number;
  }
> = {
  1: {
    climbWalls: 80,
    findTraps: 25,
    hearNoise: 10,
    hideInShadows: 20,
    moveSilently: 20,
    openLocks: 30,
    pickPockets: 35,
    readLanguages: 1,
  },
  2: {
    climbWalls: 82,
    findTraps: 29,
    hearNoise: 13,
    hideInShadows: 25,
    moveSilently: 25,
    openLocks: 34,
    pickPockets: 39,
    readLanguages: 5,
  },
  3: {
    climbWalls: 84,
    findTraps: 33,
    hearNoise: 16,
    hideInShadows: 30,
    moveSilently: 30,
    openLocks: 38,
    pickPockets: 43,
    readLanguages: 10,
  },
  4: {
    climbWalls: 86,
    findTraps: 37,
    hearNoise: 20,
    hideInShadows: 35,
    moveSilently: 35,
    openLocks: 42,
    pickPockets: 47,
    readLanguages: 15,
  },
  5: {
    climbWalls: 88,
    findTraps: 41,
    hearNoise: 25,
    hideInShadows: 40,
    moveSilently: 40,
    openLocks: 46,
    pickPockets: 51,
    readLanguages: 20,
  },
  6: {
    climbWalls: 90,
    findTraps: 45,
    hearNoise: 30,
    hideInShadows: 45,
    moveSilently: 45,
    openLocks: 50,
    pickPockets: 55,
    readLanguages: 25,
  },
  7: {
    climbWalls: 92,
    findTraps: 49,
    hearNoise: 35,
    hideInShadows: 50,
    moveSilently: 50,
    openLocks: 54,
    pickPockets: 59,
    readLanguages: 30,
  },
  8: {
    climbWalls: 94,
    findTraps: 53,
    hearNoise: 40,
    hideInShadows: 55,
    moveSilently: 55,
    openLocks: 58,
    pickPockets: 63,
    readLanguages: 35,
  },
  9: {
    climbWalls: 96,
    findTraps: 57,
    hearNoise: 45,
    hideInShadows: 60,
    moveSilently: 60,
    openLocks: 62,
    pickPockets: 67,
    readLanguages: 40,
  },
  10: {
    climbWalls: 98,
    findTraps: 61,
    hearNoise: 50,
    hideInShadows: 65,
    moveSilently: 65,
    openLocks: 66,
    pickPockets: 71,
    readLanguages: 45,
  },
  11: {
    climbWalls: 99,
    findTraps: 65,
    hearNoise: 55,
    hideInShadows: 70,
    moveSilently: 70,
    openLocks: 70,
    pickPockets: 75,
    readLanguages: 50,
  },
  12: {
    climbWalls: 99,
    findTraps: 69,
    hearNoise: 60,
    hideInShadows: 75,
    moveSilently: 75,
    openLocks: 74,
    pickPockets: 79,
    readLanguages: 55,
  },
  13: {
    climbWalls: 99,
    findTraps: 73,
    hearNoise: 65,
    hideInShadows: 80,
    moveSilently: 80,
    openLocks: 78,
    pickPockets: 83,
    readLanguages: 60,
  },
  14: {
    climbWalls: 99,
    findTraps: 77,
    hearNoise: 70,
    hideInShadows: 85,
    moveSilently: 85,
    openLocks: 82,
    pickPockets: 87,
    readLanguages: 65,
  },
  15: {
    climbWalls: 99,
    findTraps: 81,
    hearNoise: 75,
    hideInShadows: 90,
    moveSilently: 90,
    openLocks: 86,
    pickPockets: 91,
    readLanguages: 70,
  },
  16: {
    climbWalls: 99,
    findTraps: 85,
    hearNoise: 75,
    hideInShadows: 91,
    moveSilently: 91,
    openLocks: 90,
    pickPockets: 95,
    readLanguages: 75,
  },
  17: {
    climbWalls: 99,
    findTraps: 89,
    hearNoise: 75,
    hideInShadows: 92,
    moveSilently: 92,
    openLocks: 94,
    pickPockets: 99,
    readLanguages: 80,
  },
  18: {
    climbWalls: 99,
    findTraps: 93,
    hearNoise: 75,
    hideInShadows: 93,
    moveSilently: 93,
    openLocks: 98,
    pickPockets: 99,
    readLanguages: 85,
  },
  19: {
    climbWalls: 99,
    findTraps: 95,
    hearNoise: 75,
    hideInShadows: 94,
    moveSilently: 94,
    openLocks: 99,
    pickPockets: 99,
    readLanguages: 90,
  },
  20: {
    climbWalls: 99,
    findTraps: 97,
    hearNoise: 75,
    hideInShadows: 95,
    moveSilently: 95,
    openLocks: 99,
    pickPockets: 99,
    readLanguages: 95,
  },
  21: {
    climbWalls: 99,
    findTraps: 98,
    hearNoise: 75,
    hideInShadows: 96,
    moveSilently: 96,
    openLocks: 99,
    pickPockets: 99,
    readLanguages: 96,
  },
  22: {
    climbWalls: 99,
    findTraps: 99,
    hearNoise: 77,
    hideInShadows: 97,
    moveSilently: 97,
    openLocks: 99,
    pickPockets: 99,
    readLanguages: 97,
  },
  23: {
    climbWalls: 99,
    findTraps: 99,
    hearNoise: 78,
    hideInShadows: 98,
    moveSilently: 98,
    openLocks: 99,
    pickPockets: 99,
    readLanguages: 98,
  },
  24: {
    climbWalls: 99,
    findTraps: 99,
    hearNoise: 79,
    hideInShadows: 99,
    moveSilently: 99,
    openLocks: 99,
    pickPockets: 99,
    readLanguages: 99,
  },
};

// Dexterity adjustments for thief skills
type DexterityAdjustment = {
  findTraps: number;
  hideInShadows: number;
  moveSilently: number;
  openLocks: number;
  pickPockets: number;
};

const DEXTERITY_ADJUSTMENTS: Record<number, DexterityAdjustment> = {
  9: { findTraps: -15, hideInShadows: -20, moveSilently: -10, openLocks: -15, pickPockets: 0 },
  10: { findTraps: -10, hideInShadows: -15, moveSilently: -5, openLocks: -10, pickPockets: 0 },
  11: { findTraps: -5, hideInShadows: -10, moveSilently: 0, openLocks: -5, pickPockets: 0 },
  12: { findTraps: 0, hideInShadows: -5, moveSilently: 0, openLocks: 0, pickPockets: 0 },
  13: { findTraps: 0, hideInShadows: 0, moveSilently: 0, openLocks: 0, pickPockets: 0 },
  14: { findTraps: 0, hideInShadows: 0, moveSilently: 0, openLocks: 0, pickPockets: 0 },
  15: { findTraps: 0, hideInShadows: 0, moveSilently: 5, openLocks: 0, pickPockets: 0 },
  16: { findTraps: 0, hideInShadows: 0, moveSilently: 5, openLocks: 5, pickPockets: 0 },
  17: { findTraps: 5, hideInShadows: 5, moveSilently: 10, openLocks: 5, pickPockets: 0 },
  18: { findTraps: 10, hideInShadows: 10, moveSilently: 15, openLocks: 10, pickPockets: 0 },
  19: { findTraps: 15, hideInShadows: 15, moveSilently: 20, openLocks: 15, pickPockets: 0 },
};

// Racial adjustments for thief skills
type RacialAdjustment = {
  findTraps: number;
  hideInShadows: number;
  moveSilently: number;
  openLocks: number;
  pickPockets: number;
  climbWalls: number;
  hearNoise: number;
  readLanguages: number;
};

const RACIAL_ADJUSTMENTS: Record<string, Partial<RacialAdjustment>> = {
  Dwarf: {
    findTraps: 15,
    hideInShadows: -5,
    moveSilently: 0,
    openLocks: 0,
    pickPockets: -5,
    climbWalls: 0,
    hearNoise: 0,
  },
  Elf: {
    findTraps: 5,
    hideInShadows: 5,
    moveSilently: -5,
    openLocks: 5,
    pickPockets: 10,
    climbWalls: 0,
    hearNoise: 0,
  },
  Halfling: {
    findTraps: 0,
    hideInShadows: 15,
    moveSilently: 0,
    openLocks: 5,
    pickPockets: -5,
    climbWalls: 0,
    hearNoise: 0,
  },
  'Half-Orc': {
    findTraps: 5,
    hideInShadows: 5,
    moveSilently: 5,
    openLocks: -5,
    pickPockets: 5,
    climbWalls: 0,
    hearNoise: 5,
  },
};

/**
 * Calculate detailed thief skills for a character including all modifiers
 */
export const calculateThiefSkills = (character: Character): DetailedThiefSkills | null => {
  // Only thieves or assassins have thief skills
  if (character.class !== 'Thief' && character.class !== 'Assassin') {
    return null;
  }

  const level = character.level;
  const dexterity = character.abilities.dexterity;
  const race = character.race;

  // Get base skills for level
  const baseLevel = Math.min(level, 24); // Cap at level 24
  const baseSkills = BASE_THIEF_SKILLS[baseLevel];

  if (!baseSkills) {
    throw new Error(`Invalid thief level: ${level}`);
  }

  // Get dexterity adjustments
  const dexBracket = Math.min(Math.max(dexterity, 9), 19); // Clamp dexterity to 9-19 range
  const dexMods = DEXTERITY_ADJUSTMENTS[dexBracket] || {
    findTraps: 0,
    hideInShadows: 0,
    moveSilently: 0,
    openLocks: 0,
    pickPockets: 0,
  };

  // Get racial adjustments if any
  const raceMods = RACIAL_ADJUSTMENTS[race] || {
    findTraps: 0,
    hideInShadows: 0,
    moveSilently: 0,
    openLocks: 0,
    pickPockets: 0,
    climbWalls: 0,
    hearNoise: 0,
    readLanguages: 0,
  };

  // Calculate armor penalties - simplified version based on armor type
  const armorPenalties = {
    climbWalls: 0,
    hideInShadows: 0,
    moveSilently: 0,
    pickPockets: 0,
  };

  const wearingArmor = character.inventory.some((item) => {
    const itemWithType = item as { type?: string; equipped: boolean };
    return itemWithType.equipped && itemWithType.type === 'Armor';
  });

  if (wearingArmor) {
    // Apply heavy penalty for wearing armor (simplified)
    armorPenalties.climbWalls = -30;
    armorPenalties.hideInShadows = -20;
    armorPenalties.moveSilently = -20;
    armorPenalties.pickPockets = -15;
  }

  return {
    baseSkills,
    racialModifiers: {
      climbWalls: raceMods.climbWalls || 0,
      findTraps: raceMods.findTraps || 0,
      hearNoise: raceMods.hearNoise || 0,
      hideInShadows: raceMods.hideInShadows || 0,
      moveSilently: raceMods.moveSilently || 0,
      openLocks: raceMods.openLocks || 0,
      pickPockets: raceMods.pickPockets || 0,
      readLanguages: raceMods.readLanguages || 0,
    },
    dexterityModifiers: dexMods,
    armorPenalties,
  };
};

/**
 * Get the total percentage chance for a specific thief skill
 */
export const getThiefSkillPercentage = (
  character: Character,
  skillName: keyof DetailedThiefSkills['baseSkills']
): number => {
  const thiefSkills = calculateThiefSkills(character);

  if (!thiefSkills) {
    return 0;
  }

  const base = thiefSkills.baseSkills[skillName];
  const racialMod = thiefSkills.racialModifiers[skillName];

  // Dexterity only affects certain skills
  const dexMod = [
    'findTraps',
    'hideInShadows',
    'moveSilently',
    'openLocks',
    'pickPockets',
  ].includes(skillName)
    ? (thiefSkills.dexterityModifiers as Record<typeof skillName, number>)[skillName] || 0
    : 0;

  // Armor penalties only affect certain skills
  const armorPenalty = ['climbWalls', 'hideInShadows', 'moveSilently', 'pickPockets'].includes(
    skillName
  )
    ? thiefSkills.armorPenalties[skillName as keyof typeof thiefSkills.armorPenalties]
    : 0;

  // Total percentage (clamped to 1-99%)
  return Math.min(99, Math.max(1, base + racialMod + dexMod + armorPenalty));
};

/**
 * Attempt a thief skill check
 */
export const thiefSkillCheck: ThiefSkillCheckFunction = (thief, skillName, difficultyModifier) => {
  // Get the skill percentage chance
  const skillPercentage = getThiefSkillPercentage(thief, skillName);

  // Apply difficulty modifier (negative = harder, positive = easier)
  const adjustedPercentage = Math.min(99, Math.max(1, skillPercentage + difficultyModifier));

  // Roll percentile dice
  const diceRoll = roll(100);
  const success = diceRoll <= adjustedPercentage;

  // Format skill name for display
  const formattedSkillName = skillName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .replace('In Shadows', 'in Shadows')
    .replace('Pick Pockets', 'Pickpocket');

  // Craft appropriate message
  let message = '';
  if (success) {
    message = `${thief.name} successfully uses ${formattedSkillName} (rolled ${diceRoll}, needed ${adjustedPercentage} or less)`;
  } else {
    message = `${thief.name} fails to use ${formattedSkillName} (rolled ${diceRoll}, needed ${adjustedPercentage} or less)`;
  }

  return {
    success,
    rollNeeded: adjustedPercentage,
    actualRoll: diceRoll,
    message,
  };
};

// Thief skill result management
export function createThiefSkillResult(
  skillName: string,
  success: boolean,
  roll: number,
  target: number
) {
  return {
    skillName,
    success,
    roll,
    target,
  };
}
