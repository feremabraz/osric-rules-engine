import { RuleChain } from '@osric/core/RuleChain';
import { SearchRules } from '@osric/rules/exploration/SearchRules';

export function buildSearchChain(): RuleChain {
  const chain = new RuleChain();
  chain.addRule(new SearchRules());
  return chain;
}
