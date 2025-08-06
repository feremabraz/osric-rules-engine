import { BaseCommand, type CommandResult } from '../../core/Command';
import type { GameContext } from '../../core/GameContext';
import { COMMAND_TYPES } from '../../types/constants';
import type { Character } from '../../types/entities';

export interface MoveParameters {
  characterId: string;
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

export class MoveCommand extends BaseCommand {
  readonly type = COMMAND_TYPES.MOVE;

  constructor(private parameters: MoveParameters) {
    super(parameters.characterId);
  }

  async execute(context: GameContext): Promise<CommandResult> {
    try {
      const { characterId, movement, terrain, timeScale, forcedMarch = false } = this.parameters;

      const character = context.getEntity<Character>(characterId);
      if (!character) {
        return this.createFailureResult(`Character with ID "${characterId}" not found`);
      }

      if (!this.isTerrainNavigable(terrain.type, movement.type)) {
        return this.createFailureResult(`Cannot ${movement.type} through ${terrain.type} terrain`);
      }

      const movementRates = this.calculateMovementRates(character, timeScale);

      const adjustedMovementRate = this.calculateTerrainAdjustedMovement(
        movementRates.baseRate,
        terrain.type,
        terrain.environment,
        terrain.environmentalFeature
      );

      const finalMovementRate = this.applyMovementTypeModifiers(
        adjustedMovementRate,
        movement.type,
        forcedMarch
      );

      const movementValidation = this.validateMovementDistance(
        movement.distance,
        finalMovementRate,
        timeScale
      );

      if (!movementValidation.canMove) {
        return this.createFailureResult(movementValidation.reason || 'Movement not possible');
      }

      const timeTaken = this.calculateTimeTaken(movement.distance, finalMovementRate, timeScale);

      const movementEffects = this.calculateMovementEffects(
        movement,
        terrain,
        forcedMarch,
        timeTaken
      );

      const finalCharacter = this.applyMovementEffects(character, movement);

      context.setEntity(characterId, finalCharacter);

      const resultData = {
        characterId,
        movement,
        terrain,
        movementRate: finalMovementRate,
        timeTaken,
        effects: movementEffects,
        newPosition: movement.destination || finalCharacter.position,
      };

      const message = this.createMovementMessage(character, movement, timeTaken, movementEffects);

      return this.createSuccessResult(message, resultData, movementEffects.statusEffects);
    } catch (error) {
      return this.createFailureResult(
        `Failed to move character: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  canExecute(context: GameContext): boolean {
    return this.validateEntities(context);
  }

  getRequiredRules(): string[] {
    return ['movement-rates', 'terrain-effects', 'encumbrance', 'environmental-hazards'];
  }

  private isTerrainNavigable(terrainType: string, movementType: string): boolean {
    if (terrainType === 'Impassable' && movementType === 'walk') {
      return false;
    }

    if (movementType === 'fly') {
      return true;
    }

    if (movementType === 'swim') {
      return false;
    }

    return true;
  }

  private calculateMovementRates(character: Character, timeScale: string) {
    const baseMovementRate = character.movementRate || 36;
    const combatRate = Math.floor(baseMovementRate / 3);

    switch (timeScale) {
      case 'combat':
        return { baseRate: combatRate, unit: 'meters per round' };
      case 'exploration':
        return { baseRate: baseMovementRate, unit: 'meters per turn' };
      case 'overland':
        return { baseRate: (baseMovementRate * 48) / 1000, unit: 'kilometers per day' };
      default:
        return { baseRate: baseMovementRate, unit: 'meters per turn' };
    }
  }

  private calculateTerrainAdjustedMovement(
    baseMovementRate: number,
    terrainType: string,
    environment: string,
    environmentalFeature?: string
  ): number {
    let adjustedRate = baseMovementRate;

    switch (terrainType) {
      case 'Normal':
        adjustedRate *= 1.0;
        break;
      case 'Difficult':
        adjustedRate *= 0.75;
        break;
      case 'Very Difficult':
        adjustedRate *= 0.5;
        break;
      case 'Impassable':
        adjustedRate *= 0.0;
        break;
    }

    if (environment === 'Wilderness') {
      if (environmentalFeature?.includes('marsh')) adjustedRate *= 0.5;
      if (environmentalFeature?.includes('forest')) adjustedRate *= 0.75;
      if (environmentalFeature?.includes('mountain')) adjustedRate *= 0.5;
    }

    return Math.round(adjustedRate);
  }

  private applyMovementTypeModifiers(
    baseRate: number,
    movementType: string,
    forcedMarch: boolean
  ): number {
    let modifiedRate = baseRate;

    switch (movementType) {
      case 'run':
        modifiedRate *= 3;
        break;
      case 'sneak':
        modifiedRate *= 0.5;
        break;
      case 'swim':
        modifiedRate *= 0.25;
        break;
      case 'climb':
        modifiedRate *= 0.25;
        break;
      case 'fly':
        break;
      default:
        break;
    }

    if (forcedMarch) {
      modifiedRate *= 1.5;
    }

    return Math.round(modifiedRate);
  }

  private validateMovementDistance(
    requestedDistance: number,
    movementRate: number,
    timeScale: string
  ): { canMove: boolean; reason?: string } {
    if (timeScale === 'combat' && requestedDistance > movementRate) {
      return {
        canMove: false,
        reason: `Cannot move ${requestedDistance}m in one combat round. Maximum: ${movementRate}m`,
      };
    }

    const maxDistance = timeScale === 'overland' ? movementRate : movementRate * 10;

    if (requestedDistance > maxDistance) {
      return {
        canMove: false,
        reason: `Requested distance (${requestedDistance}) exceeds maximum possible movement`,
      };
    }

    return { canMove: true };
  }

  private calculateTimeTaken(
    distance: number,
    movementRate: number,
    timeScale: string
  ): { value: number; unit: string } {
    switch (timeScale) {
      case 'combat': {
        const rounds = Math.ceil(distance / movementRate);
        return { value: rounds, unit: 'rounds' };
      }

      case 'exploration': {
        const turns = Math.ceil(distance / movementRate);
        return { value: turns * 10, unit: 'minutes' };
      }

      case 'overland': {
        const days = distance / movementRate;
        return { value: Math.round(days * 10) / 10, unit: 'days' };
      }

      default:
        return { value: 1, unit: 'turn' };
    }
  }

  private calculateMovementEffects(
    movement: MoveParameters['movement'],
    terrain: MoveParameters['terrain'],
    forcedMarch: boolean,
    _timeTaken: { value: number; unit: string }
  ) {
    const effects = {
      fatigue: 0,
      statusEffects: [] as string[],
      risks: [] as string[],
    };

    if (movement.type === 'run') {
      effects.fatigue += 1;
      effects.statusEffects.push('Fatigued from running');
    }

    if (forcedMarch) {
      effects.fatigue += 2;
      effects.statusEffects.push('Risk of exhaustion from forced march');
    }

    if (terrain.type === 'Difficult' || terrain.type === 'Very Difficult') {
      effects.fatigue += 1;
      effects.statusEffects.push('Tired from difficult terrain');
    }

    return effects;
  }

  private applyMovementEffects(
    character: Character,
    movement: MoveParameters['movement']
  ): Character {
    const updatedCharacter = { ...character };

    if (movement.destination) {
      updatedCharacter.position = movement.destination;
    }

    return updatedCharacter;
  }

  private createMovementMessage(
    character: Character,
    movement: MoveParameters['movement'],
    timeTaken: { value: number; unit: string },
    effects: ReturnType<typeof this.calculateMovementEffects>
  ): string {
    let message = `${character.name} `;

    switch (movement.type) {
      case 'run':
        message += 'ran';
        break;
      case 'sneak':
        message += 'snuck';
        break;
      case 'swim':
        message += 'swam';
        break;
      case 'climb':
        message += 'climbed';
        break;
      case 'fly':
        message += 'flew';
        break;
      default:
        message += 'moved';
    }

    message += ` ${movement.distance}m`;

    if (movement.destination) {
      message += ` to ${movement.destination}`;
    }

    message += ` in ${timeTaken.value} ${timeTaken.unit}`;

    if (effects.statusEffects.length > 0) {
      message += ` (${effects.statusEffects.join(', ')})`;
    }

    return message;
  }
}
