import type { Command } from '@osric/core/Command';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import type { Character as CharacterData } from '@osric/types/character';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';
import type { Weapon } from '@osric/types/item';
import type { Monster as MonsterData } from '@osric/types/monster';

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
  readonly priority = 10;

  canApply(context: GameContext, command: Command): boolean {
    return (
      command.type === COMMAND_TYPES.ATTACK &&
      context.getTemporary('combat:attack:context') !== null
    );
  }

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const attackContext = context.getTemporary('combat:attack:context') as AttackContext;

    if (!attackContext) {
      return this.createFailureResult('No attack context found');
    }

    try {
      const { attacker, target, weapon, situationalModifiers, isChargedAttack } = attackContext;

      const naturalRoll = this.rollD20();

      const modifiers = this.calculateAttackModifiers(
        attacker,
        weapon,
        situationalModifiers,
        isChargedAttack
      );

      const totalAttackRoll = naturalRoll + modifiers;

      const targetNumber = this.calculateTargetNumber(attacker, target);

      const hit = totalAttackRoll >= targetNumber;

      const critical = naturalRoll === 20;

      const criticalMiss = naturalRoll === 1;

      const attackRollResult: AttackRollResult = {
        naturalRoll,
        modifiers,
        totalAttackRoll,
        targetNumber,
        hit: hit || critical,
        critical,
        criticalMiss,
        weapon,
      };

      context.setTemporary('combat:attack:roll-result', attackRollResult);

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

  private calculateTargetNumber(
    attacker: CharacterData | MonsterData,
    target: CharacterData | MonsterData
  ): number {
    const attackerThac0 = attacker.thac0;
    const targetAC = target.armorClass;

    const targetNumber = attackerThac0 - targetAC;

    return targetNumber;
  }

  private calculateAttackModifiers(
    attacker: CharacterData | MonsterData,
    weapon?: Weapon,
    situationalModifiers = 0,
    isChargedAttack = false
  ): number {
    let totalModifier = situationalModifiers;

    if ('abilityModifiers' in attacker) {
      if ((!weapon || weapon.type === 'Melee') && attacker.abilityModifiers.strengthHitAdj) {
        totalModifier += attacker.abilityModifiers.strengthHitAdj;
      }

      if (weapon?.type === 'Ranged' && attacker.abilityModifiers.dexterityMissile) {
        totalModifier += attacker.abilityModifiers.dexterityMissile;
      }
    }

    if (weapon?.magicBonus) {
      totalModifier += weapon.magicBonus;
    }

    if (isChargedAttack) {
      totalModifier += 2;
    }

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

  private rollD20(): number {
    return Math.floor(Math.random() * 20) + 1;
  }
}

export class DamageCalculationRule extends BaseRule {
  readonly name = RULE_NAMES.DAMAGE_CALCULATION;
  readonly priority = 20;

  canApply(context: GameContext, command: Command): boolean {
    return (
      command.type === COMMAND_TYPES.ATTACK &&
      context.getTemporary('combat:attack:context') !== null &&
      context.getTemporary('combat:attack:roll-result') !== null
    );
  }

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const attackContext = context.getTemporary('combat:attack:context') as AttackContext;
    const attackRollResult = context.getTemporary('combat:attack:roll-result') as AttackRollResult;

    if (!attackContext || !attackRollResult) {
      return this.createFailureResult('Missing attack context or attack roll result');
    }

    if (!attackRollResult.hit) {
      context.setTemporary('combat:damage:result', { damage: [], totalDamage: 0 });
      return this.createSuccessResult('No damage - attack missed');
    }

    try {
      const { attacker, attackType } = attackContext;
      const { weapon, critical } = attackRollResult;

      const damage = this.calculateBaseDamage(attacker, weapon, critical, attackType);

      const modifiedDamage = this.applyDamageModifiers(attacker, weapon, damage);

      const finalDamage = Math.max(1, modifiedDamage);

      const damageResult = {
        damage: [finalDamage],
        totalDamage: finalDamage,
        critical,
        damageType: attackType,
      };

      context.setTemporary('combat:damage:result', damageResult);

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

  private calculateBaseDamage(
    attacker: CharacterData | MonsterData,
    weapon?: Weapon,
    critical = false,
    attackType = 'normal'
  ): number {
    let baseDamage: number;

    if (weapon) {
      baseDamage = this.rollDamage(weapon.damage);
    } else if ('damagePerAttack' in attacker && attacker.damagePerAttack.length > 0) {
      baseDamage = this.rollDamage(attacker.damagePerAttack[0]);
    } else {
      baseDamage = this.rollDamage('1d2');
    }

    if (critical && attackType === 'normal') {
      baseDamage *= 2;
    }

    if (attackType === 'subdual') {
      baseDamage = Math.ceil(baseDamage / 2);
    }

    return baseDamage;
  }

  private applyDamageModifiers(
    attacker: CharacterData | MonsterData,
    weapon?: Weapon,
    baseDamage?: number
  ): number {
    let modifier = 0;
    const damage = baseDamage || 0;

    if ('abilityModifiers' in attacker && (!weapon || weapon.type === 'Melee')) {
      if (attacker.abilityModifiers.strengthDamageAdj) {
        modifier += attacker.abilityModifiers.strengthDamageAdj;
      }
    }

    if (weapon?.magicBonus) {
      modifier += weapon.magicBonus;
    }

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

  private rollDamage(damageNotation: string): number {
    const match = damageNotation.match(/(\d+)d(\d+)([+-]\d+)?/);

    if (!match) {
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
