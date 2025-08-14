import { RuleChain } from '@osric/core/RuleChain';
import { MoraleRules } from '@osric/rules/npc/MoraleRules';

export function buildMoraleCheckChain(): RuleChain {
  const chain = new RuleChain();
  chain.addRule(new MoraleRules());
  return chain;
}
