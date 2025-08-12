import { RuleChain } from '@osric/core/RuleChain';
import { SpellConcentrationRules } from '@osric/rules/spells/AdvancedSpellRules';
import { ComponentTrackingRules } from '@osric/rules/spells/ComponentTrackingRules';
import { SpellCastingRules } from '@osric/rules/spells/SpellCastingRules';
import { SpellEffectsRules } from '@osric/rules/spells/SpellEffectsRules';

export function buildCastSpellChain(): RuleChain {
  const chain = new RuleChain();
  chain.addRule(new ComponentTrackingRules());
  chain.addRule(new SpellCastingRules());
  chain.addRule(new SpellConcentrationRules());
  chain.addRule(new SpellEffectsRules());
  return chain;
}
