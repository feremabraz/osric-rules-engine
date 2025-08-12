import { RuleChain } from '@osric/core/RuleChain';
import { WeatherEffectsRules } from '@osric/rules/exploration/WeatherEffectRules';

export function buildWeatherCheckChain(): RuleChain {
  const chain = new RuleChain();
  chain.addRule(new WeatherEffectsRules());
  return chain;
}
