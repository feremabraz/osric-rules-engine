import { RuleChain } from '@osric/core/RuleChain';
import { ForagingRule } from '@osric/rules/exploration/ForagingRules';
import { SurvivalChecksRule } from '@osric/rules/exploration/SurvivalChecksRules';

export function buildForagingChain(): RuleChain {
  const chain = new RuleChain();
  chain.addRule(new ForagingRule());
  chain.addRule(new SurvivalChecksRule());
  return chain;
}
