import { RuleChain } from '@osric/core/RuleChain';
import {
  AbilityScoreGenerationRules,
  ExceptionalStrengthRules,
  RacialAbilityAdjustmentRules,
} from '@osric/rules/character/AbilityScoreGenerationRules';
import { CharacterInitializationRules } from '@osric/rules/character/CharacterInitializationRules';
import { ClassRequirementRules } from '@osric/rules/character/ClassRequirementRules';
import { RacialRestrictionsRules } from '@osric/rules/character/RacialRestrictionsRules';
import { StartingEquipmentRules } from '@osric/rules/character/StartingEquipmentRule';

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
