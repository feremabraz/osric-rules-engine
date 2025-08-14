import { RuleChain } from '@osric/core/RuleChain';
import { ThiefSkillRules } from '@osric/rules/character/ThiefSkillRules';

export function buildThiefSkillCheckChain(): RuleChain {
  const chain = new RuleChain();
  chain.addRule(new ThiefSkillRules());
  return chain;
}
