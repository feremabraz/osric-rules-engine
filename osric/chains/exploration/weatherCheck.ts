import { RuleChain } from '@osric/core/RuleChain';
import { WeatherEffectsRule } from '@osric/rules/exploration/WeatherEffectRules';

export function buildWeatherCheckChain(): RuleChain {
  const chain = new RuleChain();
  chain.addRule(new WeatherEffectsRule());
  return chain;
}
