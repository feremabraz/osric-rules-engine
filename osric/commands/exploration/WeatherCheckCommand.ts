import { WeatherCheckValidator } from '@osric/commands/exploration/validators/WeatherCheckValidator';
import { BaseCommand, type CommandResult, type EntityId } from '@osric/core/Command';
import type { GameContext } from '@osric/core/GameContext';
import { formatValidationErrors } from '@osric/core/ValidationPrimitives';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';

export interface WeatherCondition {
  type:
    | 'clear'
    | 'overcast'
    | 'light-rain'
    | 'heavy-rain'
    | 'drizzle'
    | 'fog'
    | 'light-snow'
    | 'heavy-snow'
    | 'blizzard'
    | 'wind'
    | 'storm';
  intensity: 'light' | 'moderate' | 'heavy' | 'severe';
  duration: number;
  temperature: 'freezing' | 'cold' | 'cool' | 'mild' | 'warm' | 'hot' | 'scorching';
}

export interface WeatherEffects {
  movementMultiplier: number;
  visibilityRange: number;
  combatPenalty: number;
  spellcastingPenalty: number;
  rangedAttackPenalty: number;
  fireResistance: boolean;
  coldDamage: boolean;
  heatDamage: boolean;
}

export interface WeatherCheckParameters {
  characterId: string | import('@osric/types').CharacterId;
  currentWeather: WeatherCondition;
  activityType: 'travel' | 'combat' | 'spellcasting' | 'ranged-attack' | 'rest' | 'foraging';
  exposureTime?: number;
}

export class WeatherCheckCommand extends BaseCommand<WeatherCheckParameters> {
  readonly type = COMMAND_TYPES.WEATHER_CHECK;
  readonly parameters: WeatherCheckParameters;

  constructor(parameters: WeatherCheckParameters, actorId: EntityId, targetIds: EntityId[] = []) {
    super(parameters, actorId, targetIds);
    this.parameters = parameters;
  }

  protected validateParameters(): void {
    const result = WeatherCheckValidator.validate(this.parameters);
    if (!result.valid) {
      const msgs = formatValidationErrors(result.errors);
      throw new Error(`Parameter validation failed: ${msgs.join(', ')}`);
    }
  }

  async execute(context: GameContext): Promise<CommandResult> {
    try {
      // Delegate mechanics to the rule engine; rules read command.parameters
      return await this.executeWithRuleEngine(context);
    } catch (error) {
      return this.createFailureResult(
        `Failed to check weather effects: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  canExecute(context: GameContext): boolean {
    const character = context.getEntity(this.parameters.characterId);
    return character !== null;
  }

  getRequiredRules(): string[] {
    return [RULE_NAMES.WEATHER_EFFECTS];
  }
}
