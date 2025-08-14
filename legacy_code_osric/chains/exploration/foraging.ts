import { RuleChain } from '@osric/core/RuleChain';
import { ForagingRules } from '@osric/rules/exploration/ForagingRules';
import { SurvivalChecksRules } from '@osric/rules/exploration/SurvivalChecksRules';

export function buildForagingChain(): RuleChain {
  const chain = new RuleChain();
  chain.addRule(new ForagingRules());
  chain.addRule(new SurvivalChecksRules());
  return chain;
}
