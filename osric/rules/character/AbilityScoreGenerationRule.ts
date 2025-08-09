import type { BaseCommand } from '@osric/core/Command';
import { DiceEngine } from '@osric/core/Dice';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';

export interface AbilityScores {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

export interface AbilityScoreGenerationParameters {
  method: 'standard3d6' | 'arranged3d6' | '4d6dropLowest';
  arrangedScores?: AbilityScores;
}

export class AbilityScoreGenerationRule extends BaseRule {
  readonly name = 'ability-score-generation';

  canApply(_context: GameContext, command: BaseCommand<AbilityScoreGenerationParameters>): boolean {
    return command.parameters.method !== undefined;
  }

  async apply(
    context: GameContext,
    command: BaseCommand<AbilityScoreGenerationParameters>
  ): Promise<RuleResult> {
    const { method, arrangedScores } = command.parameters;

    try {
      let abilityScores: AbilityScores;

      switch (method) {
        case 'standard3d6':
          abilityScores = this.generateStandard3d6();
          break;
        case 'arranged3d6': {
          if (!arrangedScores) {
            return this.createFailureResult(
              'Arranged scores must be provided for arranged3d6 method'
            );
          }
          const validatedScores = this.validateArrangedScores(arrangedScores);
          if (!validatedScores) {
            return this.createFailureResult('Invalid arranged scores provided');
          }
          abilityScores = validatedScores;
          break;
        }
        case '4d6dropLowest':
          abilityScores = this.generate4d6DropLowest();
          break;
        default:
          return this.createFailureResult(`Unknown ability score generation method: ${method}`);
      }

      // Store in temporary data for character creation
      this.setContext(context, 'character:creation:ability-scores', abilityScores);

      return this.createSuccessResult(`Generated ability scores using ${method}`, {
        ...abilityScores,
        total: Object.values(abilityScores).reduce((sum: number, score: number) => sum + score, 0),
      });
    } catch (error) {
      return this.createFailureResult(
        `Failed to generate ability scores: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private generateStandard3d6(): AbilityScores {
    return {
      strength: DiceEngine.roll('3d6').total,
      dexterity: DiceEngine.roll('3d6').total,
      constitution: DiceEngine.roll('3d6').total,
      intelligence: DiceEngine.roll('3d6').total,
      wisdom: DiceEngine.roll('3d6').total,
      charisma: DiceEngine.roll('3d6').total,
    };
  }

  private generate4d6DropLowest(): AbilityScores {
    const rollAbility = () => {
      const rolls = [
        DiceEngine.roll('1d6').total,
        DiceEngine.roll('1d6').total,
        DiceEngine.roll('1d6').total,
        DiceEngine.roll('1d6').total,
      ].sort((a, b) => b - a);

      return rolls.slice(0, 3).reduce((sum, roll) => sum + roll, 0);
    };

    return {
      strength: rollAbility(),
      dexterity: rollAbility(),
      constitution: rollAbility(),
      intelligence: rollAbility(),
      wisdom: rollAbility(),
      charisma: rollAbility(),
    };
  }

  private validateArrangedScores(scores: AbilityScores): AbilityScores | null {
    const abilities: (keyof AbilityScores)[] = [
      'strength',
      'dexterity',
      'constitution',
      'intelligence',
      'wisdom',
      'charisma',
    ];

    for (const ability of abilities) {
      const score = scores[ability];
      if (typeof score !== 'number' || score < 3 || score > 18) {
        return null;
      }
    }

    // Check if scores are valid standard array or point buy
    const total = Object.values(scores).reduce((sum: number, score: number) => sum + score, 0);
    if (total < 63 || total > 90) {
      // Reasonable bounds
      return null;
    }

    return scores;
  }
}
