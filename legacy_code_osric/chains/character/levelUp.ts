import { RuleChain } from '@osric/core/RuleChain';
import { LevelProgressionRules } from '@osric/rules/experience/LevelProgressionRules';
import { TrainingRules } from '@osric/rules/experience/TrainingRules';
import { SpellProgressionRules } from '@osric/rules/spells/SpellProgressionRules';

export function buildLevelUpChain(): RuleChain {
  const chain = new RuleChain();
  chain.addRule(new TrainingRules());
  chain.addRule(new LevelProgressionRules());
  chain.addRule(new SpellProgressionRules());
  return chain;
}
