import { RuleChain } from '@osric/core/RuleChain';
import { SurvivalChecksRules } from '@osric/rules/exploration/SurvivalChecksRules';
import { TerrainNavigationRules } from '@osric/rules/exploration/TerrainNavigationRules';

export function buildTerrainNavigationChain(): RuleChain {
  const chain = new RuleChain();
  chain.addRule(new TerrainNavigationRules());
  chain.addRule(new SurvivalChecksRules());
  return chain;
}
