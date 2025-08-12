import { RuleChain } from '@osric/core/RuleChain';
import { LoyaltyRules } from '@osric/rules/npc/LoyaltyRules';

export function buildLoyaltyCheckChain(): RuleChain {
  const chain = new RuleChain();
  chain.addRule(new LoyaltyRules());
  return chain;
}
