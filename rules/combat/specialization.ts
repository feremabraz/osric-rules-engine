import type { Character, CharacterClass, Weapon } from '@rules/types';

/**
 * Weapon specialization levels
 */
export enum SpecializationLevel {
  NONE = 0,
  SPECIALIZED = 1,
  DOUBLE_SPECIALIZED = 2,
}

/**
 * Weapon specialization interface
 */
export interface WeaponSpecialization {
  weaponName: string;
  level: SpecializationLevel;
}

/**
 * Check if a character is specialized with a particular weapon
 */
export const isSpecializedWith = (
  character: Character,
  weaponName: string
): SpecializationLevel => {
  // Return NONE if character has no specializations
  if (!character.weaponSpecializations) return SpecializationLevel.NONE;

  // Find the specialization for this weapon
  const spec = character.weaponSpecializations.find(
    (s) => s.weaponName.toLowerCase() === weaponName.toLowerCase()
  );

  // Return the level or NONE if not found
  return spec ? spec.level : SpecializationLevel.NONE;
};

/**
 * Get to-hit bonus from weapon specialization
 */
export const getSpecializationHitBonus = (character: Character, weapon: Weapon): number => {
  const specLevel = isSpecializedWith(character, weapon.name);

  if (specLevel === SpecializationLevel.SPECIALIZED) {
    return 1; // +1 to hit for regular specialization
  }

  if (specLevel === SpecializationLevel.DOUBLE_SPECIALIZED) {
    return 3; // +3 to hit for double specialization
  }

  return 0; // No bonus for unspecialized
};

/**
 * Get damage bonus from weapon specialization
 */
export const getSpecializationDamageBonus = (character: Character, weapon: Weapon): number => {
  const specLevel = isSpecializedWith(character, weapon.name);

  if (specLevel === SpecializationLevel.SPECIALIZED) {
    if (weapon.type === 'Melee') {
      return 2; // +2 damage for melee specialization
    }
    return 1; // +1 damage for ranged specialization
  }
  if (specLevel === SpecializationLevel.DOUBLE_SPECIALIZED) {
    return 3; // +3 damage for double specialization (melee only)
  }

  return 0; // No bonus for unspecialized
};

/**
 * Calculate the number of attacks per round based on character level
 * and weapon specialization
 */
export const calculateAttacksPerRound = (
  character: Character,
  weapon: Weapon,
  againstLessThan1HD = false
): number => {
  // Check if character is a fighter (or subclass)
  const isFighterClass = ['Fighter', 'Paladin', 'Ranger'].includes(character.class);

  if (!isFighterClass) {
    return 1; // Non-fighters always get 1 attack
  }

  // Special case: Fighters vs. creatures with less than 1 HD
  if (againstLessThan1HD) {
    return character.level;
  }

  // Note: This calculation is now handled by the table lookup below

  // Get level tier (0: levels 1-6, 1: levels 7-12, 2: levels 13+)
  const levelTier = character.level >= 13 ? 2 : character.level >= 7 ? 1 : 0;

  // Check for weapon specialization bonus attacks
  const specLevel = isSpecializedWith(character, weapon.name);

  // Attack rates table indexed by [specializationLevel][levelTier]
  const attacksTable = [
    // NONE (unspecialized)
    [1, 1.5, 2],
    // SPECIALIZED
    [1.5, 2, 2.5], // 3/2, 2, 5/2 attacks
    // DOUBLE_SPECIALIZED
    [2, 2.5, 3], // 2, 5/2, 3 attacks
  ];

  // Look up attacks from the table
  return attacksTable[specLevel][levelTier];
};

/**
 * Check if a character can specialize in a weapon
 */
export const canSpecializeIn = (character: Character, weapon: Weapon): boolean => {
  // Only fighters and their subclasses can specialize
  const specializationClasses: CharacterClass[] = ['Fighter', 'Paladin', 'Ranger'];

  // Check if character is a valid class for specialization
  if (!specializationClasses.includes(character.class)) {
    return false;
  }

  // Check if the character is proficient with the weapon
  const isProficient = character.proficiencies.some(
    (p) => p.weapon.toLowerCase() === weapon.name.toLowerCase()
  );

  return isProficient;
};

/**
 * Check if a weapon is eligible for double specialization
 */
export const canDoubleSpecialize = (weapon: Weapon): boolean => {
  // Double specialization is only allowed for melee weapons
  // excluding polearms and two-handed swords
  if (weapon.type !== 'Melee') {
    return false;
  }

  // Exclude two-handed weapons like polearms and two-handed swords
  if (weapon.twoHanded) {
    return false;
  }

  return true;
};

/**
 * Cost in weapon proficiency slots for specialization
 */
export const specializationSlotCost = (weapon: Weapon): number => {
  if (weapon.type === 'Melee' || weapon.name.toLowerCase().includes('crossbow')) {
    return 1;
  }
  // Other missile weapons
  return 2;
};
