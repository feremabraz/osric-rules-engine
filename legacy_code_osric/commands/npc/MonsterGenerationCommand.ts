import { MonsterGenerationValidator } from '@osric/commands/npc/validators/MonsterGenerationValidator';
import { BaseCommand, type CommandResult, type EntityId } from '@osric/core/Command';
import { ContextKeys } from '@osric/core/ContextKeys';
import type { GameContext } from '@osric/core/GameContext';
import { formatValidationErrors } from '@osric/core/ValidationPrimitives';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';
import type { Monster } from '@osric/types/monster';

export interface MonsterGenerationParameters {
  terrainType:
    | 'dungeon'
    | 'forest'
    | 'plains'
    | 'hills'
    | 'mountains'
    | 'swamp'
    | 'desert'
    | 'arctic'
    | 'ocean'
    | 'city';
  encounterLevel: number;
  partySize: number;
  timeOfDay?: 'day' | 'night' | 'dawn' | 'dusk';
  weather?: 'clear' | 'rain' | 'storm' | 'fog' | 'snow';
  specialConditions?: {
    guardedArea?: boolean;
    lair?: boolean;
    wandering?: boolean;
    civilized?: boolean;
  };
  forceMonsterType?: string;
}

export interface MonsterTemplate {
  name: string;
  hitDice: string;
  armorClass: number;
  numberAppearing: string;
  level: number;
  specialAbilities?: string[];
}

export class MonsterGenerationCommand extends BaseCommand<MonsterGenerationParameters> {
  readonly type = COMMAND_TYPES.MONSTER_GENERATION;
  readonly parameters: MonsterGenerationParameters;

  constructor(
    parameters: MonsterGenerationParameters,
    actorId: EntityId,
    targetIds: EntityId[] = []
  ) {
    super(parameters, actorId, targetIds);
    this.parameters = parameters;
  }

  protected validateParameters(): void {
    const result = MonsterGenerationValidator.validate(this.parameters);
    if (!result.valid) {
      const msgs = formatValidationErrors(result.errors);
      throw new Error(`Parameter validation failed: ${msgs.join(', ')}`);
    }
  }

  async execute(context: GameContext): Promise<CommandResult> {
    try {
      const { timeOfDay = 'day', weather = 'clear', specialConditions = {} } = this.parameters;

      // Basic range validation lives in the validator; we keep simple guardrails here.
      if (this.parameters.encounterLevel < 1 || this.parameters.encounterLevel > 20) {
        return this.createFailureResult('Encounter level must be between 1 and 20');
      }
      if (this.parameters.partySize < 1 || this.parameters.partySize > 12) {
        return this.createFailureResult('Party size must be between 1 and 12');
      }

      // Publish normalized params for rules to consume
      context.setTemporary(ContextKeys.NPC_MONSTER_GENERATION_PARAMS, {
        ...this.parameters,
        timeOfDay,
        weather,
        specialConditions,
      });

      // Provide a basic treasure context so NPC treasure rules can operate.
      context.setTemporary(ContextKeys.NPC_TREASURE_CONTEXT, {
        treasureType: 'C',
        monsterHitDice: Math.max(1, Math.min(12, this.parameters.encounterLevel)),
        numberAppearing: Math.max(1, this.parameters.partySize),
        environment: this.parameters.terrainType,
        partyLevel: this.parameters.encounterLevel,
      });

      // Delegate all mechanics to the rule engine/chain
      return await this.executeWithRuleEngine(context);
    } catch (error) {
      return this.createFailureResult(
        `Monster generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  canExecute(_context: GameContext): boolean {
    return true;
  }

  getRequiredRules(): string[] {
    return [RULE_NAMES.TREASURE_GENERATION];
  }
}
