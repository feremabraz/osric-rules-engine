import { MoveValidator } from '@osric/commands/exploration/validators/MoveValidator';
import { BaseCommand, type CommandResult, type EntityId } from '@osric/core/Command';
import type { GameContext } from '@osric/core/GameContext';
import { formatValidationErrors } from '@osric/core/ValidationPrimitives';
import type { CharacterId } from '@osric/types';
import type { Character } from '@osric/types/character';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';

export interface MoveParameters {
  characterId: string | CharacterId;
  movement: {
    type: 'walk' | 'run' | 'sneak' | 'fly' | 'swim' | 'climb';
    distance: number;
    direction?: string;
    destination?: string;
  };
  terrain: {
    type: 'Normal' | 'Difficult' | 'Very Difficult' | 'Impassable';
    environment: string;
    environmentalFeature?: string;
  };
  timeScale: 'combat' | 'exploration' | 'overland';
  forcedMarch?: boolean;
}

import { ContextKeys } from '@osric/core/ContextKeys';

export class MoveCommand extends BaseCommand<MoveParameters> {
  readonly type = COMMAND_TYPES.MOVE;
  readonly parameters: MoveParameters;

  constructor(parameters: MoveParameters, actorId: EntityId, targetIds: EntityId[] = []) {
    super(parameters, actorId, targetIds);
    this.parameters = parameters;
  }

  protected validateParameters(): void {
    const result = MoveValidator.validate(this.parameters);
    if (!result.valid) {
      const messages = formatValidationErrors(result.errors);
      throw new Error(`Parameter validation failed: ${messages.join(', ')}`);
    }
  }

  async execute(context: GameContext): Promise<CommandResult> {
    try {
      const { characterId, movement, terrain } = this.parameters;

      const character = context.getEntity<Character>(characterId);
      if (!character)
        return this.createFailureResult(`Character with ID "${characterId}" not found`);

      const movementTypeMap: Record<
        MoveParameters['movement']['type'],
        'walk' | 'run' | 'swim' | 'climb' | 'fly'
      > = {
        walk: 'walk',
        run: 'run',
        sneak: 'walk',
        fly: 'fly',
        swim: 'swim',
        climb: 'climb',
      };
      const movementType = movementTypeMap[movement.type];

      const terrainMap: Record<string, string> = {
        Normal: 'clear',
        Difficult: 'difficult',
        'Very Difficult': 'difficult',
        Impassable: 'difficult',
      };

      context.setTemporary(ContextKeys.EXPLORATION_MOVEMENT_REQUEST_PARAMS, {
        characterId,
        fromPosition: character.position,
        toPosition: movement.destination ?? character.position,
        movementType,
        distance: movement.distance,
        terrainType: terrainMap[terrain.type] ?? 'clear',
      });

      return await this.executeWithRuleEngine(context);
    } catch (error) {
      return this.createFailureResult(
        `Failed to move character: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  canExecute(context: GameContext): boolean {
    return this.validateEntitiesExist(context);
  }

  getRequiredRules(): string[] {
    return [RULE_NAMES.MOVEMENT_RATES, RULE_NAMES.ENCUMBRANCE, RULE_NAMES.MOVEMENT_VALIDATION];
  }
}
