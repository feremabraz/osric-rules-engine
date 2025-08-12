import type { Command } from '@osric/core/Command';
import { ContextKeys } from '@osric/core/ContextKeys';
import { rollExpression } from '@osric/core/Dice';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import type { Character as CharacterData } from '@osric/types/character';
import { COMMAND_TYPES } from '@osric/types/constants';
import type { Weapon } from '@osric/types/item';
import type { Monster as MonsterData } from '@osric/types/monster';
import type { CombatResult, StatusEffect } from '@osric/types/shared';

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
    const attackContext = context.getTemporary(ContextKeys.COMBAT_ATTACK_CONTEXT) as AttackContext;

    if (!attackContext) {
      return this.createFailureResult('No attack context found');
    }

    const { attacker, target, weapon, attackType, isCriticalHit } = attackContext;

    let damage: number[];
    let combatResult: CombatResult;

    if (attackType === 'subdual') {
      damage = this.calculateSubdualDamage(attacker, target, weapon, isCriticalHit || false);
      combatResult = this.applySubdualDamage(attacker, target, damage, isCriticalHit || false);
    } else {
      damage = this.calculateDamage(attacker, target, weapon, isCriticalHit || false);
      combatResult = this.applyDamage(attacker, target, damage, isCriticalHit || false);
    }

    context.setTemporary(ContextKeys.COMBAT_DAMAGE_RESULT, combatResult);
    context.setTemporary(ContextKeys.COMBAT_DAMAGE_VALUES, damage);

    return this.createSuccessResult(
      `Damage calculated: ${damage.join(', ')} points`,
      undefined,
      undefined,
      damage
    );
  }

  canApply(context: GameContext, command: Command): boolean {
    if (command.type !== COMMAND_TYPES.ATTACK) return false;

    const attackContext = context.getTemporary(ContextKeys.COMBAT_ATTACK_CONTEXT) as AttackContext;
    return Boolean(attackContext && attackContext.hitRoll !== undefined);
  }

  private calculateDamage(
    attacker: CharacterData | MonsterData,
    target: CharacterData | MonsterData,
    weapon?: Weapon,
    isCritical = false
  ): number[] {
    let damageRoll: number;

    if (weapon) {
      damageRoll = rollExpression(weapon.damage);

      if (
        'size' in target &&
        ['Large', 'Huge', 'Gargantuan'].includes(target.size) &&
        weapon.damageVsLarge
      ) {
        damageRoll = rollExpression(weapon.damageVsLarge);
      }
    } else if ('damagePerAttack' in attacker && attacker.damagePerAttack.length > 0) {
      damageRoll = rollExpression(attacker.damagePerAttack[0]);
    } else {
      damageRoll = rollExpression('1d2');
    }

    let damageModifier = 0;
    if (
      (!weapon || weapon?.type === 'Melee') &&
      'abilities' in attacker &&
      attacker.abilityModifiers.strengthDamageAdj
    ) {
      damageModifier += attacker.abilityModifiers.strengthDamageAdj;
    }

    if (weapon?.magicBonus) {
      damageModifier += weapon.magicBonus;
    }

    if (isCritical) {
      damageRoll *= 2;
    }

    const totalDamage = Math.max(1, damageRoll + damageModifier);

    return [totalDamage];
  }

  private applyDamage(
    attacker: CharacterData | MonsterData,
    target: CharacterData | MonsterData,
    damage: number[],
    isCritical = false
  ): CombatResult {
    const totalDamage = damage.reduce((sum, dmg) => sum + dmg, 0);

    target.hitPoints.current = Math.max(0, target.hitPoints.current - totalDamage);

    const isUnconscious = target.hitPoints.current === 0;
    const isDead = target.hitPoints.current <= -10;

    const statusEffects: StatusEffect[] = [];

    if (isUnconscious) {
      statusEffects.push({
        name: 'Unconscious',
        duration: 6,
        effect: 'Character is unconscious and bleeding',
        savingThrow: null,
        endCondition: 'When hit points rise above 0',
      });

      statusEffects.push({
        name: 'Bleeding',
        duration: 0,
        effect: 'Losing 1 hp per round',
        savingThrow: null,
        endCondition: 'When healed above 0 hp or dies',
      });
    }

    let message = `${attacker.name} ${isCritical ? 'critically ' : ''}hit ${target.name} for ${totalDamage} damage.`;

    if (isUnconscious) {
      message += ` ${target.name} is unconscious and bleeding!`;
    }

    if (isDead) {
      message += ` ${target.name} is dead!`;
      statusEffects.push({
        name: 'Dead',
        duration: -1,
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

  private calculateSubdualDamage(
    attacker: CharacterData | MonsterData,
    target: CharacterData | MonsterData,
    weapon?: Weapon,
    isCritical = false
  ): number[] {
    const damage = this.calculateDamage(attacker, target, weapon, isCritical);

    const realDamage = Math.floor(damage[0] / 2);
    const subdualDamage = Math.ceil(damage[0] / 2);

    return [realDamage, subdualDamage];
  }

  private applySubdualDamage(
    attacker: CharacterData | MonsterData,
    target: CharacterData | MonsterData,
    damage: number[],
    isCritical = false
  ): CombatResult {
    if (damage.length < 2) {
      throw new Error('Subdual damage should contain both real and subdual components');
    }

    const realDamage = damage[0];
    const subdualDamage = damage[1];

    target.hitPoints.current = Math.max(0, target.hitPoints.current - realDamage);

    const isUnconscious = target.hitPoints.current === 0;

    const statusEffects: StatusEffect[] = [];

    if (isUnconscious) {
      statusEffects.push({
        name: 'Unconscious',
        duration: 6,
        effect: 'Character is unconscious and bleeding',
        savingThrow: null,
        endCondition: 'When hit points rise above 0',
      });
    }

    if (subdualDamage > 0) {
      statusEffects.push({
        name: 'Subdued',
        duration: subdualDamage,
        effect: 'Character has taken non-lethal damage',
        savingThrow: null,
        endCondition: 'Recovers 1 point per hour',
      });
    }

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
