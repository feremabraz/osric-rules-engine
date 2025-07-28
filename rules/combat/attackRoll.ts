import type {
  ActionResult,
  Character,
  CombatResult,
  DiceRoll,
  Monster,
  Weapon,
} from '@rules/types';
import { roll, rollFromNotation, sumDice } from '@rules/utils/dice';

/**
 * Calculate if an attack hits based on THAC0 and target's AC
 * In OSRIC/AD&D, lower AC is better, and THAC0 is "To Hit Armor Class 0"
 * To determine if an attack hits: attacker's THAC0 - target's AC = number needed on d20
 */
export const resolveAttackRoll = (
  attacker: Character | Monster,
  target: Character | Monster,
  attackRoll: number
): boolean => {
  // Get the attacker's THAC0
  const thac0 = attacker.thac0;

  // Get target's AC
  const targetAC = target.armorClass;

  // Calculate the number needed to hit
  const numberNeededToHit = thac0 - targetAC;

  // Attack hits if the roll is >= the number needed
  return attackRoll >= numberNeededToHit;
};

/**
 * Calculate the attack roll with all modifiers
 */
export const calculateAttackRoll = (
  attacker: Character | Monster,
  weaponUsed?: Weapon,
  modifiers = 0
): number => {
  // Base roll is d20
  const baseRoll = roll(20);

  // Apply strength bonus for melee attacks if attacker is a Character
  let totalModifier = modifiers;

  if (
    weaponUsed?.type === 'Melee' &&
    'abilities' in attacker &&
    attacker.abilityModifiers.strengthHitAdj
  ) {
    totalModifier += attacker.abilityModifiers.strengthHitAdj;
  }

  // Apply dexterity bonus for ranged attacks if attacker is a Character
  if (
    weaponUsed?.type === 'Ranged' &&
    'abilities' in attacker &&
    attacker.abilityModifiers.dexterityMissile
  ) {
    totalModifier += attacker.abilityModifiers.dexterityMissile;
  }

  // Apply weapon's magic bonus if any
  if (weaponUsed?.magicBonus) {
    totalModifier += weaponUsed.magicBonus;
  }

  // Return the total roll
  return baseRoll + totalModifier;
};

/**
 * The main function to determine attack outcomes
 */
export const attackRoll = (
  attacker: Character | Monster,
  target: Character | Monster,
  weaponUsed?: Weapon,
  situationalModifiers = 0
): CombatResult => {
  // Calculate attack roll
  const attackRollValue = calculateAttackRoll(attacker, weaponUsed, situationalModifiers);

  // Record the natural roll (before modifiers) for critical hit detection
  const naturalRoll = attackRollValue - situationalModifiers;
  let adjustedNaturalRoll = naturalRoll;
  if (weaponUsed?.magicBonus) {
    adjustedNaturalRoll -= weaponUsed.magicBonus;
  }
  if ('abilities' in attacker) {
    if (weaponUsed?.type === 'Melee' && attacker.abilityModifiers.strengthHitAdj) {
      adjustedNaturalRoll -= attacker.abilityModifiers.strengthHitAdj;
    }
    if (weaponUsed?.type === 'Ranged' && attacker.abilityModifiers.dexterityMissile) {
      adjustedNaturalRoll -= attacker.abilityModifiers.dexterityMissile;
    }
  }

  // Determine if the attack hits
  const hit = resolveAttackRoll(attacker, target, attackRollValue);

  // If the attack doesn't hit, return early
  if (!hit) {
    return {
      hit: false,
      damage: [],
      critical: false,
      message: `${attacker.name}'s attack missed ${target.name}.`,
      specialEffects: null,
    };
  }

  // If hit, calculate damage
  // For now, using a simple approach - this will be expanded with the damage.ts file
  const damageResults = weaponUsed ? rollFromNotation(weaponUsed.damage) : rollFromNotation('1d2'); // Unarmed damage

  // Calculate total base damage
  const baseDamage = damageResults.total;

  // Apply strength bonus for melee attacks if attacker is a Character
  let damageModifier = 0;
  if (
    weaponUsed?.type === 'Melee' &&
    'abilities' in attacker &&
    attacker.abilityModifiers.strengthDamageAdj
  ) {
    damageModifier += attacker.abilityModifiers.strengthDamageAdj;
  }

  // Apply weapon's magic bonus if any
  if (weaponUsed?.magicBonus) {
    damageModifier += weaponUsed.magicBonus;
  }

  // Ensure minimum damage of 1 if hit
  const totalDamage = Math.max(1, baseDamage + damageModifier);

  // Check for critical hit (natural 20) - simple implementation for now
  const critical = adjustedNaturalRoll === 20;

  return {
    hit: true,
    damage: [totalDamage],
    critical,
    message: `${attacker.name} ${critical ? 'critically ' : ''}hit ${target.name} for ${totalDamage} damage.`,
    specialEffects: null,
  };
};

/**
 * Helper function to roll damage based on damage string (e.g. "1d8")
 */
export const rollDiceDamage = (damageStr: string): number => {
  const damageResults = rollFromNotation(damageStr);
  return damageResults.total;
};
