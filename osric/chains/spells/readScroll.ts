import { RuleChain } from '@osric/core/RuleChain';
import {
  ScrollCastingFailureRules,
  ScrollSpellCastingRules,
  ScrollUsageValidationRules,
} from '@osric/rules/spells/ScrollCreationRules';

export function buildReadScrollChain(): RuleChain {
  const chain = new RuleChain();
  chain.addRules([
    new ScrollUsageValidationRules(),
    new ScrollCastingFailureRules(),
    new ScrollSpellCastingRules(),
  ]);
  return chain;
}
