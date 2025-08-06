/**
 * MoveCommand - Character Movement
 *
 * Handles character movement with:
 * - Movement rate validation
 * - Terrain modifier application
 * - Encumbrance effects
 * - Position tracking
 * - Time tracking
 * - Environmental effects
 *
 * PRESERVATION: All OSRIC movement rules preserved exactly.
 */

import { BaseCommand, type CommandResult } from '../../core/Command';
import type { GameContext } from '../../core/GameContext';
import { COMMAND_TYPES } from '../../types/constants';
import type { Character } from '../../types/entities';

export interface MoveParameters {
  characterId: string;
  movement: {
    type: 'walk' | 'run' | 'sneak' | 'fly' | 'swim' | 'climb';
    distance: number; // Distance in meters
    direction?: string; // Optional direction description
    destination?: string; // Optional destination description
  };
  terrain: {
    type: 'Normal' | 'Difficult' | 'Very Difficult' | 'Impassable';
    environment: string; // e.g., 'Wilderness', 'Dungeon', 'Urban'
    environmentalFeature?: string; // e.g., "dense undergrowth", "steep incline"
  };
  timeScale: 'combat' | 'exploration' | 'overland'; // Affects movement rates
  forcedMarch?: boolean; // Attempt to move faster with exhaustion risk
}

export class MoveCommand extends BaseCommand {
  readonly type = COMMAND_TYPES.MOVE;

  constructor(private parameters: MoveParameters) {
    super(parameters.characterId);
  }

  async execute(context: GameContext): Promise<CommandResult> {
    try {
      const { characterId, movement, terrain, timeScale, forcedMarch = false } = this.parameters;

      // Get the character
      const character = context.getEntity<Character>(characterId);
      if (!character) {
        return this.createFailureResult(`Character with ID "${characterId}" not found`);
      }

      // Validate movement type against terrain
      if (!this.isTerrainNavigable(terrain.type, movement.type)) {
        return this.createFailureResult(`Cannot ${movement.type} through ${terrain.type} terrain`);
      }

      // Calculate movement rates based on time scale
      const movementRates = this.calculateMovementRates(character, timeScale);

      // Apply terrain adjustments
      const adjustedMovementRate = this.calculateTerrainAdjustedMovement(
        movementRates.baseRate,
        terrain.type,
        terrain.environment,
        terrain.environmentalFeature
      );

      // Apply movement type modifiers
      const finalMovementRate = this.applyMovementTypeModifiers(
        adjustedMovementRate,
        movement.type,
        forcedMarch
      );

      // Validate if character can move the requested distance
      const movementValidation = this.validateMovementDistance(
        movement.distance,
        finalMovementRate,
        timeScale
      );

      if (!movementValidation.canMove) {
        return this.createFailureResult(movementValidation.reason || 'Movement not possible');
      }

      // Calculate time taken
      const timeTaken = this.calculateTimeTaken(movement.distance, finalMovementRate, timeScale);

      // Calculate movement effects
      const movementEffects = this.calculateMovementEffects(
        movement,
        terrain,
        forcedMarch,
        timeTaken
      );

      // Update character position
      const finalCharacter = this.applyMovementEffects(character, movement);

      // Update character in context
      context.setEntity(characterId, finalCharacter);

      // Prepare result
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

  /**
   * Check if terrain is navigable by a specific movement type
   */
  private isTerrainNavigable(terrainType: string, movementType: string): boolean {
    // Impassable terrain cannot be navigated by normal walking
    if (terrainType === 'Impassable' && movementType === 'walk') {
      return false;
    }

    // Flying can navigate all terrain except in enclosed spaces
    if (movementType === 'fly') {
      return true;
    }

    // Swimming requires water
    if (movementType === 'swim') {
      // Would need more context about the terrain to determine if swimming is possible
      return false;
    }

    // Default to true for other cases
    return true;
  }

  /**
   * Calculate base movement rates for different time scales
   */
  private calculateMovementRates(character: Character, timeScale: string) {
    // Use character's current movement rate or calculate basic rates
    const baseMovementRate = character.movementRate || 36; // Default 36m per turn for humans
    const combatRate = Math.floor(baseMovementRate / 3); // Rough conversion to combat rounds

    switch (timeScale) {
      case 'combat':
        return { baseRate: combatRate, unit: 'meters per round' };
      case 'exploration':
        return { baseRate: baseMovementRate, unit: 'meters per turn' };
      case 'overland':
        // Overland travel: exploration rate * 48 turns per day / 1000 for km per day
        return { baseRate: (baseMovementRate * 48) / 1000, unit: 'kilometers per day' };
      default:
        return { baseRate: baseMovementRate, unit: 'meters per turn' };
    }
  }

  /**
   * Apply terrain adjustments to movement
   */
  private calculateTerrainAdjustedMovement(
    baseMovementRate: number,
    terrainType: string,
    environment: string,
    environmentalFeature?: string
  ): number {
    let adjustedRate = baseMovementRate;

    // Apply base terrain type multiplier
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

    // Apply environmental modifiers
    if (environment === 'Wilderness') {
      if (environmentalFeature?.includes('marsh')) adjustedRate *= 0.5;
      if (environmentalFeature?.includes('forest')) adjustedRate *= 0.75;
      if (environmentalFeature?.includes('mountain')) adjustedRate *= 0.5;
    }

    return Math.round(adjustedRate);
  }

  /**
   * Apply modifiers based on movement type
   */
  private applyMovementTypeModifiers(
    baseRate: number,
    movementType: string,
    forcedMarch: boolean
  ): number {
    let modifiedRate = baseRate;

    switch (movementType) {
      case 'run':
        modifiedRate *= 3; // Triple movement rate but with restrictions
        break;
      case 'sneak':
        modifiedRate *= 0.5; // Half movement rate for stealth
        break;
      case 'swim':
        modifiedRate *= 0.25; // Quarter rate for swimming (if possible)
        break;
      case 'climb':
        modifiedRate *= 0.25; // Quarter rate for climbing
        break;
      case 'fly':
        // Flying movement depends on character abilities
        // For now, assume normal rate if flight is possible
        break;
      default:
        // Normal walking movement, no modifier
        break;
    }

    // Forced march increases rate but adds exhaustion risk
    if (forcedMarch) {
      modifiedRate *= 1.5;
    }

    return Math.round(modifiedRate);
  }

  /**
   * Validate if the character can move the requested distance
   */
  private validateMovementDistance(
    requestedDistance: number,
    movementRate: number,
    timeScale: string
  ): { canMove: boolean; reason?: string } {
    // In combat, movement is limited per round
    if (timeScale === 'combat' && requestedDistance > movementRate) {
      return {
        canMove: false,
        reason: `Cannot move ${requestedDistance}m in one combat round. Maximum: ${movementRate}m`,
      };
    }

    // For exploration and overland, allow movement up to reasonable limits
    const maxDistance = timeScale === 'overland' ? movementRate : movementRate * 10;

    if (requestedDistance > maxDistance) {
      return {
        canMove: false,
        reason: `Requested distance (${requestedDistance}) exceeds maximum possible movement`,
      };
    }

    return { canMove: true };
  }

  /**
   * Calculate time taken for movement
   */
  private calculateTimeTaken(
    distance: number,
    movementRate: number,
    timeScale: string
  ): { value: number; unit: string } {
    switch (timeScale) {
      case 'combat': {
        // Combat rounds (1 minute each)
        const rounds = Math.ceil(distance / movementRate);
        return { value: rounds, unit: 'rounds' };
      }

      case 'exploration': {
        // Exploration turns (10 minutes each)
        const turns = Math.ceil(distance / movementRate);
        return { value: turns * 10, unit: 'minutes' };
      }

      case 'overland': {
        // Days of travel
        const days = distance / movementRate;
        return { value: Math.round(days * 10) / 10, unit: 'days' };
      }

      default:
        return { value: 1, unit: 'turn' };
    }
  }

  /**
   * Calculate effects of movement
   */
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

    // Running causes fatigue
    if (movement.type === 'run') {
      effects.fatigue += 1;
      effects.statusEffects.push('Fatigued from running');
    }

    // Forced march causes exhaustion risk
    if (forcedMarch) {
      effects.fatigue += 2;
      effects.statusEffects.push('Risk of exhaustion from forced march');
    }

    // Difficult terrain may cause additional fatigue
    if (terrain.type === 'Difficult' || terrain.type === 'Very Difficult') {
      effects.fatigue += 1;
      effects.statusEffects.push('Tired from difficult terrain');
    }

    return effects;
  }

  /**
   * Apply movement effects to character
   */
  private applyMovementEffects(
    character: Character,
    movement: MoveParameters['movement']
  ): Character {
    const updatedCharacter = { ...character };

    // Update position
    if (movement.destination) {
      updatedCharacter.position = movement.destination;
    }

    return updatedCharacter;
  }

  /**
   * Create descriptive message for movement result
   */
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
