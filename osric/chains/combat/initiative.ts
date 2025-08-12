import { RuleChain } from '@osric/core/RuleChain';
import {
  InitiativeOrderRule,
  InitiativeRollRule,
  SurpriseCheckRule,
} from '@osric/rules/combat/InitiativeRules';

export function buildInitiativeChain(): RuleChain {
  const chain = new RuleChain();
  chain.addRules([new InitiativeRollRule(), new SurpriseCheckRule(), new InitiativeOrderRule()]);
  return chain;
}
