import { RuleChain } from '@osric/core/RuleChain';
import { SpellMemorizationRules } from '@osric/rules/spells/SpellMemorizationRules';
import { SpellProgressionRules } from '@osric/rules/spells/SpellProgressionRules';

export function buildMemorizeSpellChain(): RuleChain {
  const chain = new RuleChain();
  chain.addRule(new SpellMemorizationRules());
  chain.addRule(new SpellProgressionRules());
  return chain;
}
