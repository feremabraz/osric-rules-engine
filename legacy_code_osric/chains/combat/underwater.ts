import { RuleChain } from '@osric/core/RuleChain';
import { UnderwaterMovementRules } from '@osric/rules/combat/UnderwaterMovementRules';

export function buildUnderwaterMoveChain(): RuleChain {
  const chain = new RuleChain();
  chain.addRule(new UnderwaterMovementRules());
  return chain;
}
