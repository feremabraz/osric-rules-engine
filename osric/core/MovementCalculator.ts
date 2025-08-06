/**
 * MovementCalculator - OSRIC Movement Rules Integration
 *
 * Handles movement calculations according to OSRIC rules,
 * integrating positioning system with game mechanics.
 *
 * PRESERVATION: Maintains OSRIC movement rates, encumbrance,
 * terrain effects, and time tracking as specified in the rules.
 */

import type { GridSystem } from './GridSystem';
import type { Position } from './Position';
import type { Direction } from './Position';
import { PositionUtils } from './Position';

/**
 * Movement types from OSRIC
 */
export enum MovementType {
  Walking = 'walking',
  Running = 'running',
  Charging = 'charging',
  Swimming = 'swimming',
  Flying = 'flying',
  Climbing = 'climbing',
  Crawling = 'crawling',
}

/**
 * Terrain types that affect movement
 */
export enum TerrainType {
  Clear = 'clear',
  Difficult = 'difficult', // Rubble, dense forest
  Treacherous = 'treacherous', // Ice, mud
  Impassable = 'impassable',
  Water = 'water',
  Lava = 'lava',
  Marsh = 'marsh',
  Forest = 'forest',
  Mountain = 'mountain',
  Desert = 'desert',
}

/**
 * Movement result
 */
export interface MovementResult {
  success: boolean;
  finalPosition: Position;
  timeElapsed: number; // In rounds/turns
  movementUsed: number; // Movement points consumed
  path?: Position[];
  terrainEncountered?: TerrainType[];
  penalties?: string[];
}

/**
 * Character movement capabilities
 */
export interface MovementCapabilities {
  baseMovementRate: number; // In feet per round
  runningMultiplier: number; // Usually 3x for humans
  encumbranceModifier: number; // 0.5 to 1.0
  flyingSpeed?: number;
  swimmingSpeed?: number;
  climbingSpeed?: number;
  specialMovement?: string[]; // Spider climb, etc.
}

/**
 * Movement context for calculations
 */
export interface MovementContext {
  character: {
    capabilities: MovementCapabilities;
    position: Position;
    facing?: Direction;
  };
  environment: {
    terrain: Map<string, TerrainType>; // Position key -> terrain
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

/**
 * OSRIC Movement Calculator
 */
export class MovementCalculator {
  private gridSystem?: GridSystem;

  constructor(gridSystem?: GridSystem) {
    this.gridSystem = gridSystem;
  }

  /**
   * Calculate movement between two positions
   */
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
        success: false,
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
      // Find how far we can actually move
      const reachablePosition = this.findReachablePosition(from, to, movementRate, context);

      return {
        success: false,
        finalPosition: reachablePosition,
        timeElapsed: 1, // One round
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
      success: true,
      finalPosition: to,
      timeElapsed,
      movementUsed: totalCost,
      path,
      terrainEncountered: this.getTerrainTypes(path, context.environment.terrain),
    };
  }

  /**
   * Get base movement rate for character
   */
  private getEffectiveMovementRate(movementType: MovementType, context: MovementContext): number {
    const base = context.character.capabilities.baseMovementRate;
    const encumbrance = context.character.capabilities.encumbranceModifier;

    let rate = base * encumbrance;

    switch (movementType) {
      case MovementType.Running:
        rate *= context.character.capabilities.runningMultiplier;
        break;
      case MovementType.Charging:
        rate *= 2; // OSRIC charging rules
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
      default: // MovementType.Walking and others
        // Rate already calculated
        break;
    }

    // Environmental modifiers
    if (context.environment.lighting === 'dim') {
      rate *= 0.75;
    } else if (context.environment.lighting === 'dark') {
      rate *= 0.5;
    }

    return Math.floor(rate);
  }

  /**
   * Calculate distance considering grid system
   */
  private calculateDistance(from: Position, to: Position): number {
    if (this.gridSystem) {
      return this.gridSystem.getDistance(from, to);
    }

    return PositionUtils.euclideanDistance(from, to);
  }

  /**
   * Calculate path considering grid system
   */
  private calculatePath(from: Position, to: Position): Position[] | null {
    if (this.gridSystem) {
      return this.gridSystem.findPath(from, to);
    }

    // Simple straight line path
    return [from, to];
  }

  /**
   * Calculate terrain movement modifiers
   */
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
          // No modifier
          break;
        case TerrainType.Difficult:
          modifier *= 2; // Costs double movement
          break;
        case TerrainType.Treacherous:
          modifier *= 3; // Costs triple movement
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
          modifier *= 4; // Unless swimming
          break;
        case TerrainType.Impassable:
          return Number.POSITIVE_INFINITY;
        case TerrainType.Lava:
          return Number.POSITIVE_INFINITY;
      }
    }

    return modifier;
  }

  /**
   * Calculate total movement cost
   */
  private calculateMovementCost(
    distance: number,
    terrainModifier: number,
    movementType: MovementType
  ): number {
    if (terrainModifier === Number.POSITIVE_INFINITY) {
      return Number.POSITIVE_INFINITY;
    }

    let cost = distance * terrainModifier;

    // Movement type adjustments
    switch (movementType) {
      case MovementType.Flying:
        // Flying ignores most terrain
        cost = distance;
        break;
      case MovementType.Swimming:
        // Swimming in water is normal speed
        cost = distance;
        break;
      case MovementType.Charging:
        // Charging requires straight line
        cost = distance;
        break;
    }

    return Math.ceil(cost);
  }

  /**
   * Calculate time elapsed based on movement
   */
  private calculateTimeElapsed(
    movementUsed: number,
    movementRate: number,
    movementType: MovementType,
    inCombat: boolean
  ): number {
    if (inCombat) {
      // Combat movement - usually 1 round
      return 1;
    }

    // Exploration movement
    const baseTime = movementUsed / movementRate;

    switch (movementType) {
      case MovementType.Running:
        return Math.max(1, Math.ceil(baseTime));
      default: // MovementType.Walking and others
        return Math.max(1, Math.ceil(baseTime));
    }
  }

  /**
   * Find the furthest reachable position
   */
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

  /**
   * Get terrain types encountered along path
   */
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

  /**
   * Check if movement is valid (considering OSRIC rules)
   */
  validateMovement(
    from: Position,
    to: Position,
    movementType: MovementType,
    context: MovementContext
  ): { valid: boolean; reason?: string } {
    // Check basic path validity
    const path = this.calculatePath(from, to);
    if (!path) {
      return { valid: false, reason: 'No valid path' };
    }

    // Check movement type restrictions
    if (movementType === MovementType.Charging) {
      const distance = this.calculateDistance(from, to);
      if (distance < 10) {
        return { valid: false, reason: 'Charge requires minimum 10-foot movement' };
      }

      // Charging must be in straight line (simplified check)
      if (path.length > 2) {
        return { valid: false, reason: 'Charge must be in straight line' };
      }
    }

    // Check terrain validity
    const terrainTypes = this.getTerrainTypes(path, context.environment.terrain);
    if (terrainTypes.includes(TerrainType.Impassable)) {
      return { valid: false, reason: 'Path contains impassable terrain' };
    }

    if (terrainTypes.includes(TerrainType.Lava) && movementType !== MovementType.Flying) {
      return { valid: false, reason: 'Cannot traverse lava without flying' };
    }

    return { valid: true };
  }

  /**
   * Calculate movement for an entire party
   */
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
