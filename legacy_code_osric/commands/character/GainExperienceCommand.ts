import { GainExperienceValidator } from '@osric/commands/character/validators/GainExperienceValidator';
import { BaseCommand, type CommandResult, type EntityId } from '@osric/core/Command';
import { ContextKeys } from '@osric/core/ContextKeys';
import type { GameContext } from '@osric/core/GameContext';
import { formatValidationErrors } from '@osric/core/ValidationPrimitives';
import {
  determineLevel,
  getExperienceForNextLevel,
} from '@osric/rules/experience/LevelProgressionRules';
import type { Character } from '@osric/types/character';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';
import type { Monster } from '@osric/types/monster';

export interface GainExperienceParameters {
  characterId: string | import('@osric/types').CharacterId;
  experienceSource: {
    type: 'combat' | 'treasure' | 'story' | 'other';
    amount?: number;
    monsters?: Monster[];
    treasureValue?: number;
    description?: string;
  };
  partyShare?: {
    enabled: boolean;
    partyMemberIds: Array<string | import('@osric/types').CharacterId>;
    shareRatio?: number;
  };
  applyClassModifiers?: boolean;
}

export class GainExperienceCommand extends BaseCommand<GainExperienceParameters> {
  readonly type = COMMAND_TYPES.GAIN_EXPERIENCE;
  readonly parameters: GainExperienceParameters;

  constructor(parameters: GainExperienceParameters) {
    super(
      parameters,
      parameters.characterId as EntityId,
      (parameters.partyShare?.partyMemberIds as EntityId[]) || []
    );
    this.parameters = parameters;
  }

  protected validateParameters(): void {
    const result = GainExperienceValidator.validate(this.parameters);
    if (!result.valid) {
      const messages = formatValidationErrors(result.errors);
      throw new Error(`Parameter validation failed: ${messages.join(', ')}`);
    }
  }

  async execute(context: GameContext): Promise<CommandResult> {
    try {
      const { characterId } = this.parameters;

      const character = context.getEntity<Character>(characterId);
      if (!character) {
        return this.createFailureResult(`Character with ID "${characterId}" not found`);
      }

      // Publish normalized parameters for rules to process
      context.setTemporary(ContextKeys.CHARACTER_EXPERIENCE_GAIN_PARAMS, {
        ...this.parameters,
        partyShare: this.parameters.partyShare
          ? {
              enabled: this.parameters.partyShare.enabled,
              partyMemberIds: this.parameters.partyShare.partyMemberIds,
              equalShare: true,
            }
          : undefined,
      });

      return await this.executeWithRuleEngine(context);
    } catch (error) {
      return this.createFailureResult(
        `Failed to award experience: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  canExecute(context: GameContext): boolean {
    return this.validateEntitiesExist(context);
  }

  getRequiredRules(): string[] {
    return [RULE_NAMES.EXPERIENCE_GAIN, RULE_NAMES.LEVEL_PROGRESSION];
  }

  // Mechanics moved to ExperienceGainRules; command remains thin.
}
