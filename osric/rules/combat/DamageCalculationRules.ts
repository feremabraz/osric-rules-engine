import type { AttackContext } from '@osric/core/CombatHelpers';
import type { Command } from '@osric/core/Command';
import { ContextKeys } from '@osric/core/ContextKeys';
import { DiceEngine } from '@osric/core/Dice';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import type { Character as CharacterData } from '@osric/types/character';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';
import type { Weapon } from '@osric/types/item';
import type { Weapon as WeaponData } from '@osric/types/item';
import type { Monster as MonsterData } from '@osric/types/monster';
import type { CombatResult } from '@osric/types/shared';

// AttackContext now sourced from core CombatHelpers and extended in usage via optional fields

export class DamageCalculationRule extends BaseRule {
  readonly name = RULE_NAMES.DAMAGE_CALCULATION;
  readonly priority = 20;

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const attackContext = context.getTemporary(ContextKeys.COMBAT_ATTACK_CONTEXT) as AttackContext;
    const attackRollResult = context.getTemporary(ContextKeys.COMBAT_ATTACK_ROLL_RESULT) as {
      naturalRoll: number;
      modifiers: number;
      totalAttackRoll: number;
      targetNumber: number;
      hit: boolean;
      critical: boolean;
      criticalMiss: boolean;
      weapon?: WeaponData;
    } | null;

    if (!attackContext || !attackRollResult) {
      return this.createFailureResult('No attack context found');
    }

    // If the attack missed, record zero damage and exit
    if (!attackRollResult.hit) {
      context.setTemporary(ContextKeys.COMBAT_DAMAGE_RESULT, { damage: [], totalDamage: 0 });
      return this.createSuccessResult('No damage - attack missed');
    }

    const { attacker, attackType } = attackContext;
    const { weapon, critical } = attackRollResult;

    const baseDamage = this.calculateBaseDamage(attacker, weapon, critical, attackType || 'normal');
    const modifiedDamage = this.applyDamageModifiers(attacker, weapon, baseDamage);
    const finalDamage = Math.max(1, modifiedDamage);

    const damageResult = {
      damage: [finalDamage],
      totalDamage: finalDamage,
      critical,
      damageType: attackType,
    };

    context.setTemporary(ContextKeys.COMBAT_DAMAGE_RESULT, damageResult);
    context.setTemporary(ContextKeys.COMBAT_DAMAGE_VALUES, [finalDamage]);

    const message = critical
      ? `Critical hit! ${finalDamage} damage dealt`
      : `${finalDamage} damage dealt`;

    return this.createSuccessResult(message, undefined, undefined, [finalDamage]);
  }

  canApply(context: GameContext, command: Command): boolean {
    if (command.type !== COMMAND_TYPES.ATTACK) return false;

    const attackContext = context.getTemporary(ContextKeys.COMBAT_ATTACK_CONTEXT);
    const attackRollResult = context.getTemporary(ContextKeys.COMBAT_ATTACK_ROLL_RESULT);
    return attackContext !== null && attackRollResult !== null;
  }

  private calculateBaseDamage(
    attacker: CharacterData | MonsterData,
    weapon?: Weapon,
    critical = false,
    attackType = 'normal'
  ): number {
    let baseDamage: number;

    if (weapon) {
      baseDamage = DiceEngine.roll(weapon.damage).total;
    } else if ('damagePerAttack' in attacker && attacker.damagePerAttack.length > 0) {
      baseDamage = DiceEngine.roll(attacker.damagePerAttack[0]).total;
    } else {
      baseDamage = DiceEngine.roll('1d2').total;
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
    baseDamage = 0
  ): number {
    let modifier = 0;

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

    return baseDamage + modifier;
  }
}
