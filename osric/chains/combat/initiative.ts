import { RuleChain } from '@osric/core/RuleChain';
import {
  InitiativeOrderRules,
  InitiativeRollRules,
  SurpriseCheckRules,
} from '@osric/rules/combat/InitiativeRules';

export function buildInitiativeChain(): RuleChain {
  const chain = new RuleChain();
  chain.addRules([new InitiativeRollRules(), new SurpriseCheckRules(), new InitiativeOrderRules()]);
  return chain;
}
