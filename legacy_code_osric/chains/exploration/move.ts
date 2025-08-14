import { RuleChain } from '@osric/core/RuleChain';
import { EncumbranceRules } from '@osric/rules/exploration/EncumbranceRules';
import { MovementRatesRules } from '@osric/rules/exploration/MovementRateRules';
import { MovementRules } from '@osric/rules/exploration/MovementRules';

export function buildMoveChain(): RuleChain {
  const chain = new RuleChain();
  chain.addRules([new MovementRatesRules(), new EncumbranceRules(), new MovementRules()]);
  return chain;
}
