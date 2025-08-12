import { RuleChain } from '@osric/core/RuleChain';
import { SurvivalChecksRule } from '@osric/rules/exploration/SurvivalChecksRules';
import { TerrainNavigationRule } from '@osric/rules/exploration/TerrainNavigationRules';

export function buildTerrainNavigationChain(): RuleChain {
  const chain = new RuleChain();
  chain.addRule(new TerrainNavigationRule());
  chain.addRule(new SurvivalChecksRule());
  return chain;
}
