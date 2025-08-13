import { RuleChain } from '@osric/core/RuleChain';
import { MagicItemIdentificationRules } from '@osric/rules/spells/MagicItemIdentificationRules';

export function buildIdentifyMagicItemChain(): RuleChain {
  const chain = new RuleChain();
  chain.addRule(new MagicItemIdentificationRules());
  return chain;
}
