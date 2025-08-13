import { ForagingValidator } from '@osric/commands/exploration/validators/ForagingValidator';
import { BaseCommand, type CommandResult, type EntityId } from '@osric/core/Command';
import { ContextKeys } from '@osric/core/ContextKeys';
import type { GameContext } from '@osric/core/GameContext';
import { formatValidationErrors } from '@osric/core/ValidationPrimitives';
import type { CharacterId } from '@osric/types';
import type { Character } from '@osric/types/character';
import { RULE_NAMES } from '@osric/types/constants';
import { COMMAND_TYPES } from '@osric/types/constants';

export interface ForagingParameters {
  characterId: string | CharacterId;
  forageType: 'food' | 'water' | 'both';
  terrain: string;
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  timeSpent: number;
  groupSize: number;
  weatherConditions?: {
    type: string;
    impactsForaging: boolean;
  };
  hasForagingTools: boolean;
}

export interface ForagingResult {
  foodFound: number;
  waterFound: number;
  waterQuality: 'fresh' | 'brackish' | 'stagnant' | 'none';
  timeRequired: number;
  encountersRisked: boolean;
  specialFinds: string[];
}

export class ForagingCommand extends BaseCommand<ForagingParameters> {
  readonly type = COMMAND_TYPES.FORAGING;
  readonly parameters: ForagingParameters;

  constructor(parameters: ForagingParameters, actorId: EntityId, targetIds: EntityId[] = []) {
    super(parameters, actorId, targetIds);
    this.parameters = parameters;
  }

  protected validateParameters(): void {
    const result = ForagingValidator.validate(this.parameters);
    if (!result.valid) {
      const msgs = formatValidationErrors(result.errors);
      throw new Error(`Parameter validation failed: ${msgs.join(', ')}`);
    }
  }

  async execute(context: GameContext): Promise<CommandResult> {
    try {
      const {
        characterId,
        forageType,
        terrain,
        season,
        timeSpent,
        groupSize,
        weatherConditions,
        hasForagingTools,
      } = this.parameters;

      const character = context.getEntity<Character>(characterId);
      if (!character) {
        return this.createFailureResult(`Character with ID "${characterId}" not found`);
      }

      // Set standardized context for rule processing
      context.setTemporary(ContextKeys.FORAGING_CONTEXT, {
        character,
        forageType,
        terrain,
        season,
        timeSpent,
        groupSize,
        weatherConditions,
        hasForagingTools,
      });

      // Delegate mechanics to rules
      return await this.executeWithRuleEngine(context);
    } catch (error) {
      return this.createFailureResult(
        `Failed to forage: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  canExecute(context: GameContext): boolean {
    const character = context.getEntity(this.parameters.characterId);
    return character !== null;
  }

  getRequiredRules(): string[] {
    return [RULE_NAMES.FORAGING_RULES, RULE_NAMES.SURVIVAL_CHECKS];
  }

  // Mechanics moved to ForagingRules/SurvivalChecksRules.

  static readonly FORAGING_TERRAIN_DATA = {
    forest: { foodAbundance: 'high', waterAvailability: 'high', dangerLevel: 'moderate' },
    jungle: { foodAbundance: 'very high', waterAvailability: 'high', dangerLevel: 'high' },
    plains: { foodAbundance: 'moderate', waterAvailability: 'low', dangerLevel: 'low' },
    hills: { foodAbundance: 'moderate', waterAvailability: 'moderate', dangerLevel: 'low' },
    mountains: { foodAbundance: 'low', waterAvailability: 'moderate', dangerLevel: 'moderate' },
    desert: { foodAbundance: 'very low', waterAvailability: 'very low', dangerLevel: 'high' },
    swamp: { foodAbundance: 'low', waterAvailability: 'high', dangerLevel: 'high' },
    road: { foodAbundance: 'very low', waterAvailability: 'low', dangerLevel: 'low' },
  };
}
