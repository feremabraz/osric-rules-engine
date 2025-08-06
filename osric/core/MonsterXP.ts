/**
 * Monster Experience Point Calculations
 * OSRIC AD&D 1st Edition Experience Point System
 *
 * Implements the complete OSRIC experience system for:
 * - Monster defeat XP calculation
 * - Group XP distribution
 * - Bonus XP for special abilities
 * - Class-specific XP modifiers
 */

import type { Character, Monster } from '../types/entities';

/**
 * Base XP values by Hit Dice according to OSRIC
 */
const BASE_XP_BY_HD: Record<string, number> = {
  'less-than-1': 5,
  '1-minus': 7, // 1-1 HD
  '1': 10,
  '1-plus': 15, // 1+1 HD
  '2': 20,
  '2-plus': 35, // 2+1 HD
  '3': 50,
  '3-plus': 75, // 3+1 HD
  '4': 125,
  '4-plus': 175, // 4+1 HD
  '5': 275,
  '5-plus': 425, // 5+1 HD
  '6': 650,
  '6-plus': 975, // 6+1 HD
  '7': 1400,
  '7-plus': 1850, // 7+1 HD
  '8': 2300,
  '8-plus': 2750, // 8+1 HD
  '9': 3000,
  '9-plus': 3500, // 9+1 HD
  '10': 4000,
  '10-plus': 4500, // 10+1 HD
  '11': 5000,
  '11-plus': 5500, // 11+1 HD
  '12': 6000,
  '12-plus': 6500, // 12+1 HD
  '13': 7000,
  '13-plus': 7500, // 13+1 HD
  '14': 8000,
  '14-plus': 8500, // 14+1 HD
  '15': 9000,
  '15-plus': 9500, // 15+1 HD
  '16': 10000,
  '16-plus': 10500, // 16+1 HD
};

/**
 * Special ability XP bonuses
 */
const SPECIAL_ABILITY_XP: Record<string, number> = {
  // Attack forms
  'breath-weapon': 100,
  poison: 100,
  paralysis: 75,
  'energy-drain': 200,
  'magic-use': 100,
  'spell-like-abilities': 50,

  // Defenses
  'magic-resistance': 100,
  immunity: 75,
  regeneration: 100,
  invisibility: 50,

  // Special attacks
  'swallow-whole': 100,
  'multiple-attacks': 50,
  charm: 75,
  fear: 50,
  confusion: 75,

  // Movement
  flight: 25,
  teleportation: 50,
  phasing: 75,
};

/**
 * Parse hit dice string and calculate base XP
 */
function getBaseXP(hitDiceString: string): number {
  // Parse hit dice like "3+1", "4-1", "5", "1/2"
  let hdKey: string;

  if (hitDiceString.includes('/')) {
    hdKey = 'less-than-1';
  } else if (hitDiceString.includes('+')) {
    const baseHD = Number.parseInt(hitDiceString.split('+')[0], 10);
    hdKey = `${baseHD}-plus`;
  } else if (hitDiceString.includes('-')) {
    const baseHD = Number.parseInt(hitDiceString.split('-')[0], 10);
    hdKey = `${baseHD}-minus`;
  } else {
    const baseHD = Number.parseInt(hitDiceString, 10);
    hdKey = baseHD.toString();
  }

  return BASE_XP_BY_HD[hdKey] || BASE_XP_BY_HD['16-plus'];
}

/**
 * Calculate bonus XP for special abilities
 */
function calculateSpecialAbilityXP(monster: Monster): number {
  let bonusXP = 0;

  // Check for various special abilities
  if (monster.specialAbilities) {
    for (const ability of monster.specialAbilities) {
      const abilityKey = ability.toLowerCase().replace(/\s+/g, '-');
      bonusXP += SPECIAL_ABILITY_XP[abilityKey] || 0;
    }
  }

  return bonusXP;
}

/**
 * Calculate total XP value for defeating a monster
 */
export function calculateMonsterXP(monster: Monster): number {
  const baseXP = getBaseXP(monster.hitDice);
  const abilityXP = calculateSpecialAbilityXP(monster);
  const totalXP = baseXP + abilityXP;

  return Math.max(1, totalXP); // Minimum 1 XP
}

/**
 * Parameters for group XP calculation
 */
export interface GroupXPParameters {
  monsters: Monster[];
  characters: Character[];
  encounterDifficulty?: 'easy' | 'normal' | 'hard' | 'deadly';
  roleplayingBonus?: number; // 0-100% bonus for good roleplaying
  tacticalBonus?: number; // 0-50% bonus for clever tactics
}

/**
 * Calculate and distribute XP among group members
 */
export function calculateGroupXP(parameters: GroupXPParameters): Map<string, number> {
  const {
    monsters,
    characters,
    encounterDifficulty = 'normal',
    roleplayingBonus = 0,
    tacticalBonus = 0,
  } = parameters;

  // Calculate total XP from monsters
  let totalMonsterXP = 0;
  for (const monster of monsters) {
    totalMonsterXP += calculateMonsterXP(monster);
  }

  // Apply encounter difficulty modifier
  const difficultyMultiplier = getDifficultyMultiplier(encounterDifficulty, characters.length);
  let adjustedXP = Math.floor(totalMonsterXP * difficultyMultiplier);

  // Apply roleplaying bonus
  if (roleplayingBonus > 0) {
    adjustedXP += Math.floor(adjustedXP * (roleplayingBonus / 100));
  }

  // Apply tactical bonus
  if (tacticalBonus > 0) {
    adjustedXP += Math.floor(adjustedXP * (tacticalBonus / 100));
  }

  // Distribute XP among characters
  const xpDistribution = new Map<string, number>();
  const activeCharacters = characters.filter((char) => char.hitPoints.current > 0);

  if (activeCharacters.length === 0) {
    return xpDistribution; // No one gets XP if everyone is dead
  }

  // Equal distribution among active characters
  const xpPerCharacter = Math.floor(adjustedXP / activeCharacters.length);

  for (const character of activeCharacters) {
    let characterXP = xpPerCharacter;

    // Apply class-specific modifiers
    characterXP = applyClassXPModifier(character, characterXP);

    // Apply prime requisite bonus
    characterXP = applyPrimeRequisiteBonus(character, characterXP);

    xpDistribution.set(character.id, characterXP);
  }

  return xpDistribution;
}

/**
 * Get difficulty multiplier based on encounter and party size
 */
function getDifficultyMultiplier(difficulty: string, partySize: number): number {
  const baseMultipliers: Record<string, number> = {
    easy: 0.75,
    normal: 1.0,
    hard: 1.25,
    deadly: 1.5,
  };

  let multiplier = baseMultipliers[difficulty] || 1.0;

  // Adjust for party size (smaller parties get bonus, larger parties get penalty)
  if (partySize <= 3) {
    multiplier *= 1.1; // 10% bonus for small parties
  } else if (partySize >= 6) {
    multiplier *= 0.9; // 10% penalty for large parties
  }

  return multiplier;
}

/**
 * Apply class-specific XP modifiers
 */
function applyClassXPModifier(character: Character, baseXP: number): number {
  // Multi-class characters split XP (count non-zero levels)
  const activeClasses = Object.values(character.classes).filter((level) => level && level > 0);
  if (activeClasses.length > 1) {
    return Math.floor(baseXP / activeClasses.length);
  }

  // Single class gets full XP
  return baseXP;
}

/**
 * Apply prime requisite ability score bonus
 */
function applyPrimeRequisiteBonus(character: Character, baseXP: number): number {
  let highestPrimeReq = 0;

  // Check prime requisites for each class
  for (const [className, level] of Object.entries(character.classes)) {
    if (level && level > 0) {
      const primeReqs = getPrimeRequisites(className);
      for (const ability of primeReqs) {
        const score = character.abilities[ability as keyof typeof character.abilities];
        if (score > highestPrimeReq) {
          highestPrimeReq = score;
        }
      }
    }
  }

  // Apply bonus based on highest prime requisite
  if (highestPrimeReq >= 16) {
    return Math.floor(baseXP * 1.1); // 10% bonus
  }
  if (highestPrimeReq >= 13) {
    return Math.floor(baseXP * 1.05); // 5% bonus
  }

  return baseXP; // No bonus
}

/**
 * Get prime requisites for a character class
 */
function getPrimeRequisites(className: string): string[] {
  const primeRequisites: Record<string, string[]> = {
    fighter: ['strength'],
    cleric: ['wisdom'],
    'magic-user': ['intelligence'],
    thief: ['dexterity'],
    ranger: ['strength', 'intelligence', 'wisdom'],
    paladin: ['strength', 'charisma'],
    druid: ['wisdom', 'charisma'],
    illusionist: ['intelligence'],
    assassin: ['strength', 'intelligence', 'dexterity'],
    monk: ['strength', 'wisdom', 'dexterity'],
    bard: ['dexterity', 'intelligence', 'charisma'],
  };

  return primeRequisites[className.toLowerCase()] || [];
}

/**
 * Calculate XP needed for next level based on class and current level
 */
export function calculateXPForNextLevel(character: Character): number {
  // Get primary class and level
  const primaryClass = character.class;
  const currentLevel = character.level;

  // Simplified XP progression (would need full OSRIC tables)
  const classMultipliers: Record<string, number> = {
    Fighter: 2000,
    Cleric: 1500,
    'Magic-User': 2500,
    Thief: 1200,
    Paladin: 2750,
    Ranger: 2250,
    Druid: 2000,
    Illusionist: 2250,
    Assassin: 1500,
    Monk: 2250,
  };

  const multiplier = classMultipliers[primaryClass] || 2000;
  return multiplier * (currentLevel + 1);
}

/**
 * Check if character has enough XP to level up
 */
export function canLevelUp(character: Character): boolean {
  const xpNeeded = calculateXPForNextLevel(character);
  return character.experience.current >= xpNeeded;
}
