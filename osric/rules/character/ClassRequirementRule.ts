import type { Command } from '@osric/core/Command';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';

import type { AbilityScores, CharacterClass } from '@osric/types/entities';

export interface ClassRequirementParameters {
  characterClass: CharacterClass;
  abilityScores: AbilityScores;
}

export interface ClassRequirementResult {
  meetsRequirements: boolean;
  minimumRequirements: Record<string, number>;
  actualScores: Record<string, number>;
  missingRequirements?: string[];
}

export class ClassRequirementRule extends BaseRule {
  readonly name = 'class-requirement-validation';
  readonly priority = 750;

  canApply(context: GameContext, command: Command<ClassRequirementParameters>): boolean {
    const abilityScores = this.getRequiredContext<AbilityScores>(
      context,
      'character:creation:ability-scores'
    );
    return abilityScores !== null && command.parameters.characterClass !== undefined;
  }

  async apply(
    context: GameContext,
    command: Command<ClassRequirementParameters>
  ): Promise<RuleResult> {
    const { characterClass, abilityScores } = command.parameters;

    try {
      const requirements = this.getClassRequirements(characterClass);
      const result = this.validateRequirements(abilityScores, requirements);

      if (result.meetsRequirements) {
        this.setContext(context, 'character:creation:class-validation', {
          class: characterClass,
          validated: true,
          requirements: result,
        });

        return this.createSuccessResult(
          `Character meets all requirements for ${characterClass}`,
          result as unknown as Record<string, unknown>
        );
      }

      return this.createFailureResult(
        `Character does not meet requirements for ${characterClass}: ${result.missingRequirements?.join(', ')}`,
        result as unknown as Record<string, unknown>
      );
    } catch (error) {
      return this.createFailureResult(
        `Failed to validate class requirements: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private getClassRequirements(characterClass: CharacterClass): Record<string, number> {
    const requirements: Partial<Record<CharacterClass, Record<string, number>>> = {
      Fighter: { strength: 9 },
      Paladin: { strength: 12, constitution: 9, wisdom: 13, charisma: 17 },
      Ranger: { strength: 13, constitution: 14, dexterity: 13, wisdom: 14 },
      'Magic-User': { intelligence: 9 },
      Illusionist: { intelligence: 15, dexterity: 16 },
      Cleric: { wisdom: 9 },
      Druid: { wisdom: 12, charisma: 15 },
      Thief: { dexterity: 9 },
      Assassin: { strength: 12, intelligence: 12, dexterity: 12 },
      Monk: { strength: 15, wisdom: 15, dexterity: 15 },
    };

    return requirements[characterClass] || {};
  }

  private validateRequirements(
    abilityScores: AbilityScores,
    requirements: Record<string, number>
  ): ClassRequirementResult {
    const missingRequirements: string[] = [];
    const actualScores: Record<string, number> = {};

    for (const [ability, minScore] of Object.entries(requirements)) {
      const actualScore = abilityScores[ability as keyof AbilityScores];
      actualScores[ability] = actualScore;

      if (actualScore < minScore) {
        missingRequirements.push(`${ability} ${actualScore} < ${minScore}`);
      }
    }

    return {
      meetsRequirements: missingRequirements.length === 0,
      minimumRequirements: requirements,
      actualScores,
      missingRequirements: missingRequirements.length > 0 ? missingRequirements : undefined,
    };
  }
}
