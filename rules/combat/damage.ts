import { rollDiceDamage } from '@rules/combat/attackRoll';
import { processDeath } from '@rules/combat/death';
import type { Character, CombatResult, Monster, StatusEffect, Weapon } from '@rules/types';

/**
 * Calculate the damage of an attack
 */
export const calculateDamage = (
  attacker: Character | Monster,
  target: Character | Monster,
  weapon?: Weapon,
  isCritical = false
): number[] => {
  // Determine base damage
  let damageRoll: number;

  if (weapon) {
    // Use weapon damage
    damageRoll = rollDiceDamage(weapon.damage);

    // If attacking a large creature and weapon has special damage, use it
    if (
      'size' in target &&
      ['Large', 'Huge', 'Gargantuan'].includes(target.size) &&
      weapon.damageVsLarge
    ) {
      damageRoll = rollDiceDamage(weapon.damageVsLarge);
    }
  } else if ('damagePerAttack' in attacker && attacker.damagePerAttack.length > 0) {
    // Monster natural attack
    damageRoll = rollDiceDamage(attacker.damagePerAttack[0]);
  } else {
    // Unarmed damage (1d2)
    damageRoll = rollDiceDamage('1d2');
  }

  // Apply strength bonus to melee damage if attacker is a Character
  let damageModifier = 0;
  if (
    (!weapon || weapon?.type === 'Melee') &&
    'abilities' in attacker &&
    attacker.abilityModifiers.strengthDamageAdj
  ) {
    damageModifier += attacker.abilityModifiers.strengthDamageAdj;
  }

  // Apply weapon's magic bonus if any
  if (weapon?.magicBonus) {
    damageModifier += weapon.magicBonus;
  }

  // Apply critical hit bonus
  if (isCritical) {
    // Critical hit doubles the dice roll but not the modifiers
    damageRoll *= 2;
  }

  // Ensure minimum damage of 1 if hit
  const totalDamage = Math.max(1, damageRoll + damageModifier);

  return [totalDamage];
};

/**
 * Apply damage to a target and generate combat result
 */
export const applyDamage = (
  attacker: Character | Monster,
  target: Character | Monster,
  damage: number[],
  isCritical = false
): CombatResult => {
  // Calculate total damage
  const totalDamage = damage.reduce((sum, dmg) => sum + dmg, 0);

  // Apply damage to target's hit points
  target.hitPoints.current = Math.max(0, target.hitPoints.current - totalDamage);

  // Check if target is unconscious or dead
  const isUnconscious = target.hitPoints.current === 0;
  const isDead = target.hitPoints.current <= -10;

  // Create status effects if any
  const statusEffects: StatusEffect[] = [];

  if (isUnconscious) {
    statusEffects.push({
      name: 'Unconscious',
      duration: 6, // Unconscious for 1-6 turns
      effect: 'Character is unconscious and bleeding',
      savingThrow: null,
      endCondition: 'When hit points rise above 0',
    });

    // Add bleeding status effect (will lose 1 hp per round)
    statusEffects.push({
      name: 'Bleeding',
      duration: 0, // Until healed
      effect: 'Losing 1 hp per round',
      savingThrow: null,
      endCondition: 'When healed above 0 hp or dies',
    });
  }

  // Generate message
  let message = `${attacker.name} ${isCritical ? 'critically ' : ''}hit ${target.name} for ${totalDamage} damage.`;

  if (isUnconscious) {
    message += ` ${target.name} is unconscious and bleeding!`;
  }

  // Handle death separately using our death system
  if (isDead) {
    // Process death with our death module
    const deathResult = processDeath(target);
    message += ` ${deathResult.message}`;

    // Add death status effects
    statusEffects.push(...deathResult.statusEffects);
  }

  return {
    hit: true,
    damage,
    critical: isCritical,
    message,
    specialEffects: statusEffects.length > 0 ? statusEffects : null,
  };
};

/**
 * Handle subdual damage (non-lethal damage)
 */
export const calculateSubdualDamage = (
  attacker: Character | Monster,
  target: Character | Monster,
  weapon?: Weapon,
  isCritical = false
): number[] => {
  // Calculate damage normally
  const damage = calculateDamage(attacker, target, weapon, isCritical);

  // Split into real and subdual damage
  // In OSRIC, half is real damage and half is subdual
  const realDamage = Math.floor(damage[0] / 2);
  const subdualDamage = Math.ceil(damage[0] / 2);

  return [realDamage, subdualDamage];
};

/**
 * Apply subdual damage to a target
 */
export const applySubdualDamage = (
  attacker: Character | Monster,
  target: Character | Monster,
  damage: number[],
  isCritical = false
): CombatResult => {
  if (damage.length < 2) {
    throw new Error('Subdual damage should contain both real and subdual components');
  }

  // First value is real damage, second is subdual
  const realDamage = damage[0];
  const subdualDamage = damage[1];

  // Apply real damage to target's hit points
  target.hitPoints.current = Math.max(0, target.hitPoints.current - realDamage);

  // Check if target is unconscious from real damage
  const isUnconscious = target.hitPoints.current === 0;

  // Create status effects
  const statusEffects: StatusEffect[] = [];

  if (isUnconscious) {
    statusEffects.push({
      name: 'Unconscious',
      duration: 6, // Unconscious for 1-6 turns
      effect: 'Character is unconscious and bleeding',
      savingThrow: null,
      endCondition: 'When hit points rise above 0',
    });
  }

  // Add subdual effect
  if (subdualDamage > 0) {
    statusEffects.push({
      name: 'Subdued',
      duration: subdualDamage, // Recover 1 per hour
      effect: 'Character has taken non-lethal damage',
      savingThrow: null,
      endCondition: 'Recovers 1 point per hour',
    });
  }

  // Generate message
  let message = `${attacker.name} ${isCritical ? 'critically ' : ''}hit ${target.name} for ${realDamage} real damage and ${subdualDamage} subdual damage.`;

  if (isUnconscious) {
    message += ` ${target.name} is unconscious!`;
  }

  return {
    hit: true,
    damage,
    critical: isCritical,
    message,
    specialEffects: statusEffects.length > 0 ? statusEffects : null,
  };
};
