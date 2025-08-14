import type { Command } from '@osric/core/Command';
import { ContextKeys } from '@osric/core/ContextKeys';
import { DiceEngine } from '@osric/core/Dice';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import type { AbilityScores, CharacterClass } from '@osric/types/character';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';

interface CharacterCreationData {
  abilityScoreMethod: 'standard3d6' | 'arranged3d6' | '4d6dropLowest';
  characterClass: CharacterClass;
}

export class ExceptionalStrengthRules extends BaseRule {
  readonly name = RULE_NAMES.ABILITY_SCORE_MODIFIERS;
  readonly priority = 15;

  async apply(context: GameContext, _command: Command): Promise<RuleResult> {
    const creationData = context.getTemporary(
      ContextKeys.CHARACTER_CREATION_PARAMS
    ) as CharacterCreationData;
    const abilityScores = context.getTemporary(
      ContextKeys.CHARACTER_CREATION_ABILITY_SCORES
    ) as AbilityScores;

    if (!abilityScores) {
      return this.createFailureResult('No ability scores found for exceptional strength check');
    }

    const exceptional = this.rollExceptionalStrength(
      creationData.characterClass,
      abilityScores.strength
    );

    if (exceptional !== null) {
      // Store exceptional percentage alongside scores for downstream rules
      const updated: AbilityScores & { exceptionalStrength?: number } = {
        ...abilityScores,
        exceptionalStrength: exceptional,
      };
      context.setTemporary(ContextKeys.CHARACTER_CREATION_ABILITY_SCORES, updated);

      return this.createSuccessResult(
        `Rolled exceptional strength: 18/${exceptional.toString().padStart(2, '0')}`,
        { exceptionalStrength: exceptional }
      );
    }

    return this.createSuccessResult('No exceptional strength applicable');
  }

  canApply(context: GameContext, command: Command): boolean {
    if (command.type !== COMMAND_TYPES.CREATE_CHARACTER) return false;

    const abilityScores = context.getTemporary(
      ContextKeys.CHARACTER_CREATION_ABILITY_SCORES
    ) as AbilityScores | null;
    const creationParams = context.getTemporary(
      ContextKeys.CHARACTER_CREATION_PARAMS
    ) as CharacterCreationData | null;

    return (
      !!abilityScores &&
      abilityScores.strength === 18 &&
      !!creationParams &&
      this.canHaveExceptionalStrength(creationParams.characterClass)
    );
  }

  private rollExceptionalStrength(characterClass: CharacterClass, strength: number): number | null {
    if (!this.canHaveExceptionalStrength(characterClass)) {
      return null;
    }
    if (strength !== 18) {
      return null;
    }
    return DiceEngine.roll('1d100').total;
  }

  private canHaveExceptionalStrength(characterClass: CharacterClass): boolean {
    return ['Fighter', 'Paladin', 'Ranger'].includes(characterClass);
  }
}
