import type { Armor, Character, Monster } from '@rules/types';

/**
 * Shield types
 */
export enum ShieldType {
  SMALL = 'small', // Buckler
  MEDIUM = 'medium', // Standard shield
  LARGE = 'large', // Tower shield
}

/**
 * Interface for shield protection parameters
 */
export interface ShieldProtection {
  acBonus: number;
  protectsAgainstMultipleAttackers: boolean;
  canBeSacrificed: boolean;
  coverPercentage: number;
}

/**
 * Get the details of a shield's protection
 */
export const getShieldProtection = (shield: Armor): ShieldProtection => {
  // Default values
  let acBonus = 1;
  let protectsAgainstMultipleAttackers = false;
  const canBeSacrificed = true;
  let coverPercentage = 25;

  // Check for shield type
  if (shield.name.toLowerCase().includes('buckler')) {
    acBonus = 1;
    protectsAgainstMultipleAttackers = false;
    coverPercentage = 15;
  } else if (
    shield.name.toLowerCase().includes('large') ||
    shield.name.toLowerCase().includes('tower')
  ) {
    acBonus = 1;
    protectsAgainstMultipleAttackers = true;
    coverPercentage = 40;
  } else {
    // Standard shield
    acBonus = 1;
    protectsAgainstMultipleAttackers = false;
    coverPercentage = 25;
  }

  // Magic shield bonuses
  if (shield.magicBonus) {
    acBonus += shield.magicBonus;
  }

  return {
    acBonus,
    protectsAgainstMultipleAttackers,
    canBeSacrificed,
    coverPercentage,
  };
};

/**
 * Check if a shield provides AC bonus against a specific attack.
 * (shields don't protect against rear attacks).
 */
export const shieldProtectsAgainstAttack = (
  attackFromFront = true,
  attackFromFlank = false
): boolean => {
  // Shields only work against frontal attacks
  return attackFromFront && !attackFromFlank;
};

/**
 * Apply shield AC bonus based on attack direction
 */
export const applyShieldBonus = (
  shield: Armor,
  attackFromFront = true,
  attackFromFlank = false
): number => {
  if (shieldProtectsAgainstAttack(attackFromFront, attackFromFlank)) {
    const { acBonus } = getShieldProtection(shield);
    return acBonus;
  }

  return 0;
};

/**
 * Check if a shield can protect against multiple attackers
 * Useful when determining which attackers gain flanking advantage
 */
export const shieldProtectsAgainstMultiple = (shield: Armor): boolean => {
  const { protectsAgainstMultipleAttackers } = getShieldProtection(shield);
  return protectsAgainstMultipleAttackers;
};

/**
 * Sacrifice shield to absorb an attack
 * Returns the result of the sacrifice
 */
export const sacrificeShield = (
  defender: Character,
  shield: Armor,
  damageAmount: number
): {
  shieldDestroyed: boolean;
  damageAbsorbed: number;
  message: string;
} => {
  const { canBeSacrificed } = getShieldProtection(shield);

  if (!canBeSacrificed) {
    return {
      shieldDestroyed: false,
      damageAbsorbed: 0,
      message: `${defender.name}'s ${shield.name} cannot be sacrificed to absorb damage.`,
    };
  }

  // Magical shields are more durable
  const shieldHP = (shield.magicBonus || 0) * 10 + 10;

  // Shield absorbs up to its HP in damage
  const damageAbsorbed = Math.min(damageAmount, shieldHP);

  // Check if shield is destroyed
  const shieldDestroyed = damageAbsorbed >= shieldHP;

  return {
    shieldDestroyed,
    damageAbsorbed,
    message: shieldDestroyed
      ? `${defender.name} sacrifices ${shield.name} to absorb ${damageAbsorbed} damage. The shield is destroyed!`
      : `${defender.name} uses ${shield.name} to absorb ${damageAbsorbed} damage. The shield is damaged but still usable.`,
  };
};
