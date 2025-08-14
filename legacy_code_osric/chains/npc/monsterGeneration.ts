import { RuleChain } from '@osric/core/RuleChain';
import { MonsterBehaviorRules } from '@osric/rules/npc/MonsterBehaviorRules';
import { TreasureGenerationRules } from '@osric/rules/npc/TreasureGenerationRules';

export function buildMonsterGenerationChain(): RuleChain {
  const chain = new RuleChain();
  chain.addRule(new MonsterBehaviorRules());
  chain.addRule(new TreasureGenerationRules());
  return chain;
}
