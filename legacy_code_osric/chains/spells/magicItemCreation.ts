import { RuleChain } from '@osric/core/RuleChain';
import { MagicItemCreationRules } from '@osric/rules/spells/MagicItemCreationRules';

export function buildMagicItemCreationChain(): RuleChain {
  const chain = new RuleChain();
  chain.addRule(new MagicItemCreationRules());
  return chain;
}
