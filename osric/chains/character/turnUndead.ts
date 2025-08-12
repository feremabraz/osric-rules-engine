import { RuleChain } from '@osric/core/RuleChain';
import { TurnUndeadRules } from '@osric/rules/character/TurnUndeadRules';

export function buildTurnUndeadChain(): RuleChain {
  const chain = new RuleChain();
  chain.addRule(new TurnUndeadRules());
  return chain;
}
