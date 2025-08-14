import { RuleChain } from '@osric/core/RuleChain';
import { AbilityScoreGenerationRules } from '@osric/rules/character/AbilityScoreGenerationRules';
import { CharacterInitializationRules } from '@osric/rules/character/CharacterInitializationRules';
import { ClassRequirementRules } from '@osric/rules/character/ClassRequirementRules';
import { ExceptionalStrengthRules } from '@osric/rules/character/ExceptionalStrengthRules';
import { RacialAbilityAdjustmentRules } from '@osric/rules/character/RacialAbilityAdjustmentRules';
import { RacialRestrictionsRules } from '@osric/rules/character/RacialRestrictionsRules';
import { StartingEquipmentRules } from '@osric/rules/character/StartingEquipmentRules';

export function buildCreateCharacterChain(): RuleChain {
  const chain = new RuleChain();
  chain.addRules([
    new AbilityScoreGenerationRules(),
    new ExceptionalStrengthRules(),
    new RacialAbilityAdjustmentRules(),
    new RacialRestrictionsRules(),
    new ClassRequirementRules(),
    new StartingEquipmentRules(),
    new CharacterInitializationRules(),
  ]);
  return chain;
}
