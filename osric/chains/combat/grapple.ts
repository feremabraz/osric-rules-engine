import { RuleChain } from '@osric/core/RuleChain';
import { GrappleAttackRules } from '@osric/rules/combat/GrappleAttackRules';
import { GrappleEffectRules } from '@osric/rules/combat/GrappleEffectRules';
import { StrengthComparisonRules } from '@osric/rules/combat/StrengthComparisonRules';

export function buildGrappleChain(): RuleChain {
  const chain = new RuleChain();
  chain.addRules([
    new GrappleAttackRules(),
    new StrengthComparisonRules(),
    new GrappleEffectRules(),
  ]);
  return chain;
}
