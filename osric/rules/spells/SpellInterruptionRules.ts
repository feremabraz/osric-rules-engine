import type { Command } from '@osric/core/Command';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import { RULE_NAMES } from '@osric/types/constants';
import { SpellConcentrationRule, SpellFailureRule } from './AdvancedSpellRules';

export class SpellInterruptionRule extends BaseRule {
  public readonly name = RULE_NAMES.SPELL_INTERRUPTION;
  private concentration = new SpellConcentrationRule();
  private failure = new SpellFailureRule();

  canApply(context: GameContext, _command: Command): boolean {
    // Apply when there is any ongoing spell attempt or concentration check in context
    const hasAttempt = context.getTemporary('spell:attempt') != null;
    const hasConcentration = context.getTemporary('spell:concentration:check') != null;
    return hasAttempt || hasConcentration;
  }

  async apply(context: GameContext, _command: Command): Promise<RuleResult> {
    // Try concentration first if present
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (this.concentration.canApply(context)) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const res = await this.concentration.execute(context);
      return res;
    }
    // Else resolve failure/backfire path if spell attempt is present
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (this.failure.canApply(context)) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const res = await this.failure.execute(context);
      return res;
    }
    return this.createSuccessResult('No spell interruption occurred');
  }
}
