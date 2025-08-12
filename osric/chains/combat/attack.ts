import { RuleChain } from '@osric/core/RuleChain';
import { ApplyDamageRules } from '@osric/rules/combat/ApplyDamageRules';
import { AttackRollRules } from '@osric/rules/combat/AttackRollRules';
import { DamageCalculationRules } from '@osric/rules/combat/DamageCalculationRules';
import { MultipleAttackRules } from '@osric/rules/combat/MultipleAttackRules';
import { PostDamageStatusRules } from '@osric/rules/combat/PostDamageStatusRules';

export function buildAttackChain(): RuleChain {
  const chain = new RuleChain();
  chain.addRules([
    new AttackRollRules(),
    new DamageCalculationRules(),
    new ApplyDamageRules(),
    new PostDamageStatusRules(),
  ]);
  try {
    chain.addRule(new MultipleAttackRules());
  } catch {
    // optional
  }
  return chain;
}
