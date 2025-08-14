import { type AttackContext, getAttacksPerRound } from '@osric/core/CombatHelpers';
import type { Command } from '@osric/core/Command';
import { ContextKeys } from '@osric/core/ContextKeys';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import { RULE_NAMES } from '@osric/types/constants';
import { COMMAND_TYPES } from '@osric/types/constants';

export class AttackPrecedenceRules extends BaseRule {
  name = RULE_NAMES.ATTACK_PRECEDENCE;

  async apply(context: GameContext, _command: Command): Promise<RuleResult> {
    const attackContext = context.getTemporary(ContextKeys.COMBAT_ATTACK_CONTEXT) as AttackContext;

    if (!attackContext) {
      return this.createFailureResult('No attack context found');
    }

    const { attacker, weapon } = attackContext;
    const hasMultipleAttacks = getAttacksPerRound(attacker, weapon) > 1;
    const precedence = this.getAttackPrecedence(hasMultipleAttacks);

    context.setTemporary(ContextKeys.COMBAT_ATTACK_PRECEDENCE, precedence);

    return this.createSuccessResult(
      precedence < 0
        ? 'Fighter with multiple attacks goes first'
        : 'Normal initiative order applies'
    );
  }

  canApply(context: GameContext, command: Command): boolean {
    if (command.type !== COMMAND_TYPES.ATTACK) return false;

    const attackContext = context.getTemporary(ContextKeys.COMBAT_ATTACK_CONTEXT) as AttackContext;
    return attackContext !== null;
  }

  private getAttackPrecedence(hasMultipleAttacks: boolean): number {
    if (!hasMultipleAttacks) return 0;
    return -1;
  }
}
