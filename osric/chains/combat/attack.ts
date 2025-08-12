import { RuleChain } from '@osric/core/RuleChain';
import { ApplyDamageRule } from '@osric/rules/combat/ApplyDamageRule';
import { AttackRollRule } from '@osric/rules/combat/AttackRollRules';
import { DamageCalculationRule } from '@osric/rules/combat/DamageCalculationRules';
import { MultipleAttackRule } from '@osric/rules/combat/MultipleAttackRules';
import { PostDamageStatusRule } from '@osric/rules/combat/PostDamageStatusRule';

export function buildAttackChain(): RuleChain {
  const chain = new RuleChain();
  chain.addRules([
    new AttackRollRule(),
    new DamageCalculationRule(),
    new ApplyDamageRule(),
    new PostDamageStatusRule(),
  ]);
  try {
    chain.addRule(new MultipleAttackRule());
  } catch {
    // optional
  }
  return chain;
}
