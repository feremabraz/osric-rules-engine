import { RuleChain } from '@osric/core/RuleChain';
import { InitiativeOrderRules } from '@osric/rules/combat/InitiativeOrderRules';
import { InitiativeRollRules } from '@osric/rules/combat/InitiativeRules';
import { SurpriseCheckRules } from '@osric/rules/combat/SurpriseCheckRules';

export function buildInitiativeChain(): RuleChain {
  const chain = new RuleChain();
  chain.addRules([new InitiativeRollRules(), new SurpriseCheckRules(), new InitiativeOrderRules()]);
  return chain;
}
