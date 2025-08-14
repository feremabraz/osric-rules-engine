import { LevelUpValidator } from '@osric/commands/character/validators/LevelUpValidator';
import { BaseCommand, type CommandResult, type EntityId } from '@osric/core/Command';
import { ContextKeys } from '@osric/core/ContextKeys';
import type { GameContext } from '@osric/core/GameContext';
import { isFailure } from '@osric/core/Rule';
import { formatValidationErrors } from '@osric/core/ValidationPrimitives';
import {
  determineLevel,
  getExperienceForNextLevel,
  getLevelProgressionTable,
  getLevelTitle,
  getTrainingRequirements,
  meetsTrainingRequirements,
} from '@osric/rules/experience/LevelProgressionRules.js';
import type { Character } from '@osric/types/character';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';

export interface LevelUpParameters {
  characterId: string | import('@osric/types').CharacterId;
  targetLevel?: number;
  bypassTraining?: boolean;
  trainerDetails?: {
    hasTrainer: boolean;
    trainerLevel?: number;
    availableGold?: number;
  };
  rollHitPoints?: boolean;
}

export class LevelUpCommand extends BaseCommand<LevelUpParameters> {
  readonly type = COMMAND_TYPES.LEVEL_UP;
  readonly parameters: LevelUpParameters;

  constructor(parameters: LevelUpParameters) {
    super(parameters, parameters.characterId as EntityId);
    this.parameters = parameters;
  }

  protected validateParameters(): void {
    const result = LevelUpValidator.validate(this.parameters);
    if (!result.valid) {
      const msgs = formatValidationErrors(result.errors);
      throw new Error(`Parameter validation failed: ${msgs.join(', ')}`);
    }
  }

  async execute(context: GameContext): Promise<CommandResult> {
    try {
      const {
        characterId,
        targetLevel,
        bypassTraining = false,
        trainerDetails,
        rollHitPoints = true,
      } = this.parameters;

      const character = context.getEntity<Character>(characterId);
      if (!character) {
        return this.createFailureResult(`Character with ID "${characterId}" not found`);
      }

      const currentLevel = character.experience.level;
      const maxPossibleLevel = determineLevel(character.class, character.experience.current);
      const finalTargetLevel = targetLevel || Math.min(currentLevel + 1, maxPossibleLevel);

      if (finalTargetLevel <= currentLevel) {
        return this.createFailureResult(
          `Cannot advance to level ${finalTargetLevel}. Character is already level ${currentLevel}.`
        );
      }

      if (finalTargetLevel > maxPossibleLevel) {
        return this.createFailureResult(
          `Insufficient experience for level ${finalTargetLevel}. Current experience allows level ${maxPossibleLevel}.`
        );
      }

      if (finalTargetLevel > currentLevel + 1) {
        return this.createFailureResult(
          'Characters can only advance one level at a time. Use multiple level-up commands for higher advancement.'
        );
      }

      if (!bypassTraining) {
        const trainingCheck = this.validateTrainingRequirements(
          character,
          finalTargetLevel,
          trainerDetails
        );

        if (isFailure(trainingCheck)) {
          return trainingCheck;
        }
      }

      // Publish normalized request for rules to resolve advancement
      context.setTemporary(ContextKeys.SPELL_CALC_CHARACTER, {
        characterId,
        targetLevel: finalTargetLevel,
        bypassTraining,
        trainerDetails,
        rollHitPoints,
      });

      return await this.executeWithRuleEngine(context);
    } catch (error) {
      return this.createFailureResult(
        `Failed to level up character: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  canExecute(context: GameContext): boolean {
    return this.validateEntitiesExist(context);
  }

  getRequiredRules(): string[] {
    return [
      RULE_NAMES.LEVEL_PROGRESSION,
      RULE_NAMES.TRAINING_REQUIREMENTS,
      RULE_NAMES.HIT_POINT_ADVANCEMENT,
    ];
  }

  private validateTrainingRequirements(
    character: Character,
    targetLevel: number,
    trainerDetails?: LevelUpParameters['trainerDetails']
  ): CommandResult {
    const currentLevel = character.experience.level;
    const requirements = getTrainingRequirements(character.class, currentLevel, targetLevel);

    const hasTrainer = trainerDetails?.hasTrainer ?? false;
    const availableGold = trainerDetails?.availableGold ?? character.currency.gold;

    const trainingMet = meetsTrainingRequirements(requirements, {
      timeAvailable: 52,
      goldAvailable: availableGold,
      hasTrainer,
    });

    if (!trainingMet) {
      return this.createFailureResult(
        `Training requirements not met: Need ${requirements.timeRequired} weeks, ${requirements.costRequired} gold${requirements.trainerRequired ? ', and a trainer' : ''}`,
        undefined,
        {
          requirements,
        }
      );
    }

    return this.createSuccessResult('Training requirements validated');
  }

  // Mechanics for HP gain, spell slots, and state updates are handled by rules.
}
