import { RuleChain } from '@osric/core/RuleChain';
import { MagicItemIdentificationRule } from '@osric/rules/spells/MagicItemRules';

export function buildIdentifyMagicItemChain(): RuleChain {
  const chain = new RuleChain();
  chain.addRule(new MagicItemIdentificationRule());
  return chain;
}
