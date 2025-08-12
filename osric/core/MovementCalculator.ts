import type { GridSystem } from '@osric/core/GridSystem';
import type { Position } from '@osric/core/Position';
import type { Direction } from '@osric/core/Position';
import { PositionUtils } from '@osric/core/Position';

export enum MovementType {
  Walking = 'walking',
  Running = 'running',
  Charging = 'charging',
  Swimming = 'swimming',
  Flying = 'flying',
  Climbing = 'climbing',
  Crawling = 'crawling',
}

export enum TerrainType {
  Clear = 'clear',
  Difficult = 'difficult',
  Treacherous = 'treacherous',
  Impassable = 'impassable',
  Water = 'water',
  Lava = 'lava',
  Marsh = 'marsh',
  Forest = 'forest',
  Mountain = 'mountain',
  Desert = 'desert',
}

export interface MovementResult {
  kind: 'success' | 'failure';
  finalPosition: Position;
  timeElapsed: number;
  movementUsed: number;
  path?: Position[];
  terrainEncountered?: TerrainType[];
  penalties?: string[];
}

export interface MovementCapabilities {
  baseMovementRate: number;
  runningMultiplier: number;
  encumbranceModifier: number;
  flyingSpeed?: number;
  swimmingSpeed?: number;
  climbingSpeed?: number;
  specialMovement?: string[];
}

export interface MovementContext {
  character: {
    capabilities: MovementCapabilities;
    position: Position;
    facing?: Direction;
  };
  environment: {
    terrain: Map<string, TerrainType>;
    lighting: 'bright' | 'dim' | 'dark';
    weather?: string;
    indoor: boolean;
  };
  tactical: {
    inCombat: boolean;
    hasActed: boolean;
    roundsElapsed: number;
  };
}

export class MovementCalculator {
  private gridSystem?: GridSystem;

  constructor(gridSystem?: GridSystem) {
    this.gridSystem = gridSystem;
  }

  calculateMovement(
    from: Position,
    to: Position,
    movementType: MovementType,
    context: MovementContext
  ): MovementResult {
    const distance = this.calculateDistance(from, to);
    const path = this.calculatePath(from, to);

    if (!path) {
      return {
        kind: 'failure',
        finalPosition: from,
        timeElapsed: 0,
        movementUsed: 0,
        penalties: ['No valid path to destination'],
      };
    }

    const terrainModifiers = this.calculateTerrainModifiers(path, context.environment.terrain);
    const movementRate = this.getEffectiveMovementRate(movementType, context);
    const totalCost = this.calculateMovementCost(distance, terrainModifiers, movementType);

    if (totalCost > movementRate) {
      const reachablePosition = this.findReachablePosition(from, to, movementRate, context);

      return {
        kind: 'failure',
        finalPosition: reachablePosition,
        timeElapsed: 1,
        movementUsed: movementRate,
        path: this.calculatePath(from, reachablePosition) || [from],
        terrainEncountered: this.getTerrainTypes(
          this.calculatePath(from, reachablePosition) || [from],
          context.environment.terrain
        ),
        penalties: ['Insufficient movement to reach destination'],
      };
    }

    const timeElapsed = this.calculateTimeElapsed(
      totalCost,
      movementRate,
      movementType,
      context.tactical.inCombat
    );

    return {
      kind: 'success',
      finalPosition: to,
      timeElapsed,
      movementUsed: totalCost,
      path,
      terrainEncountered: this.getTerrainTypes(path, context.environment.terrain),
    };
  }

  private getEffectiveMovementRate(movementType: MovementType, context: MovementContext): number {
    const base = context.character.capabilities.baseMovementRate;
    const encumbrance = context.character.capabilities.encumbranceModifier;

    let rate = base * encumbrance;

    switch (movementType) {
      case MovementType.Running:
        rate *= context.character.capabilities.runningMultiplier;
        break;
      case MovementType.Charging:
        rate *= 2;
        break;
      case MovementType.Swimming:
        rate = context.character.capabilities.swimmingSpeed || base * 0.25;
        break;
      case MovementType.Flying:
        rate = context.character.capabilities.flyingSpeed || base;
        break;
      case MovementType.Climbing:
        rate = context.character.capabilities.climbingSpeed || base * 0.25;
        break;
      case MovementType.Crawling:
        rate *= 0.25;
        break;
      default:
        break;
    }

    if (context.environment.lighting === 'dim') {
      rate *= 0.75;
    } else if (context.environment.lighting === 'dark') {
      rate *= 0.5;
    }

    return Math.floor(rate);
  }

  private calculateDistance(from: Position, to: Position): number {
    if (this.gridSystem) {
      return this.gridSystem.getDistance(from, to);
    }

    return PositionUtils.euclideanDistance(from, to);
  }

  private calculatePath(from: Position, to: Position): Position[] | null {
    if (this.gridSystem) {
      return this.gridSystem.findPath(from, to);
    }

    return [from, to];
  }

  private calculateTerrainModifiers(
    path: Position[],
    terrainMap: Map<string, TerrainType>
  ): number {
    let modifier = 1.0;

    for (const position of path) {
      const key = `${position.x},${position.y},${position.z || 0}`;
      const terrain = terrainMap.get(key) || TerrainType.Clear;

      switch (terrain) {
        case TerrainType.Clear:
          break;
        case TerrainType.Difficult:
          modifier *= 2;
          break;
        case TerrainType.Treacherous:
          modifier *= 3;
          break;
        case TerrainType.Marsh:
          modifier *= 2.5;
          break;
        case TerrainType.Forest:
          modifier *= 1.5;
          break;
        case TerrainType.Mountain:
          modifier *= 3;
          break;
        case TerrainType.Desert:
          modifier *= 1.5;
          break;
        case TerrainType.Water:
          modifier *= 4;
          break;
        case TerrainType.Impassable:
          return Number.POSITIVE_INFINITY;
        case TerrainType.Lava:
          return Number.POSITIVE_INFINITY;
      }
    }

    return modifier;
  }

  private calculateMovementCost(
    distance: number,
    terrainModifier: number,
    movementType: MovementType
  ): number {
    if (terrainModifier === Number.POSITIVE_INFINITY) {
      return Number.POSITIVE_INFINITY;
    }

    let cost = distance * terrainModifier;

    switch (movementType) {
      case MovementType.Flying:
        cost = distance;
        break;
      case MovementType.Swimming:
        cost = distance;
        break;
      case MovementType.Charging:
        cost = distance;
        break;
    }

    return Math.ceil(cost);
  }

  private calculateTimeElapsed(
    movementUsed: number,
    movementRate: number,
    movementType: MovementType,
    inCombat: boolean
  ): number {
    if (inCombat) {
      return 1;
    }

    const baseTime = movementUsed / movementRate;

    switch (movementType) {
      case MovementType.Running:
        return Math.max(1, Math.ceil(baseTime));
      default:
        return Math.max(1, Math.ceil(baseTime));
    }
  }

  private findReachablePosition(
    from: Position,
    to: Position,
    maxMovement: number,
    context: MovementContext
  ): Position {
    const path = this.calculatePath(from, to);
    if (!path || path.length <= 1) return from;

    let totalCost = 0;
    let lastReachable = from;

    for (let i = 1; i < path.length; i++) {
      const segmentDistance = this.calculateDistance(path[i - 1], path[i]);
      const terrainModifier = this.calculateTerrainModifiers(
        [path[i]],
        context.environment.terrain
      );
      const segmentCost = segmentDistance * terrainModifier;

      if (totalCost + segmentCost <= maxMovement) {
        totalCost += segmentCost;
        lastReachable = path[i];
      } else {
        break;
      }
    }

    return lastReachable;
  }

  private getTerrainTypes(path: Position[], terrainMap: Map<string, TerrainType>): TerrainType[] {
    const terrainTypes: TerrainType[] = [];

    for (const position of path) {
      const key = `${position.x},${position.y},${position.z || 0}`;
      const terrain = terrainMap.get(key) || TerrainType.Clear;

      if (!terrainTypes.includes(terrain)) {
        terrainTypes.push(terrain);
      }
    }

    return terrainTypes;
  }

  validateMovement(
    from: Position,
    to: Position,
    movementType: MovementType,
    context: MovementContext
  ): { valid: boolean; reason?: string } {
    const path = this.calculatePath(from, to);
    if (!path) {
      return { valid: false, reason: 'No valid path' };
    }

    if (movementType === MovementType.Charging) {
      const distance = this.calculateDistance(from, to);
      if (distance < 10) {
        return { valid: false, reason: 'Charge requires minimum 10-foot movement' };
      }

      if (path.length > 2) {
        return { valid: false, reason: 'Charge must be in straight line' };
      }
    }

    const terrainTypes = this.getTerrainTypes(path, context.environment.terrain);
    if (terrainTypes.includes(TerrainType.Impassable)) {
      return { valid: false, reason: 'Path contains impassable terrain' };
    }

    if (terrainTypes.includes(TerrainType.Lava) && movementType !== MovementType.Flying) {
      return { valid: false, reason: 'Cannot traverse lava without flying' };
    }

    return { valid: true };
  }

  calculatePartyMovement(
    partyPositions: Position[],
    destination: Position,
    movementType: MovementType,
    contexts: MovementContext[]
  ): MovementResult[] {
    const results: MovementResult[] = [];

    for (let i = 0; i < partyPositions.length; i++) {
      const result = this.calculateMovement(
        partyPositions[i],
        destination,
        movementType,
        contexts[i]
      );
      results.push(result);
    }

    return results;
  }
}
