import { RuleChain } from '@osric/core/RuleChain';
import { SearchRule } from '@osric/rules/exploration/SearchRules';

export function buildSearchChain(): RuleChain {
  const chain = new RuleChain();
  chain.addRule(new SearchRule());
  return chain;
}
