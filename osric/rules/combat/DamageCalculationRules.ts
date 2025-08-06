/**
 * DamageCalculationRules.ts - OSRIC Damage Calculation Rules
 *
 * Implements the complete OSRIC damage calculation system including:
 * - Weapon damage dice and modifiers
 * - Strength bonuses for melee attacks
 * - Critical hit damage multiplication
 * - Magic weapon bonuses
 * - Large creature damage adjustments
 * - Subdual damage mechanics
 *
 * PRESERVATION: All OSRIC damage formulas and mechanics preserved exactly.
 */

import type { Command } from '@osric/core/Command';
import { rollExpression } from '@osric/core/Dice';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import { COMMAND_TYPES } from '@osric/types/constants';
import type {
  Character as CharacterData,
  CombatResult,
  Monster as MonsterData,
  StatusEffect,
  Weapon,
} from '../../types/entities';

interface AttackContext {
  attacker: CharacterData | MonsterData;
  target: CharacterData | MonsterData;
  weapon?: Weapon;
  attackType?: string;
  situationalModifiers?: number;
  isChargedAttack?: boolean;
  hitRoll?: number;
  isCriticalHit?: boolean;
}

export class DamageCalculationRule extends BaseRule {
  name = 'damage-calculation';

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const attackContext = context.getTemporary('attack-context') as AttackContext;

    if (!attackContext) {
      return this.createFailureResult('No attack context found');
    }

    const { attacker, target, weapon, attackType, isCriticalHit } = attackContext;

    // Calculate damage based on attack type
    let damage: number[];
    let combatResult: CombatResult;

    if (attackType === 'subdual') {
      damage = this.calculateSubdualDamage(attacker, target, weapon, isCriticalHit || false);
      combatResult = this.applySubdualDamage(attacker, target, damage, isCriticalHit || false);
    } else {
      damage = this.calculateDamage(attacker, target, weapon, isCriticalHit || false);
      combatResult = this.applyDamage(attacker, target, damage, isCriticalHit || false);
    }

    // Store results in context for further processing
    context.setTemporary('damage-result', combatResult);
    context.setTemporary('damage-values', damage);

    return this.createSuccessResult(
      `Damage calculated: ${damage.join(', ')} points`,
      undefined,
      undefined,
      damage
    );
  }

  canApply(context: GameContext, command: Command): boolean {
    if (command.type !== COMMAND_TYPES.ATTACK) return false;

    const attackContext = context.getTemporary('attack-context') as AttackContext;
    return Boolean(attackContext && attackContext.hitRoll !== undefined);
  }

  /**
   * Calculate the damage of an attack
   */
  private calculateDamage(
    attacker: CharacterData | MonsterData,
    target: CharacterData | MonsterData,
    weapon?: Weapon,
    isCritical = false
  ): number[] {
    // Determine base damage
    let damageRoll: number;

    if (weapon) {
      // Use weapon damage
      damageRoll = rollExpression(weapon.damage);

      // If attacking a large creature and weapon has special damage, use it
      if (
        'size' in target &&
        ['Large', 'Huge', 'Gargantuan'].includes(target.size) &&
        weapon.damageVsLarge
      ) {
        damageRoll = rollExpression(weapon.damageVsLarge);
      }
    } else if ('damagePerAttack' in attacker && attacker.damagePerAttack.length > 0) {
      // Monster natural attack
      damageRoll = rollExpression(attacker.damagePerAttack[0]);
    } else {
      // Unarmed damage (1d2)
      damageRoll = rollExpression('1d2');
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
  }

  /**
   * Apply damage to a target and generate combat result
   */
  private applyDamage(
    attacker: CharacterData | MonsterData,
    target: CharacterData | MonsterData,
    damage: number[],
    isCritical = false
  ): CombatResult {
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

    if (isDead) {
      message += ` ${target.name} is dead!`;
      statusEffects.push({
        name: 'Dead',
        duration: -1, // Permanent
        effect: 'Character is dead',
        savingThrow: null,
        endCondition: 'Resurrection or similar magic',
      });
    }

    return {
      hit: true,
      damage,
      critical: isCritical,
      message,
      specialEffects: statusEffects.length > 0 ? statusEffects : null,
    };
  }

  /**
   * Handle subdual damage (non-lethal damage)
   */
  private calculateSubdualDamage(
    attacker: CharacterData | MonsterData,
    target: CharacterData | MonsterData,
    weapon?: Weapon,
    isCritical = false
  ): number[] {
    // Calculate damage normally
    const damage = this.calculateDamage(attacker, target, weapon, isCritical);

    // Split into real and subdual damage
    // In OSRIC, half is real damage and half is subdual
    const realDamage = Math.floor(damage[0] / 2);
    const subdualDamage = Math.ceil(damage[0] / 2);

    return [realDamage, subdualDamage];
  }

  /**
   * Apply subdual damage to a target
   */
  private applySubdualDamage(
    attacker: CharacterData | MonsterData,
    target: CharacterData | MonsterData,
    damage: number[],
    isCritical = false
  ): CombatResult {
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
  }
}
