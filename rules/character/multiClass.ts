import type { AbilityScores, CharacterClass, CharacterRace } from '@rules/types';
import { meetsClassRequirements } from './classRequirements';

/**
 * Valid multi-class combinations by race according to OSRIC rules
 */
export const VALID_MULTICLASS_COMBINATIONS: Record<CharacterRace, CharacterClass[][]> = {
  Dwarf: [['Fighter', 'Thief']],
  Elf: [
    ['Fighter', 'Magic-User'],
    ['Fighter', 'Thief'],
    ['Magic-User', 'Thief'],
    ['Fighter', 'Magic-User', 'Thief'],
  ],
  Gnome: [
    ['Fighter', 'Illusionist'],
    ['Fighter', 'Thief'],
    ['Illusionist', 'Thief'],
  ],
  'Half-Elf': [
    ['Cleric', 'Fighter'],
    ['Cleric', 'Ranger'],
    ['Cleric', 'Magic-User'],
    ['Fighter', 'Magic-User'],
    ['Fighter', 'Thief'],
    ['Magic-User', 'Thief'],
    ['Cleric', 'Fighter', 'Magic-User'],
    ['Fighter', 'Magic-User', 'Thief'],
  ],
  Halfling: [['Fighter', 'Thief']],
  'Half-Orc': [
    ['Cleric', 'Fighter'],
    ['Cleric', 'Thief'],
    ['Cleric', 'Assassin'],
    ['Fighter', 'Thief'],
    ['Fighter', 'Assassin'],
  ],
  // Humans can dual-class but not multi-class
  Human: [],
};

/**
 * Special multi-class restrictions based on OSRIC rules
 */
export const MULTICLASS_RESTRICTIONS: Record<CharacterRace, string> = {
  Dwarf: 'The more restrictive of any two class requirements apply for the use of class abilities.',
  Elf: 'The less restrictive of any two class requirements apply, except that thieving abilities can only be used while wearing armor permitted to thieves.',
  Gnome: 'Multi-classed gnomish characters may wear only leather armor, no better.',
  'Half-Elf':
    'The less restrictive of any class requirements apply, except that thieving abilities can only be used while wearing armor permitted to thieves.',
  Halfling: 'Use of thieving abilities is only possible when wearing armor permitted to thieves.',
  'Half-Orc':
    'For armor, the more restrictive of any two class requirements apply. For weapons, the less restrictive requirements apply.',
  Human:
    'Humans cannot multi-class, but may dual-class after reaching at least 2nd level in their original class.',
};

/**
 * Checks if a character can multi-class with the given classes
 */
export function canMultiClass(race: CharacterRace, classes: CharacterClass[]): boolean {
  // Humans cannot multi-class
  if (race === 'Human') {
    return false;
  }

  // Must have at least 2 classes for multi-classing
  if (classes.length < 2) {
    return false;
  }

  // Find if this combination exists in valid combinations
  const validCombos = VALID_MULTICLASS_COMBINATIONS[race];

  return validCombos.some((combo) => {
    // Check if the classes array has the same length and contains all the same classes
    if (combo.length !== classes.length) {
      return false;
    }

    // Check if all classes from the combination are in the provided classes
    return combo.every((c) => classes.includes(c));
  });
}

/**
 * Determines if a human character can dual-class from original to new class
 */
export function canDualClass(
  originalClass: CharacterClass,
  newClass: CharacterClass,
  originalLevel: number,
  abilityScores: AbilityScores
): boolean {
  // Only humans can dual-class

  // Must be at least level 2 in original class
  if (originalLevel < 2) {
    return false;
  }

  // Cannot dual-class to the same class
  if (originalClass === newClass) {
    return false;
  }

  // Must meet ability score requirements for both classes
  if (
    !meetsClassRequirements(abilityScores, originalClass) ||
    !meetsClassRequirements(abilityScores, newClass)
  ) {
    return false;
  }

  // Specific score requirements for dual-classing
  // Original class req: 15+ in prime requisite
  // New class req: 17+ in prime requisite
  // These would be checked based on class prime requisites

  return true;
}

/**
 * Calculate experience distribution for multi-classed characters
 */
export function distributeExperience(
  totalXP: number,
  classes: CharacterClass[]
): Record<CharacterClass, number> {
  const distribution: Partial<Record<CharacterClass, number>> = {};

  // Divide XP evenly among all classes
  const xpPerClass = Math.floor(totalXP / classes.length);

  for (const characterClass of classes) {
    distribution[characterClass] = xpPerClass;
  }

  return distribution as Record<CharacterClass, number>;
}
