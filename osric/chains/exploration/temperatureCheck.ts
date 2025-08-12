import { RuleChain } from '@osric/core/RuleChain';
import { TemperatureEffectsRules } from '@osric/rules/exploration/TemperatureEffectsRules';

export function buildTemperatureCheckChain(): RuleChain {
  const chain = new RuleChain();
  chain.addRule(new TemperatureEffectsRules());
  return chain;
}
