import { RuleChain } from '@osric/core/RuleChain';
import { ExperienceGainRules } from '@osric/rules/experience/ExperienceGainRules';
import { LevelProgressionRules } from '@osric/rules/experience/LevelProgressionRules';

export function buildGainExperienceChain(): RuleChain {
  const chain = new RuleChain();
  chain.addRule(new ExperienceGainRules());
  // Include level progression to satisfy contract visibility; rule will self-gate by command type
  chain.addRule(new LevelProgressionRules());
  return chain;
}
