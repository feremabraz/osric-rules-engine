import { RuleChain } from '@osric/core/RuleChain';
import { ScrollCastingFailureRules } from '@osric/rules/spells/ScrollCastingFailureRules';
import { ScrollSpellCastingRules } from '@osric/rules/spells/ScrollSpellCastingRules';
import { ScrollUsageValidationRules } from '@osric/rules/spells/ScrollUsageValidationRules';

export function buildReadScrollChain(): RuleChain {
  const chain = new RuleChain();
  chain.addRules([
    new ScrollUsageValidationRules(),
    new ScrollCastingFailureRules(),
    new ScrollSpellCastingRules(),
  ]);
  return chain;
}
