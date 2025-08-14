import { RuleChain } from '@osric/core/RuleChain';
import { ApplyDamageRules } from '@osric/rules/combat/ApplyDamageRules';
import { ArmorCategoryRules } from '@osric/rules/combat/ArmorCategoryRules';
import { AttackRollRules } from '@osric/rules/combat/AttackRollRules';
import { DamageCalculationRules } from '@osric/rules/combat/DamageCalculationRules';
import { MultipleAttackRules } from '@osric/rules/combat/MultipleAttackRules';
import { PostDamageStatusRules } from '@osric/rules/combat/PostDamageStatusRules';
import { WeaponVsArmorRules } from '@osric/rules/combat/WeaponVsArmorRules';

export function buildAttackChain(): RuleChain {
  const chain = new RuleChain();
  chain.addRules([
    // Pre-attack context-based adjustments
    new ArmorCategoryRules(),
    new WeaponVsArmorRules(),
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
