import { RuleChain } from '@osric/core/RuleChain';
import {
  ScrollCastingFailureRule,
  ScrollSpellCastingRule,
  ScrollUsageValidationRule,
} from '@osric/rules/spells/ScrollCreationRules';

export function buildReadScrollChain(): RuleChain {
  const chain = new RuleChain();
  chain.addRules([
    new ScrollUsageValidationRule(),
    new ScrollCastingFailureRule(),
    new ScrollSpellCastingRule(),
  ]);
  return chain;
}
