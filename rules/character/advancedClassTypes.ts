// Advanced class features types
import type { Character, Monster } from '@rules/types';

// Undead types for turning
export const UndeadTypes = [
  'Skeleton',
  'Zombie',
  'Ghoul',
  'Shadow',
  'Wight',
  'Ghast',
  'Wraith',
  'Mummy',
  'Spectre',
  'Vampire',
  'Ghost',
  'Lich',
  'Fiend',
] as const;

export type UndeadType = (typeof UndeadTypes)[number];

// Expanded turn undead results
export type TurnUndeadResult = 'No Effect' | 'Turn' | 'Destroy' | 'Control';

// Detailed turn undead table entry
export interface TurnUndeadTableEntry {
  clericLevel: number;
  undeadType: UndeadType;
  targetRoll: number | 'T' | 'D' | '-'; // Number to roll, "T" = automatic Turn, "D" = automatic Destroy, "-" = no effect possible
}

// Thief skills with modifiers
export interface DetailedThiefSkills {
  baseSkills: {
    climbWalls: number;
    findTraps: number;
    hearNoise: number;
    hideInShadows: number;
    moveSilently: number;
    openLocks: number;
    pickPockets: number;
    readLanguages: number;
  };
  racialModifiers: {
    climbWalls: number;
    findTraps: number;
    hearNoise: number;
    hideInShadows: number;
    moveSilently: number;
    openLocks: number;
    pickPockets: number;
    readLanguages: number;
  };
  dexterityModifiers: {
    findTraps: number;
    hideInShadows: number;
    moveSilently: number;
    openLocks: number;
    pickPockets: number;
  };
  armorPenalties: {
    climbWalls: number;
    hideInShadows: number;
    moveSilently: number;
    pickPockets: number;
  };
}

// Backstab calculation
export interface BackstabResult {
  success: boolean;
  hitRoll: number;
  multiplier: number;
  baseDamage: number;
  multipliedDamage: number;
  bonusDamage: number; // Non-multiplied bonuses
  totalDamage: number;
  message: string;
}

// Function signatures for class abilities
export type TurnUndeadFunction = (
  cleric: Character,
  undead: Monster[],
  alignmentEvil: boolean
) => {
  results: Record<string, TurnUndeadResult>;
  message: string;
};

export type ThiefSkillCheckFunction = (
  thief: Character,
  skillName: keyof DetailedThiefSkills['baseSkills'],
  difficultyModifier: number
) => {
  success: boolean;
  rollNeeded: number;
  actualRoll: number;
  message: string;
};

export type BackstabFunction = (
  thief: Character,
  target: Character | Monster,
  isUnaware: boolean,
  isFromBehind: boolean
) => BackstabResult;
