import { type AttackContext, getAttacksPerRound } from '@osric/core/CombatHelpers';
import type { Command } from '@osric/core/Command';
import { ContextKeys } from '@osric/core/ContextKeys';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import type { Character as CharacterData } from '@osric/types/character';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';
import type { Weapon } from '@osric/types/item';
import type { Monster as MonsterData } from '@osric/types/monster';
import type { CombatResult } from '@osric/types/shared';

// AttackContext now sourced from core CombatHelpers

export enum AttackSequence {
  FIRST = 'first',
  SUBSEQUENT = 'subsequent',
  FINAL = 'final',
}

export class MultipleAttackRules extends BaseRule {
  name = RULE_NAMES.MULTIPLE_ATTACKS;

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const attackContext = context.getTemporary(ContextKeys.COMBAT_ATTACK_CONTEXT) as AttackContext;

    if (!attackContext) {
      return this.createFailureResult('No attack context found');
    }

    const { attacker, target, weapon } = attackContext;

    const attacksPerRound = getAttacksPerRound(attacker, weapon, target);

    if (attacksPerRound <= 1) {
      context.setTemporary(ContextKeys.COMBAT_ATTACKS_THIS_ROUND, 1);
      return this.createSuccessResult('Single attack - no multiple attack processing needed');
    }

    const results = this.resolveMultipleAttacks(attackContext, attacksPerRound);

    context.setTemporary(ContextKeys.COMBAT_MULTIPLE_ATTACK_RESULTS, results.results);
    context.setTemporary(
      ContextKeys.COMBAT_FRACTIONAL_ATTACKS_CARRIED,
      results.fractionalAttacksCarriedOver
    );
    context.setTemporary(ContextKeys.COMBAT_ATTACKS_THIS_ROUND, results.results.length);

    return this.createSuccessResult(
      `Multiple attacks resolved: ${results.results.length} attacks executed`,
      undefined,
      undefined,
      undefined,
      true
    );
  }

  canApply(context: GameContext, command: Command): boolean {
    if (command.type !== COMMAND_TYPES.ATTACK) return false;

    const attackContext = context.getTemporary(ContextKeys.COMBAT_ATTACK_CONTEXT) as AttackContext;
    if (!attackContext) return false;

    const attacksPerRound = getAttacksPerRound(
      attackContext.attacker,
      attackContext.weapon,
      attackContext.target
    );

    return attacksPerRound > 1 || attackContext.multipleAttacks === true;
  }

  // helper methods removed; using shared helpers from core

  private resolveMultipleAttacks(
    attackContext: AttackContext,
    attacksThisRound: number
  ): {
    results: CombatResult[];
    fractionalAttacksCarriedOver: number;
  } {
    const { attacker, target, weapon, situationalModifiers = 0, roundState } = attackContext;

    const effectiveRoundState = roundState ?? {
      currentRound: 1,
      fractionalAttacksCarriedOver: 0,
    };

    let totalAttacks = Math.floor(attacksThisRound);
    let fractionalPart = attacksThisRound % 1;

    const combinedFraction = effectiveRoundState.fractionalAttacksCarriedOver + fractionalPart;
    if (combinedFraction >= 1) {
      totalAttacks += 1;
      fractionalPart = combinedFraction - 1;
    } else {
      fractionalPart = combinedFraction;
    }

    const results: CombatResult[] = [];

    for (let i = 0; i < totalAttacks; i++) {
      const attackSequence =
        totalAttacks === 1
          ? AttackSequence.FIRST
          : i === 0
            ? AttackSequence.FIRST
            : i === totalAttacks - 1
              ? AttackSequence.FINAL
              : AttackSequence.SUBSEQUENT;

      let attackModifier = situationalModifiers;

      if (attackSequence === AttackSequence.SUBSEQUENT) {
        attackModifier -= 2;
      } else if (attackSequence === AttackSequence.FINAL) {
        attackModifier -= 5;
      }

      const result = this.executeAttack(attacker, target, weapon, attackModifier);

      if (totalAttacks > 1) {
        result.message = `Attack ${i + 1}/${totalAttacks}: ${result.message}`;
      }

      results.push(result);

      if (target.hitPoints.current <= 0) {
        break;
      }
    }

    return {
      results,
      fractionalAttacksCarriedOver: fractionalPart,
    };
  }

  private executeAttack(
    attacker: CharacterData | MonsterData,
    target: CharacterData | MonsterData,
    _weapon?: Weapon,
    _modifier = 0
  ): CombatResult {
    return {
      hit: true,
      damage: [1],
      critical: false,
      message: `${attacker.name} attacks ${target.name}`,
      specialEffects: null,
    };
  }
}

// AttackPrecedenceRules moved to its own file for compliance.
