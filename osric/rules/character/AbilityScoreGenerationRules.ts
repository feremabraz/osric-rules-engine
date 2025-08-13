import type { Command } from '@osric/core/Command';
import { ContextKeys } from '@osric/core/ContextKeys';
import { DiceEngine } from '@osric/core/Dice';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import type { AbilityScores, CharacterClass, CharacterRace } from '@osric/types/character';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';

interface CharacterCreationData {
  abilityScoreMethod: 'standard3d6' | 'arranged3d6' | '4d6dropLowest';
  race: CharacterRace;
  characterClass: CharacterClass;
  arrangedScores?: AbilityScores;
}

export class AbilityScoreGenerationRules extends BaseRule {
  readonly name = RULE_NAMES.ABILITY_SCORE_GENERATION;
  readonly priority = 10;

  async apply(context: GameContext, _command: Command): Promise<RuleResult> {
    const creationData = this.getRequiredContext<CharacterCreationData>(
      context,
      ContextKeys.CHARACTER_CREATION_PARAMS
    );

    try {
      let abilityScores: AbilityScores;

      switch (creationData.abilityScoreMethod) {
        case 'standard3d6':
          abilityScores = this.generateStandard3d6();
          break;
        case 'arranged3d6':
          if (creationData.arrangedScores) {
            abilityScores = creationData.arrangedScores;
          } else {
            const rolledScores = this.generate3d6Arranged();

            abilityScores = this.assignArrangedScores(rolledScores);
          }
          break;
        case '4d6dropLowest': {
          const bestScores = this.generate4d6DropLowest();
          abilityScores = this.assignArrangedScores(bestScores);
          break;
        }
        default:
          return this.createFailureResult(
            `Unknown ability score method: ${creationData.abilityScoreMethod}`
          );
      }

      this.setContext(context, ContextKeys.CHARACTER_CREATION_ABILITY_SCORES, abilityScores);

      return this.createSuccessResult(
        `Generated ability scores using ${creationData.abilityScoreMethod}`,
        {
          abilityScores,
          method: creationData.abilityScoreMethod,
        }
      );
    } catch (error) {
      return this.createFailureResult(
        `Ability score generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  canApply(context: GameContext, command: Command): boolean {
    if (command.type !== COMMAND_TYPES.CREATE_CHARACTER) return false;

    const creationParams = context.getTemporary(ContextKeys.CHARACTER_CREATION_PARAMS);
    return creationParams != null;
  }

  private generateStandard3d6(): AbilityScores {
    const roll3d6 = () => DiceEngine.roll('3d6').total;

    return {
      strength: roll3d6(),
      dexterity: roll3d6(),
      constitution: roll3d6(),
      intelligence: roll3d6(),
      wisdom: roll3d6(),
      charisma: roll3d6(),
    };
  }

  private generate3d6Arranged(): number[] {
    const roll3d6 = () => DiceEngine.roll('3d6').total;

    return Array(6)
      .fill(0)
      .map(() => roll3d6());
  }

  private generate4d6DropLowest(): number[] {
    const roll4d6DropLowest = () => {
      const rolls = [
        DiceEngine.roll('1d6').total,
        DiceEngine.roll('1d6').total,
        DiceEngine.roll('1d6').total,
        DiceEngine.roll('1d6').total,
      ];
      const minRoll = Math.min(...rolls);
      const minIndex = rolls.indexOf(minRoll);
      return rolls.reduce((sum, val, index) => (index !== minIndex ? sum + val : sum), 0);
    };

    return Array(6)
      .fill(0)
      .map(() => roll4d6DropLowest());
  }

  private assignArrangedScores(scores: number[]): AbilityScores {
    if (scores.length !== 6) {
      throw new Error('Expected exactly 6 ability scores');
    }

    return {
      strength: scores[0],
      dexterity: scores[1],
      constitution: scores[2],
      intelligence: scores[3],
      wisdom: scores[4],
      charisma: scores[5],
    };
  }
}

// RacialAbilityAdjustmentRules and ExceptionalStrengthRules moved to their own files for compliance.
