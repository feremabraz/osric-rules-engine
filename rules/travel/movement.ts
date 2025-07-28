import type { Character, Item, WeaponSize } from '@rules/types';

/**
 * Encumbrance levels defined in kilograms
 */
export enum EncumbranceLevel {
  Unencumbered = 0,
  Light = 16, // 16 kg
  Moderate = 32, // 32 kg
  Heavy = 48, // 48 kg
  Severe = 68, // 68 kg
  Max = 104, // 104 kg (absolute maximum a character can carry)
}

/**
 * Movement rates in meters per turn (10 minutes) by encumbrance level
 */
export const MovementRateByEncumbrance: Record<string, number> = {
  [EncumbranceLevel.Unencumbered]: 36, // 36m per turn
  [EncumbranceLevel.Light]: 27, // 27m per turn
  [EncumbranceLevel.Moderate]: 18, // 18m per turn
  [EncumbranceLevel.Heavy]: 9, // 9m per turn
  [EncumbranceLevel.Severe]: 4.5, // 4.5m per turn
  [EncumbranceLevel.Max]: 3, // 3m per turn
};

/**
 * Movement rates in meters per combat round (1 minute) by encumbrance level
 */
export const CombatMovementRateByEncumbrance: Record<string, number> = {
  [EncumbranceLevel.Unencumbered]: 12, // 12m per round
  [EncumbranceLevel.Light]: 9, // 9m per round
  [EncumbranceLevel.Moderate]: 6, // 6m per round
  [EncumbranceLevel.Heavy]: 3, // 3m per round
  [EncumbranceLevel.Severe]: 1.5, // 1.5m per round
  [EncumbranceLevel.Max]: 1, // 1m per round
};

/**
 * Racial movement modifiers in meters
 */
export const RacialMovementModifiers: Record<string, number> = {
  Human: 0,
  Elf: 0,
  'Half-Elf': 0,
  Dwarf: -3, // -3m penalty
  Gnome: -3, // -3m penalty
  Halfling: -6, // -6m penalty
  'Half-Orc': 0,
};

/**
 * Calculate total weight carried by a character from inventory in kg
 */
export function calculateTotalWeight(inventory: Item[]): number {
  return inventory.reduce((total, item) => total + item.weight, 0);
}

/**
 * Calculate encumbrance level based on total weight and strength
 */
export function calculateEncumbranceLevel(totalWeight: number): EncumbranceLevel {
  if (totalWeight >= EncumbranceLevel.Max) {
    return EncumbranceLevel.Max;
  }
  if (totalWeight >= EncumbranceLevel.Severe) {
    return EncumbranceLevel.Severe;
  }
  if (totalWeight >= EncumbranceLevel.Heavy) {
    return EncumbranceLevel.Heavy;
  }
  if (totalWeight >= EncumbranceLevel.Moderate) {
    return EncumbranceLevel.Moderate;
  }
  if (totalWeight >= EncumbranceLevel.Light) {
    return EncumbranceLevel.Light;
  }
  return EncumbranceLevel.Unencumbered;
}

/**
 * Apply strength bonus to encumbrance limits in kg
 */
export function getStrengthEncumbranceBonus(strengthScore: number): number {
  if (strengthScore >= 18) return 22.7; // 22.7 kg bonus
  if (strengthScore >= 16) return 9.1; // 9.1 kg bonus
  if (strengthScore >= 13) return 4.5; // 4.5 kg bonus
  if (strengthScore <= 6) return -4.5; // 4.5 kg penalty
  if (strengthScore <= 8) return -2.3; // 2.3 kg penalty
  return 0;
}

/**
 * Calculate character's base movement rate considering encumbrance and race
 */
export function calculateMovementRate(character: Character): number {
  // Calculate total weight carried
  const totalWeight = calculateTotalWeight(character.inventory);

  // Apply strength bonus/penalty to effective weight
  const strengthBonus = getStrengthEncumbranceBonus(character.abilities.strength);
  const effectiveWeight = Math.max(0, totalWeight - strengthBonus);

  // Determine encumbrance level
  const encumbranceLevel = calculateEncumbranceLevel(effectiveWeight);

  // Get base movement rate from encumbrance
  const baseMovementRate = MovementRateByEncumbrance[encumbranceLevel];

  // Apply racial modifiers
  const racialModifier = RacialMovementModifiers[character.race] || 0;

  return baseMovementRate + racialModifier;
}

/**
 * Calculate combat movement rate (meters per round)
 */
export function calculateCombatMovementRate(character: Character): number {
  const totalWeight = calculateTotalWeight(character.inventory);
  const strengthBonus = getStrengthEncumbranceBonus(character.abilities.strength);
  const effectiveWeight = Math.max(0, totalWeight - strengthBonus);
  const encumbranceLevel = calculateEncumbranceLevel(effectiveWeight);

  return CombatMovementRateByEncumbrance[encumbranceLevel];
}

/**
 * Update character's encumbrance and movement rate
 */
export function updateEncumbranceAndMovement(character: Character): Character {
  const totalWeight = calculateTotalWeight(character.inventory);
  const strengthBonus = getStrengthEncumbranceBonus(character.abilities.strength);
  const effectiveWeight = Math.max(0, totalWeight - strengthBonus);

  return {
    ...character,
    encumbrance: effectiveWeight,
    movementRate: calculateMovementRate(character),
  };
}
