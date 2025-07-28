import type { Character, CombatResult, Monster, Weapon } from '@rules/types';
import { attackRoll } from './attackRoll';

/**
 * Checks if a weapon can be used as an off-hand weapon
 * In OSRIC, only daggers and hand axes can be used as off-hand weapons
 */
export const canBeUsedOffhand = (weapon: Weapon): boolean => {
  return ['Dagger', 'Hand Axe'].includes(weapon.name);
};

/**
 * Calculate penalties for two-weapon fighting
 */
export const getTwoWeaponPenalties = (
  character: Character
): {
  mainHandPenalty: number;
  offHandPenalty: number;
} => {
  // Base penalties
  let mainHandPenalty = -2;
  let offHandPenalty = -4;

  // Apply dexterity missile modifier to both attacks
  if (character.abilityModifiers.dexterityMissile) {
    mainHandPenalty += character.abilityModifiers.dexterityMissile;
    offHandPenalty += character.abilityModifiers.dexterityMissile;
  }

  // Penalties cannot result in bonuses (minimum penalty is 0)
  mainHandPenalty = Math.min(0, mainHandPenalty);
  offHandPenalty = Math.min(0, offHandPenalty);

  return {
    mainHandPenalty,
    offHandPenalty,
  };
};

/**
 * Executes a two-weapon attack and returns both results
 */
export const resolveTwoWeaponAttack = (
  attacker: Character,
  target: Character | Monster,
  mainHandWeapon: Weapon,
  offHandWeapon: Weapon,
  situationalModifiers = 0
): { mainHandResult: CombatResult; offHandResult: CombatResult } => {
  // Validate that off-hand weapon can be used as such
  if (!canBeUsedOffhand(offHandWeapon)) {
    return {
      mainHandResult: attackRoll(attacker, target, mainHandWeapon, situationalModifiers),
      offHandResult: {
        hit: false,
        damage: [],
        critical: false,
        message: `${attacker.name} attempted to use ${offHandWeapon.name} as an off-hand weapon, which is not allowed.`,
        specialEffects: null,
      },
    };
  }

  // Calculate two-weapon fighting penalties
  const { mainHandPenalty, offHandPenalty } = getTwoWeaponPenalties(attacker);

  // Execute main hand attack with penalty
  const mainHandResult = attackRoll(
    attacker,
    target,
    mainHandWeapon,
    situationalModifiers + mainHandPenalty
  );

  // Add context to the message
  mainHandResult.message = `Main hand (${mainHandWeapon.name}): ${mainHandResult.message}`;

  // Check if target is still alive after main hand attack
  if ('hitPoints' in target && target.hitPoints.current <= 0) {
    return {
      mainHandResult,
      offHandResult: {
        hit: false,
        damage: [],
        critical: false,
        message: 'Off hand attack not needed as target was defeated by main hand attack.',
        specialEffects: null,
      },
    };
  }

  // Execute off-hand attack with penalty
  const offHandResult = attackRoll(
    attacker,
    target,
    offHandWeapon,
    situationalModifiers + offHandPenalty
  );

  // Add context to the message
  offHandResult.message = `Off hand (${offHandWeapon.name}): ${offHandResult.message}`;

  return {
    mainHandResult,
    offHandResult,
  };
};
