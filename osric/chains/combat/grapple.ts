import { RuleChain } from '@osric/core/RuleChain';
import {
  GrappleAttackRules,
  GrappleEffectRules,
  StrengthComparisonRules,
} from '@osric/rules/combat/GrapplingRules';

export function buildGrappleChain(): RuleChain {
  const chain = new RuleChain();
  chain.addRules([
    new GrappleAttackRules(),
    new StrengthComparisonRules(),
    new GrappleEffectRules(),
  ]);
  return chain;
}
