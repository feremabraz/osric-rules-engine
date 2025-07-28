import type { AbilityScores, Character, CharacterClass, CharacterRace } from '@rules/types';
import {
  canRaceBeClass,
  getMaxLevelForRaceClass,
  meetsClassRequirements,
} from './classRequirements';
import { canMultiClass } from './multiClass';
import { type CharacterSecondarySkill, type SecondarySkill, SkillLevel } from './secondarySkills';

/**
 * Function to check if a character can choose a specific class
 */
export function canChooseClass(
  abilityScores: AbilityScores,
  race: CharacterRace,
  characterClass: CharacterClass
): { allowed: boolean; reason?: string } {
  // Check if race can be this class
  if (!canRaceBeClass(race, characterClass)) {
    return { allowed: false, reason: `${race} characters cannot be ${characterClass}s` };
  }

  // Check if character meets minimum ability scores
  if (!meetsClassRequirements(abilityScores, characterClass)) {
    return {
      allowed: false,
      reason: `Character does not meet the minimum ability score requirements for ${characterClass}`,
    };
  }

  return { allowed: true };
}

/**
 * Check if a character can be multi-classed with the given classes
 */
export function validateMultiClass(
  race: CharacterRace,
  classes: CharacterClass[],
  abilityScores: AbilityScores
): { valid: boolean; reason?: string } {
  // Check if multi-class is allowed for this race
  if (race === 'Human') {
    return { valid: false, reason: 'Humans cannot multi-class' };
  }

  // Check if this is a valid multi-class combination for the race
  if (!canMultiClass(race, classes)) {
    return {
      valid: false,
      reason: `${race} characters cannot multi-class with this combination of classes`,
    };
  }

  // Check if character meets requirements for all classes
  for (const characterClass of classes) {
    if (!meetsClassRequirements(abilityScores, characterClass)) {
      return {
        valid: false,
        reason: `Character does not meet the minimum ability score requirements for ${characterClass}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Adds a secondary skill to a character
 */
export function addSecondarySkill(
  character: Character,
  skill: SecondarySkill,
  level: SkillLevel = SkillLevel.Novice
): Character {
  return {
    ...character,
    secondarySkills: [...character.secondarySkills, { skill, level }],
  };
}

/**
 * Calculate character level based on experience and class(es)
 */
export function calculateLevel(character: Character): number {
  // For single-classed characters, just return their level
  if (character.primaryClass && Object.keys(character.classes).length === 1) {
    return character.level;
  }

  // For multi-classed characters, calculate average level
  let totalLevels = 0;
  let classCount = 0;

  for (const [, level] of Object.entries(character.classes)) {
    if (level) {
      totalLevels += level;
      classCount++;
    }
  }

  return Math.floor(totalLevels / Math.max(1, classCount));
}

/**
 * Check if a character has reached their racial level limit for a class
 */
export function hasReachedLevelLimit(
  character: Character,
  characterClass: CharacterClass
): boolean {
  const currentLevel = character.classes[characterClass] || 0;
  const maxLevel = getMaxLevelForRaceClass(character.race, characterClass);

  // -1 means unlimited advancement
  if (maxLevel === -1) {
    return false;
  }

  return currentLevel >= maxLevel;
}

/**
 * Validate character class setup
 * This function checks for errors in the character's class setup
 */
export function validateClassSetup(
  race: CharacterRace,
  abilityScores: AbilityScores,
  primaryClass?: CharacterClass,
  additionalClasses: CharacterClass[] = []
): string[] {
  const errors: string[] = [];
  const allClasses = primaryClass ? [primaryClass, ...additionalClasses] : additionalClasses;

  // Validate primary class
  if (primaryClass) {
    const validation = canChooseClass(abilityScores, race, primaryClass);
    if (!validation.allowed) {
      errors.push(validation.reason || 'Invalid primary class');
    }
  }

  // Validate additional classes and multi-classing
  if (additionalClasses.length > 0) {
    const validation = validateMultiClass(race, allClasses, abilityScores);
    if (!validation.valid) {
      errors.push(validation.reason || 'Invalid multi-class combination');
    }
  }

  return errors;
}
