import type { Character, Monster, Weapon, WeaponProficiency } from '@rules/types';

/**
 * Default non-proficiency penalties by character class
 * These values are based on OSRIC rules
 */
const NON_PROFICIENCY_PENALTIES: Record<string, number> = {
  Fighter: -2,
  Paladin: -2,
  Ranger: -2,
  'Magic-User': -5,
  Illusionist: -5,
  Cleric: -3,
  Druid: -3,
  Thief: -3,
  Assassin: -3,
};

/**
 * Get the non-proficiency penalty for a character
 */
export const getNonProficiencyPenalty = (characterClass: string): number => {
  return NON_PROFICIENCY_PENALTIES[characterClass] || -3; // Default to -3 if class not found
};

/**
 * Check if a character is proficient with a given weapon
 */
export const isCharacterProficientWithWeapon = (character: Character, weapon: Weapon): boolean => {
  if (!character.proficiencies || character.proficiencies.length === 0) {
    return false;
  }

  // Check if the character has a proficiency for this weapon
  return character.proficiencies.some((prof) => prof.weapon === weapon.name);
};

/**
 * Calculate proficiency bonus/penalty for weapon use
 * Returns 0 if proficient, or a negative penalty if not proficient
 */
export const calculateProficiencyModifier = (
  attacker: Character | Monster,
  weapon?: Weapon
): number => {
  // Monsters are always considered proficient with their natural weapons
  if (!('class' in attacker) || !weapon) {
    return 0;
  }

  // Check if character is proficient with this weapon
  const isProficient = isCharacterProficientWithWeapon(attacker, weapon);

  // If proficient, return 0 (no penalty)
  if (isProficient) {
    return 0;
  }

  // If not proficient, return penalty based on class
  // In case of multi-class, use the most favorable (least negative) penalty
  if (attacker.classes && Object.keys(attacker.classes).length > 0) {
    // For multi-class, get the lowest penalty
    return Object.keys(attacker.classes)
      .map(getNonProficiencyPenalty)
      .reduce((lowest, current) => (current > lowest ? current : lowest), -5);
  }

  // Single class character
  return getNonProficiencyPenalty(attacker.class);
};

/**
 * Handle specialization bonuses (optional OSRIC rule)
 * Fighter characters may specialize in weapons for bonuses
 */
export const calculateSpecializationBonus = (character: Character, weapon?: Weapon): number => {
  // Only fighters can specialize
  if (!weapon || character.class !== 'Fighter') {
    return 0;
  }

  // Check for weapon specialization (would require additional data structure)
  // This is a placeholder for a more complex implementation
  const specializations: Record<string, boolean> = {}; // Would come from character data

  if (specializations[weapon.name]) {
    return 1; // +1 to hit for specialized weapon
  }

  return 0;
};

/**
 * Apply all proficiency and specialization modifiers
 */
export const applyProficiencyModifiers = (
  attacker: Character | Monster,
  weapon?: Weapon
): number => {
  // Base modifier starts at 0
  let modifier = 0;

  // Only apply to characters, not monsters
  if (!('class' in attacker)) {
    return 0;
  }

  // Add proficiency modifier (0 or negative penalty)
  modifier += calculateProficiencyModifier(attacker, weapon);

  // Add specialization bonus (if applicable)
  modifier += calculateSpecializationBonus(attacker, weapon);

  return modifier;
};
