import { RuleChain } from '@osric/core/RuleChain';
import { BleedingTickRule } from '@osric/rules/system/BleedingTickRules';

export function buildRoundTickChain(): RuleChain {
  const chain = new RuleChain();
  chain.addRule(new BleedingTickRule());
  return chain;
}
