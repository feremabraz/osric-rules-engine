import { RuleChain } from '@osric/core/RuleChain';
import { BleedingTickRules } from '@osric/rules/system/BleedingTickRules';

export function buildRoundTickChain(): RuleChain {
  const chain = new RuleChain();
  chain.addRule(new BleedingTickRules());
  return chain;
}
