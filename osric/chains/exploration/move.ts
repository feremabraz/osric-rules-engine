import { RuleChain } from '@osric/core/RuleChain';
import { EncumbranceRule } from '@osric/rules/exploration/EncumbranceRules';
import { MovementRatesRule } from '@osric/rules/exploration/MovementRateRules';
import { MovementRule } from '@osric/rules/exploration/MovementRules';

export function buildMoveChain(): RuleChain {
  const chain = new RuleChain();
  chain.addRules([new MovementRatesRule(), new EncumbranceRule(), new MovementRule()]);
  return chain;
}
