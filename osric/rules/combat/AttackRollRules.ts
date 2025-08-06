/**
 * AttackRollRules - OSRIC Attack Resolution Rules
 *
 * Migrated from rules/combat/attackRoll.ts
 * PRESERVATION: All OSRIC THAC0 calculations and attack mechanics preserved exactly
 */

import type { Command } from '@osric/core/Command';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';
import type {
  Character as CharacterData,
  Monster as MonsterData,
  Weapon,
} from '@osric/types/entities';

interface AttackContext {
  attacker: CharacterData | MonsterData;
  target: CharacterData | MonsterData;
  weapon?: Weapon;
  situationalModifiers: number;
  attackType: 'normal' | 'subdual' | 'grapple';
  isChargedAttack: boolean;
}

interface AttackRollResult {
  naturalRoll: number;
  modifiers: number;
  totalAttackRoll: number;
  targetNumber: number;
  hit: boolean;
  critical: boolean;
  criticalMiss: boolean;
  weapon?: Weapon;
}

export class AttackRollRule extends BaseRule {
  readonly name = RULE_NAMES.ATTACK_ROLL;
  readonly priority = 10; // Execute first in attack chain

  canApply(context: GameContext, command: Command): boolean {
    return command.type === COMMAND_TYPES.ATTACK && context.getTemporary('attack-context') !== null;
  }

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const attackContext = context.getTemporary('attack-context') as AttackContext;

    if (!attackContext) {
      return this.createFailureResult('No attack context found');
    }

    try {
      const { attacker, target, weapon, situationalModifiers, isChargedAttack } = attackContext;

      // Roll d20 for attack
      const naturalRoll = this.rollD20();

      // Calculate attack modifiers
      const modifiers = this.calculateAttackModifiers(
        attacker,
        weapon,
        situationalModifiers,
        isChargedAttack
      );

      // Total attack roll
      const totalAttackRoll = naturalRoll + modifiers;

      // Calculate target number using THAC0 - PRESERVE OSRIC FORMULA
      const targetNumber = this.calculateTargetNumber(attacker, target);

      // Determine if attack hits
      const hit = totalAttackRoll >= targetNumber;

      // Check for critical hit (natural 20)
      const critical = naturalRoll === 20;

      // Check for critical miss (natural 1)
      const criticalMiss = naturalRoll === 1;

      // Store attack roll results for next rules
      const attackRollResult: AttackRollResult = {
        naturalRoll,
        modifiers,
        totalAttackRoll,
        targetNumber,
        hit: hit || critical, // Natural 20 always hits
        critical,
        criticalMiss,
        weapon,
      };

      context.setTemporary('attack-roll-result', attackRollResult);

      const message = hit
        ? `Attack ${critical ? '(critical!) ' : ''}hits! Roll: ${totalAttackRoll} vs target: ${targetNumber}`
        : `Attack misses${criticalMiss ? ' (critical miss!)' : ''}. Roll: ${totalAttackRoll} vs target: ${targetNumber}`;

      return this.createSuccessResult(message);
    } catch (error) {
      return this.createFailureResult(
        `Attack roll failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Calculate THAC0-based target number - PRESERVE OSRIC FORMULA
   * Formula: attacker's THAC0 - target's AC = number needed on d20
   */
  private calculateTargetNumber(
    attacker: CharacterData | MonsterData,
    target: CharacterData | MonsterData
  ): number {
    const attackerThac0 = attacker.thac0;
    const targetAC = target.armorClass;

    // OSRIC THAC0 Formula: THAC0 - AC = target number
    const targetNumber = attackerThac0 - targetAC;

    return targetNumber;
  }

  /**
   * Calculate all attack modifiers - PRESERVE OSRIC BONUSES
   */
  private calculateAttackModifiers(
    attacker: CharacterData | MonsterData,
    weapon?: Weapon,
    situationalModifiers = 0,
    isChargedAttack = false
  ): number {
    let totalModifier = situationalModifiers;

    // Apply ability modifiers for characters
    if ('abilityModifiers' in attacker) {
      // Strength bonus for melee attacks
      if ((!weapon || weapon.type === 'Melee') && attacker.abilityModifiers.strengthHitAdj) {
        totalModifier += attacker.abilityModifiers.strengthHitAdj;
      }

      // Dexterity bonus for ranged attacks
      if (weapon?.type === 'Ranged' && attacker.abilityModifiers.dexterityMissile) {
        totalModifier += attacker.abilityModifiers.dexterityMissile;
      }
    }

    // Apply weapon magic bonus
    if (weapon?.magicBonus) {
      totalModifier += weapon.magicBonus;
    }

    // Apply charge attack bonus (mounted combat)
    if (isChargedAttack) {
      totalModifier += 2; // OSRIC charge attack bonus
    }

    // Apply weapon specialization bonuses (if character has them)
    if ('weaponSpecializations' in attacker && weapon && attacker.weaponSpecializations) {
      const specialization = attacker.weaponSpecializations.find(
        (spec) => spec.weapon === weapon.name
      );
      if (specialization?.bonuses.hitBonus) {
        totalModifier += specialization.bonuses.hitBonus;
      }
    }

    return totalModifier;
  }

  /**
   * Roll a d20 for attack
   */
  private rollD20(): number {
    return Math.floor(Math.random() * 20) + 1;
  }
}

export class DamageCalculationRule extends BaseRule {
  readonly name = RULE_NAMES.DAMAGE_CALCULATION;
  readonly priority = 20; // Execute after attack roll

  canApply(context: GameContext, command: Command): boolean {
    return (
      command.type === COMMAND_TYPES.ATTACK &&
      context.getTemporary('attack-context') !== null &&
      context.getTemporary('attack-roll-result') !== null
    );
  }

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const attackContext = context.getTemporary('attack-context') as AttackContext;
    const attackRollResult = context.getTemporary('attack-roll-result') as AttackRollResult;

    if (!attackContext || !attackRollResult) {
      return this.createFailureResult('Missing attack context or attack roll result');
    }

    // Only calculate damage if attack hit
    if (!attackRollResult.hit) {
      context.setTemporary('damage-result', { damage: [], totalDamage: 0 });
      return this.createSuccessResult('No damage - attack missed');
    }

    try {
      const { attacker, attackType } = attackContext;
      const { weapon, critical } = attackRollResult;

      // Calculate base damage
      const damage = this.calculateBaseDamage(attacker, weapon, critical, attackType);

      // Apply damage modifiers
      const modifiedDamage = this.applyDamageModifiers(attacker, weapon, damage);

      // Ensure minimum damage of 1 if attack hit
      const finalDamage = Math.max(1, modifiedDamage);

      const damageResult = {
        damage: [finalDamage],
        totalDamage: finalDamage,
        critical,
        damageType: attackType,
      };

      context.setTemporary('damage-result', damageResult);

      const message = critical
        ? `Critical hit! ${finalDamage} damage dealt`
        : `${finalDamage} damage dealt`;

      return this.createSuccessResult(message);
    } catch (error) {
      return this.createFailureResult(
        `Damage calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Calculate base weapon or natural damage - PRESERVE OSRIC DAMAGE DICE
   */
  private calculateBaseDamage(
    attacker: CharacterData | MonsterData,
    weapon?: Weapon,
    critical = false,
    attackType = 'normal'
  ): number {
    let baseDamage: number;

    if (weapon) {
      // Use weapon damage
      baseDamage = this.rollDamage(weapon.damage);

      // Check for damage vs large creatures
      // This would require target size checking - placeholder for now
      // if (target.size in ['Large', 'Huge', 'Gargantuan'] && weapon.damageVsLarge) {
      //   baseDamage = this.rollDamage(weapon.damageVsLarge);
      // }
    } else if ('damagePerAttack' in attacker && attacker.damagePerAttack.length > 0) {
      // Monster natural attack
      baseDamage = this.rollDamage(attacker.damagePerAttack[0]);
    } else {
      // Unarmed damage (1d2 for characters, 1d3 for larger creatures)
      baseDamage = this.rollDamage('1d2');
    }

    // Apply critical hit multiplier - OSRIC: double the dice roll
    if (critical && attackType === 'normal') {
      baseDamage *= 2;
    }

    // Subdual damage calculation
    if (attackType === 'subdual') {
      // OSRIC: subdual damage is split between real and subdual
      // Implementation would depend on specific subdual rules
      baseDamage = Math.ceil(baseDamage / 2); // Simplified for now
    }

    return baseDamage;
  }

  /**
   * Apply damage modifiers - PRESERVE OSRIC STRENGTH BONUSES
   */
  private applyDamageModifiers(
    attacker: CharacterData | MonsterData,
    weapon?: Weapon,
    baseDamage?: number
  ): number {
    let modifier = 0;
    const damage = baseDamage || 0;

    // Apply strength bonus for melee attacks (characters only)
    if ('abilityModifiers' in attacker && (!weapon || weapon.type === 'Melee')) {
      if (attacker.abilityModifiers.strengthDamageAdj) {
        modifier += attacker.abilityModifiers.strengthDamageAdj;

        // Critical hits do NOT double ability modifiers in OSRIC
        // Only the dice damage is doubled
      }
    }

    // Apply weapon magic bonus
    if (weapon?.magicBonus) {
      modifier += weapon.magicBonus;
    }

    // Apply weapon specialization damage bonus
    if ('weaponSpecializations' in attacker && weapon && attacker.weaponSpecializations) {
      const specialization = attacker.weaponSpecializations.find(
        (spec) => spec.weapon === weapon.name
      );
      if (specialization?.bonuses.damageBonus) {
        modifier += specialization.bonuses.damageBonus;
      }
    }

    return damage + modifier;
  }

  /**
   * Roll damage dice from notation (e.g., "1d8", "2d6+1")
   */
  private rollDamage(damageNotation: string): number {
    // Parse notation like "1d8", "2d6+1", "1d4-1"
    const match = damageNotation.match(/(\d+)d(\d+)([+-]\d+)?/);

    if (!match) {
      // If parsing fails, assume it's a flat number
      return Number.parseInt(damageNotation, 10) || 1;
    }

    const numDice = Number.parseInt(match[1], 10);
    const dieSize = Number.parseInt(match[2], 10);
    const modifier = match[3] ? Number.parseInt(match[3], 10) : 0;

    let total = 0;
    for (let i = 0; i < numDice; i++) {
      total += Math.floor(Math.random() * dieSize) + 1;
    }

    return total + modifier;
  }
}
