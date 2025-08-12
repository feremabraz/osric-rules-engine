import { RuleChain } from '@osric/core/RuleChain';
import { TreasureGenerationRules } from '@osric/rules/npc/TreasureGenerationRules';

export function buildMonsterGenerationChain(): RuleChain {
  const chain = new RuleChain();
  chain.addRule(new TreasureGenerationRules());
  return chain;
}
