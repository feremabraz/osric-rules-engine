import type { CharacterClass } from '@rules/types';
import type { ExperienceTablesByClass, LevelAdvancement } from './types';

/**
 * Level advancement tables for all character classes
 * Based on OSRIC ruleset
 */
export const levelProgressionTables: ExperienceTablesByClass = {
  // Fighter level progression
  Fighter: [
    {
      level: 1,
      experienceRequired: 0,
      title: 'Veteran',
      hitDiceType: 10,
      hitDiceCount: 1,
    },
    {
      level: 2,
      experienceRequired: 2000,
      title: 'Warrior',
      hitDiceType: 10,
      hitDiceCount: 2,
    },
    {
      level: 3,
      experienceRequired: 4000,
      title: 'Swordsman',
      hitDiceType: 10,
      hitDiceCount: 3,
    },
    {
      level: 4,
      experienceRequired: 8000,
      title: 'Hero',
      hitDiceType: 10,
      hitDiceCount: 4,
    },
    {
      level: 5,
      experienceRequired: 16000,
      title: 'Swashbuckler',
      hitDiceType: 10,
      hitDiceCount: 5,
    },
    {
      level: 6,
      experienceRequired: 32000,
      title: 'Myrmidon',
      hitDiceType: 10,
      hitDiceCount: 6,
    },
    {
      level: 7,
      experienceRequired: 64000,
      title: 'Champion',
      hitDiceType: 10,
      hitDiceCount: 7,
    },
    {
      level: 8,
      experienceRequired: 125000,
      title: 'Superhero',
      hitDiceType: 10,
      hitDiceCount: 8,
    },
    {
      level: 9,
      experienceRequired: 250000,
      title: 'Lord',
      hitDiceType: 10,
      hitDiceCount: 9,
      specialAbilities: ['Can establish a freehold and attract followers'],
    },
    // Higher levels follow same pattern with +2 HP per level
    {
      level: 10,
      experienceRequired: 500000,
      title: 'Lord',
      hitDiceType: 10,
      hitDiceCount: 9,
      hitPointModifier: 2,
    },
    // Continuing levels would follow the same pattern
  ],

  // Cleric level progression - from the OSRIC document
  Cleric: [
    {
      level: 1,
      experienceRequired: 0,
      title: 'Acolyte',
      hitDiceType: 8,
      hitDiceCount: 1,
    },
    {
      level: 2,
      experienceRequired: 1550,
      title: 'Adept',
      hitDiceType: 8,
      hitDiceCount: 2,
    },
    {
      level: 3,
      experienceRequired: 2900,
      title: 'Priest',
      hitDiceType: 8,
      hitDiceCount: 3,
    },
    {
      level: 4,
      experienceRequired: 6000,
      title: 'Curate',
      hitDiceType: 8,
      hitDiceCount: 4,
    },
    {
      level: 5,
      experienceRequired: 13250,
      title: 'Rector',
      hitDiceType: 8,
      hitDiceCount: 5,
    },
    {
      level: 6,
      experienceRequired: 27000,
      title: 'Vicar',
      hitDiceType: 8,
      hitDiceCount: 6,
    },
    {
      level: 7,
      experienceRequired: 55000,
      title: 'Canon',
      hitDiceType: 8,
      hitDiceCount: 7,
    },
    {
      level: 8,
      experienceRequired: 110000,
      title: 'Lama',
      hitDiceType: 8,
      hitDiceCount: 8,
    },
    {
      level: 9,
      experienceRequired: 220000,
      title: 'High Priest',
      hitDiceType: 8,
      hitDiceCount: 9,
      specialAbilities: ['Can establish a temple and attract followers'],
    },
    // Higher levels continue with the same pattern, +2 HP per level
    {
      level: 10,
      experienceRequired: 450000,
      title: 'High Priest',
      hitDiceType: 8,
      hitDiceCount: 9,
      hitPointModifier: 2,
    },
    // Additional levels would continue with +225k XP and +2 HP per level
  ],

  // Magic User level progression
  'Magic-User': [
    {
      level: 1,
      experienceRequired: 0,
      title: 'Prestidigitator',
      hitDiceType: 4,
      hitDiceCount: 1,
    },
    {
      level: 2,
      experienceRequired: 2500,
      title: 'Evoker',
      hitDiceType: 4,
      hitDiceCount: 2,
    },
    {
      level: 3,
      experienceRequired: 5000,
      title: 'Conjurer',
      hitDiceType: 4,
      hitDiceCount: 3,
    },
    {
      level: 4,
      experienceRequired: 10000,
      title: 'Theurgist',
      hitDiceType: 4,
      hitDiceCount: 4,
    },
    {
      level: 5,
      experienceRequired: 20000,
      title: 'Thaumaturgist',
      hitDiceType: 4,
      hitDiceCount: 5,
    },
    {
      level: 6,
      experienceRequired: 40000,
      title: 'Magician',
      hitDiceType: 4,
      hitDiceCount: 6,
    },
    {
      level: 7,
      experienceRequired: 60000,
      title: 'Enchanter',
      hitDiceType: 4,
      hitDiceCount: 7,
    },
    {
      level: 8,
      experienceRequired: 90000,
      title: 'Warlock',
      hitDiceType: 4,
      hitDiceCount: 8,
    },
    {
      level: 9,
      experienceRequired: 135000,
      title: 'Sorcerer',
      hitDiceType: 4,
      hitDiceCount: 9,
      specialAbilities: ['Can establish a tower and attract apprentices'],
    },
    {
      level: 10,
      experienceRequired: 250000,
      title: 'Necromancer',
      hitDiceType: 4,
      hitDiceCount: 10,
    },
    {
      level: 11,
      experienceRequired: 375000,
      title: 'Wizard',
      hitDiceType: 4,
      hitDiceCount: 11,
    },
    // Higher levels would continue with the same pattern
  ],

  // Thief level progression
  Thief: [
    {
      level: 1,
      experienceRequired: 0,
      title: 'Apprentice',
      hitDiceType: 6,
      hitDiceCount: 1,
    },
    {
      level: 2,
      experienceRequired: 1250,
      title: 'Footpad',
      hitDiceType: 6,
      hitDiceCount: 2,
    },
    {
      level: 3,
      experienceRequired: 2500,
      title: 'Robber',
      hitDiceType: 6,
      hitDiceCount: 3,
    },
    {
      level: 4,
      experienceRequired: 5000,
      title: 'Burglar',
      hitDiceType: 6,
      hitDiceCount: 4,
    },
    {
      level: 5,
      experienceRequired: 10000,
      title: 'Cutpurse',
      hitDiceType: 6,
      hitDiceCount: 5,
    },
    {
      level: 6,
      experienceRequired: 20000,
      title: 'Sharper',
      hitDiceType: 6,
      hitDiceCount: 6,
    },
    {
      level: 7,
      experienceRequired: 40000,
      title: 'Pilferer',
      hitDiceType: 6,
      hitDiceCount: 7,
    },
    {
      level: 8,
      experienceRequired: 70000,
      title: 'Master Pilferer',
      hitDiceType: 6,
      hitDiceCount: 8,
    },
    {
      level: 9,
      experienceRequired: 110000,
      title: 'Thief',
      hitDiceType: 6,
      hitDiceCount: 9,
      specialAbilities: ['Can establish a guild and attract followers'],
    },
    {
      level: 10,
      experienceRequired: 160000,
      title: 'Master Thief',
      hitDiceType: 6,
      hitDiceCount: 10,
    },
    // Higher levels would continue with the same pattern
  ],

  // Add other character classes as needed: assassin, druid, paladin, ranger, monk, etc.
  // with their appropriate progression tables from OSRIC
  Assassin: [
    // Implement according to OSRIC tables
    {
      level: 1,
      experienceRequired: 0,
      title: 'Bravo',
      hitDiceType: 6,
      hitDiceCount: 1,
    },
    // Additional levels would be added
  ],

  Druid: [
    // Implement according to OSRIC tables
    {
      level: 1,
      experienceRequired: 0,
      title: 'Aspirant',
      hitDiceType: 8,
      hitDiceCount: 1,
    },
    // Additional levels would be added
  ],

  Paladin: [
    // Implement according to OSRIC tables
    {
      level: 1,
      experienceRequired: 0,
      title: 'Gallant',
      hitDiceType: 10,
      hitDiceCount: 1,
    },
    // Additional levels would be added
  ],

  Ranger: [
    // Implement according to OSRIC tables
    {
      level: 1,
      experienceRequired: 0,
      title: 'Runner',
      hitDiceType: 8,
      hitDiceCount: 1,
    },
    // Additional levels would be added
  ],

  Illusionist: [
    // Implement according to OSRIC tables
    {
      level: 1,
      experienceRequired: 0,
      title: 'Prestidigitator',
      hitDiceType: 4,
      hitDiceCount: 1,
    },
    // Additional levels would be added
  ],
};

/**
 * Get the level progression table for a specific character class
 */
export function getLevelProgressionTable(characterClass: CharacterClass): LevelAdvancement[] {
  return levelProgressionTables[characterClass] || [];
}

/**
 * Determine a character's level based on experience points
 */
export function determineLevel(characterClass: CharacterClass, experiencePoints: number): number {
  const progressionTable = getLevelProgressionTable(characterClass);

  // Start from the highest level and work backwards
  for (let i = progressionTable.length - 1; i >= 0; i--) {
    if (experiencePoints >= progressionTable[i].experienceRequired) {
      return progressionTable[i].level;
    }
  }

  // If somehow below level 1 requirements, return level 1
  return 1;
}

/**
 * Get experience required for next level
 */
export function getExperienceForNextLevel(
  characterClass: CharacterClass,
  currentLevel: number
): number {
  const progressionTable = getLevelProgressionTable(characterClass);
  const nextLevelIndex = progressionTable.findIndex((entry) => entry.level === currentLevel + 1);

  if (nextLevelIndex !== -1) {
    return progressionTable[nextLevelIndex].experienceRequired;
  }

  // If at max level defined in the table, return a very large number
  return Number.MAX_SAFE_INTEGER;
}

/**
 * Get the level title for a character class at a specific level
 */
export function getLevelTitle(characterClass: CharacterClass, level: number): string {
  const progressionTable = getLevelProgressionTable(characterClass);
  const levelEntry = progressionTable.find((entry) => entry.level === level);

  return levelEntry?.title || 'Unknown';
}
