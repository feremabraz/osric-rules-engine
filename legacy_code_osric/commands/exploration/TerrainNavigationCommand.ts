import { TerrainNavigationValidator } from '@osric/commands/exploration/validators/TerrainNavigationValidator';
import { BaseCommand, type CommandResult, type EntityId } from '@osric/core/Command';
import { ContextKeys } from '@osric/core/ContextKeys';
import type { GameContext } from '@osric/core/GameContext';
import { formatValidationErrors } from '@osric/core/ValidationPrimitives';
import type { CharacterId } from '@osric/types';
import type { Character } from '@osric/types/character';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';

export interface TerrainType {
  name: string;
  movementModifier: number;
  gettingLostChance: number;
  visibilityDistance: number;
  description: string;
}

export interface NavigationParameters {
  characterId: string | CharacterId;
  terrainType: TerrainType;
  distance: number;
  navigationMethod: 'landmark' | 'compass' | 'stars' | 'ranger-tracking' | 'none';
  weatherConditions?: {
    visibility: number;
    movementPenalty: number;
  };
  hasMap: boolean;
  timeOfDay: 'dawn' | 'day' | 'dusk' | 'night';
}

export class TerrainNavigationCommand extends BaseCommand<NavigationParameters> {
  readonly type = COMMAND_TYPES.TERRAIN_NAVIGATION;
  readonly parameters: NavigationParameters;

  constructor(parameters: NavigationParameters, actorId: EntityId, targetIds: EntityId[] = []) {
    super(parameters, actorId, targetIds);
    this.parameters = parameters;
  }

  protected validateParameters(): void {
    const result = TerrainNavigationValidator.validate(this.parameters);
    if (!result.valid) {
      const msgs = formatValidationErrors(result.errors);
      throw new Error(`Parameter validation failed: ${msgs.join(', ')}`);
    }
  }

  async execute(context: GameContext): Promise<CommandResult> {
    try {
      const {
        characterId,
        terrainType,
        distance,
        navigationMethod,
        weatherConditions,
        hasMap,
        timeOfDay,
      } = this.parameters;

      const character = context.getEntity<Character>(characterId);
      if (!character) {
        return this.createFailureResult(`Character with ID "${characterId}" not found`);
      }

      // Publish parameters and delegate to rules
      context.setTemporary(ContextKeys.EXPLORATION_MOVEMENT_REQUEST_PARAMS, {
        characterId,
        terrainType,
        distance,
        navigationMethod,
        weatherConditions,
        hasMap,
        timeOfDay,
      });

      return await this.executeWithRuleEngine(context);
    } catch (error) {
      return this.createFailureResult(
        `Failed to navigate terrain: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  canExecute(context: GameContext): boolean {
    const character = context.getEntity(this.parameters.characterId);
    return character !== null;
  }

  getRequiredRules(): string[] {
    return [RULE_NAMES.TERRAIN_NAVIGATION, RULE_NAMES.SURVIVAL_CHECKS];
  }

  static readonly TERRAIN_TYPES: Record<string, TerrainType> = {
    road: {
      name: 'Road',
      movementModifier: 1.5,
      gettingLostChance: 5,
      visibilityDistance: 3000,
      description: 'Well-maintained road with clear path',
    },
    plains: {
      name: 'Plains',
      movementModifier: 1.0,
      gettingLostChance: 10,
      visibilityDistance: 6000,
      description: 'Open grassland with few landmarks',
    },
    forest: {
      name: 'Forest',
      movementModifier: 0.5,
      gettingLostChance: 30,
      visibilityDistance: 300,
      description: 'Dense woodland with limited visibility',
    },
    hills: {
      name: 'Hills',
      movementModifier: 0.75,
      gettingLostChance: 20,
      visibilityDistance: 1200,
      description: 'Rolling hills with moderate terrain',
    },
    mountains: {
      name: 'Mountains',
      movementModifier: 0.33,
      gettingLostChance: 40,
      visibilityDistance: 9000,
      description: 'Steep mountain terrain requiring careful navigation',
    },
    desert: {
      name: 'Desert',
      movementModifier: 0.67,
      gettingLostChance: 35,
      visibilityDistance: 12000,
      description: 'Arid wasteland with shifting sands',
    },
    swamp: {
      name: 'Swamp',
      movementModifier: 0.25,
      gettingLostChance: 50,
      visibilityDistance: 150,
      description: 'Treacherous wetland with poor footing',
    },
    jungle: {
      name: 'Jungle',
      movementModifier: 0.25,
      gettingLostChance: 60,
      visibilityDistance: 60,
      description: 'Dense tropical forest with extremely limited visibility',
    },
  };
}
