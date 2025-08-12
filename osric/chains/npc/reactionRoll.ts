import { RuleChain } from '@osric/core/RuleChain';
import { ReactionRules } from '@osric/rules/npc/ReactionRules';

export function buildReactionRollChain(): RuleChain {
  const chain = new RuleChain();
  chain.addRule(new ReactionRules());
  return chain;
}
