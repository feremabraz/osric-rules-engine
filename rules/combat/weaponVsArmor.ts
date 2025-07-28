import type { Armor, Character, Monster, Weapon } from '@rules/types';

// Define weapon vs armor adjustment types
type WeaponType = 'Slashing' | 'Piercing' | 'Bludgeoning';
type ArmorCategory =
  | 'Unarmored'
  | 'Padded/Leather'
  | 'StuddedLeather/Ring'
  | 'Scale/Chain'
  | 'Banded/Splint'
  | 'Plate';

/**
 * Weapon vs. Armor adjustments table (OSRIC)
 * This is a simplification of the optional rules from OSRIC
 * Numbers represent modifiers to attack rolls
 */
const WEAPON_VS_ARMOR_TABLE: Record<WeaponType, Record<ArmorCategory, number>> = {
  Slashing: {
    Unarmored: 0,
    'Padded/Leather': -1,
    'StuddedLeather/Ring': 0,
    'Scale/Chain': 0,
    'Banded/Splint': +1,
    Plate: +2,
  },
  Piercing: {
    Unarmored: 0,
    'Padded/Leather': +1,
    'StuddedLeather/Ring': 0,
    'Scale/Chain': -1,
    'Banded/Splint': -2,
    Plate: -3,
  },
  Bludgeoning: {
    Unarmored: 0,
    'Padded/Leather': 0,
    'StuddedLeather/Ring': +1,
    'Scale/Chain': +2,
    'Banded/Splint': 0,
    Plate: -1,
  },
};

/**
 * Map weapons to their damage type
 * This is a simplification and should be expanded with more weapons
 */
const WEAPON_DAMAGE_TYPES: Record<string, WeaponType> = {
  // Slashing weapons
  'Sword, Long': 'Slashing',
  'Sword, Short': 'Slashing',
  'Sword, Broad': 'Slashing',
  'Sword, Bastard': 'Slashing',
  'Sword, Two-Handed': 'Slashing',
  'Axe, Battle': 'Slashing',
  'Axe, Hand': 'Slashing',

  // Piercing weapons
  Dagger: 'Piercing',
  Spear: 'Piercing',
  Arrow: 'Piercing',
  Bolt: 'Piercing',
  Trident: 'Piercing',
  'Bow, Short': 'Piercing',

  // Bludgeoning weapons
  Mace: 'Bludgeoning',
  'Hammer, War': 'Bludgeoning',
  Club: 'Bludgeoning',
  Flail: 'Bludgeoning',
  'Morning Star': 'Bludgeoning',
  Staff: 'Bludgeoning',
};

/**
 * Map armor class to armor category
 * This is a simplification and may need adjustment
 */
const AC_TO_ARMOR_CATEGORY: Record<number, ArmorCategory> = {
  10: 'Unarmored', // AC 10 (no armor)
  9: 'Padded/Leather', // AC 9-8 (leather, padded)
  8: 'Padded/Leather',
  7: 'StuddedLeather/Ring', // AC 7 (studded leather, ring)
  6: 'StuddedLeather/Ring', // AC 6 (scale)
  5: 'Scale/Chain', // AC 5 (chain)
  4: 'Scale/Chain', // AC 4 (banded)
  3: 'Banded/Splint', // AC 3 (splint)
  2: 'Plate', // AC 2 (plate)
  1: 'Plate', // AC 1-0 (field plate)
  0: 'Plate',
};

/**
 * Get weapon vs. armor adjustment based on weapon and target's armor
 */
export const getWeaponVsArmorAdjustment = (weapon: Weapon, targetAC: number): number => {
  // Determine weapon damage type
  const weaponName = weapon.name;
  const damageType = WEAPON_DAMAGE_TYPES[weaponName] || 'Slashing'; // Default to slashing

  // Determine armor category based on AC
  // In OSRIC, lower AC is better (descending AC system)
  // Ensure AC is within valid range (0-10)
  const boundedAC = Math.min(Math.max(targetAC, 0), 10);
  const armorCategory = AC_TO_ARMOR_CATEGORY[boundedAC] || 'Unarmored';

  // Get adjustment from table
  return WEAPON_VS_ARMOR_TABLE[damageType][armorCategory];
};

/**
 * Apply weapon vs. armor adjustments to attack roll
 */
export const applyWeaponVsArmorAdjustment = (
  defender: Character | Monster,
  weapon?: Weapon
): number => {
  // If no weapon is specified, return 0 (no adjustment)
  if (!weapon) {
    return 0;
  }

  // Get target's AC
  const targetAC = defender.armorClass;

  // Get adjustment for this weapon vs. this armor
  return getWeaponVsArmorAdjustment(weapon, targetAC);
};
