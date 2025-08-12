import type { Command } from '@osric/core/Command';
import type { GameContext } from '@osric/core/GameContext';
import type { RuleResult } from '@osric/core/Rule';
import { BaseRule } from '@osric/core/Rule';
import { RuleChain } from '@osric/core/RuleChain';
import { SavingThrowRules } from '@osric/rules/character/SavingThrowRules';
import { RULE_NAMES } from '@osric/types/constants';

class SavingThrowCalculationRules extends BaseRule {
  readonly name = RULE_NAMES.SAVING_THROW_CALCULATION;
  readonly priority = 510;
  async apply(_context: GameContext, _command: Command): Promise<RuleResult> {
    return this.createSuccessResult('Saving throw calculation finalized');
  }
}

export function buildSavingThrowChain(): RuleChain {
  const chain = new RuleChain();
  chain.addRules([new SavingThrowRules(), new SavingThrowCalculationRules()]);
  return chain;
}
