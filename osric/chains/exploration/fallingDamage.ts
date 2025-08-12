import { RuleChain } from '@osric/core/RuleChain';
import { FallingDamageRule } from '@osric/rules/exploration/FallingDamageRules';

export function buildFallingDamageChain(): RuleChain {
  const chain = new RuleChain();
  chain.addRule(new FallingDamageRule());
  return chain;
}
