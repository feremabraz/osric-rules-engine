import type { Command } from '@osric/core/Command';
import { ContextKeys } from '@osric/core/ContextKeys';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import type { Character as CharacterData } from '@osric/types/character';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';
import type { Monster as MonsterData } from '@osric/types/monster';
import { GrapplingOutcome } from './GrappleAttackRules';

interface GrappleContext {
  attacker: CharacterData | MonsterData;
  target: CharacterData | MonsterData;
  grappleType: 'standard' | 'overbearing';
}

interface GrappleAttackResult {
  hit: boolean;
}

interface StrengthComparisonResult {
  outcome: GrapplingOutcome;
  attackerStrength: number;
  targetStrength: number;
}

export class StrengthComparisonRules extends BaseRule {
  readonly name = RULE_NAMES.STRENGTH_COMPARISON;
  readonly priority = 20;

  canApply(context: GameContext, command: Command): boolean {
    const attackResult = context.getTemporary(
      ContextKeys.COMBAT_GRAPPLE_ATTACK_RESULT
    ) as GrappleAttackResult;
    return (
      command.type === COMMAND_TYPES.GRAPPLE &&
      context.getTemporary(ContextKeys.COMBAT_GRAPPLE_CONTEXT) !== null &&
      attackResult?.hit === true
    );
  }

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const grappleContext = context.getTemporary(
      ContextKeys.COMBAT_GRAPPLE_CONTEXT
    ) as GrappleContext;

    if (!grappleContext) {
      return this.createFailureResult('No grapple context found');
    }

    try {
      const { attacker, target, grappleType } = grappleContext;

      const outcome = this.compareStrengths(attacker, target, grappleType);

      const strengthResult: StrengthComparisonResult = {
        outcome,
        attackerStrength: this.getEffectiveStrength(attacker),
        targetStrength: this.getEffectiveStrength(target),
      };

      context.setTemporary(ContextKeys.COMBAT_GRAPPLE_STRENGTH_COMPARISON, strengthResult);

      return this.createSuccessResult('Grapple strength comparison completed');
    } catch (error) {
      return this.createFailureResult(
        `Strength comparison failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private compareStrengths(
    attacker: CharacterData | MonsterData,
    target: CharacterData | MonsterData,
    grappleType: 'standard' | 'overbearing'
  ): GrapplingOutcome {
    const attackerStr = this.getEffectiveStrength(attacker);
    const targetStr = this.getEffectiveStrength(target);

    if (grappleType === 'overbearing') {
      if (attackerStr > targetStr) {
        return GrapplingOutcome.OVERBEARING_SUCCESS;
      }
      return GrapplingOutcome.MISS;
    }

    if (attackerStr > targetStr) {
      return GrapplingOutcome.ATTACKER_GRAPPLES;
    }
    if (targetStr > attackerStr) {
      return GrapplingOutcome.DEFENDER_GRAPPLES;
    }

    return GrapplingOutcome.STALEMATE;
  }

  private getEffectiveStrength(entity: CharacterData | MonsterData): number {
    if ('abilities' in entity) {
      return entity.abilities.strength;
    }
    if ('strength' in entity) {
      return (entity as MonsterData & { strength?: number }).strength || 12;
    }
    return 12;
  }
}
