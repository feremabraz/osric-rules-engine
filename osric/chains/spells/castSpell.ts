import { RuleChain } from '@osric/core/RuleChain';
import { SpellConcentrationRule } from '@osric/rules/spells/AdvancedSpellRules';
import { ComponentTrackingRules } from '@osric/rules/spells/ComponentTrackingRules';
import { SpellCastingRules } from '@osric/rules/spells/SpellCastingRules';
import { SpellEffectsRule } from '@osric/rules/spells/SpellEffectsRule';

export function buildCastSpellChain(): RuleChain {
  const chain = new RuleChain();
  chain.addRule(new ComponentTrackingRules());
  chain.addRule(new SpellCastingRules());
  chain.addRule(new SpellConcentrationRule());
  chain.addRule(new SpellEffectsRule());
  return chain;
}
