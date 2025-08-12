import { RuleChain } from '@osric/core/RuleChain';
import { DrowningRules } from '@osric/rules/exploration/DrowningRules';

export function buildDrowningCheckChain(): RuleChain {
  const chain = new RuleChain();
  chain.addRule(new DrowningRules());
  return chain;
}
