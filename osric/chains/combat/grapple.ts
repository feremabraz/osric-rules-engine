import { RuleChain } from '@osric/core/RuleChain';
import {
  GrappleAttackRule,
  GrappleEffectRule,
  StrengthComparisonRule,
} from '@osric/rules/combat/GrapplingRules';

export function buildGrappleChain(): RuleChain {
  const chain = new RuleChain();
  chain.addRules([new GrappleAttackRule(), new StrengthComparisonRule(), new GrappleEffectRule()]);
  return chain;
}
