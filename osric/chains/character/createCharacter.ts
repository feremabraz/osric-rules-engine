import { RuleChain } from '@osric/core/RuleChain';
import {
  AbilityScoreGenerationRule,
  ExceptionalStrengthRule,
  RacialAbilityAdjustmentRule,
} from '@osric/rules/character/AbilityScoreGenerationRules';
import { CharacterInitializationRule } from '@osric/rules/character/CharacterInitializationRules';
import { ClassRequirementRule } from '@osric/rules/character/ClassRequirementRules';
import { RacialRestrictionsRule } from '@osric/rules/character/RacialRestrictionsRules';
import { StartingEquipmentRule } from '@osric/rules/character/StartingEquipmentRule';

export function buildCreateCharacterChain(): RuleChain {
  const chain = new RuleChain();
  chain.addRules([
    new AbilityScoreGenerationRule(),
    new ExceptionalStrengthRule(),
    new RacialAbilityAdjustmentRule(),
    new RacialRestrictionsRule(),
    new ClassRequirementRule(),
    new StartingEquipmentRule(),
    new CharacterInitializationRule(),
  ]);
  return chain;
}
