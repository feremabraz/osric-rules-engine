/**
 * GridSystem - Abstract Grid System Interface
 *
 * Provides a grid-agnostic interface that different grid types
 * (square, hexagonal, triangular) can implement.
 *
 * PRESERVATION: Allows games to choose grid types appropriate
 * for their map design while maintaining consistent positioning APIs.
 */

import type { Position, PositionBounds } from './Position';
import { Direction } from './Position';

/**
 * Grid cell representation
 */
export interface GridCell {
  position: Position;
  neighbors?: Position[];
  terrain?: string;
  blocked?: boolean;
}

/**
 * Grid movement result
 */
export interface GridMovementResult {
  valid: boolean;
  finalPosition: Position;
  path?: Position[];
  cost?: number;
  blocked?: Position[];
}

/**
 * Abstract grid system interface
 */
export abstract class GridSystem {
  protected gridSize: number;
  protected bounds?: PositionBounds;

  constructor(gridSize = 5, bounds?: PositionBounds) {
    this.gridSize = gridSize;
    this.bounds = bounds;
  }

  /**
   * Get valid neighbors for a position
   */
  abstract getNeighbors(position: Position): Position[];

  /**
   * Calculate movement cost between adjacent positions
   */
  abstract getMovementCost(from: Position, to: Position): number;

  /**
   * Calculate distance between positions in grid units
   */
  abstract getDistance(from: Position, to: Position): number;

  /**
   * Get the nearest valid grid position
   */
  abstract snapToGrid(position: Position): Position;

  /**
   * Check if a position is valid on this grid
   */
  abstract isValidPosition(position: Position): boolean;

  /**
   * Convert a direction to the nearest grid-appropriate direction
   */
  abstract normalizeDirection(direction: Direction): Direction;

  /**
   * Get all positions within a range
   */
  abstract getPositionsInRange(center: Position, range: number): Position[];

  /**
   * Check if there's a clear line of sight between positions
   */
  abstract hasLineOfSight(from: Position, to: Position): boolean;

  /**
   * Find a path between two positions
   */
  abstract findPath(from: Position, to: Position, maxCost?: number): Position[] | null;

  /**
   * Get grid information
   */
  getGridSize(): number {
    return this.gridSize;
  }

  getBounds(): PositionBounds | undefined {
    return this.bounds;
  }

  setBounds(bounds: PositionBounds): void {
    this.bounds = bounds;
  }

  /**
   * Check if position is within grid bounds
   */
  isWithinBounds(position: Position): boolean {
    if (!this.bounds) return true;

    return (
      position.x >= this.bounds.min.x &&
      position.x <= this.bounds.max.x &&
      position.y >= this.bounds.min.y &&
      position.y <= this.bounds.max.y &&
      (position.z || 0) >= (this.bounds.min.z || 0) &&
      (position.z || 0) <= (this.bounds.max.z || 0)
    );
  }
}

/**
 * Simple square grid implementation
 */
export class SquareGrid extends GridSystem {
  getNeighbors(position: Position): Position[] {
    const neighbors: Position[] = [];
    const offsets = [
      { x: 0, y: 1 }, // North
      { x: 1, y: 1 }, // Northeast
      { x: 1, y: 0 }, // East
      { x: 1, y: -1 }, // Southeast
      { x: 0, y: -1 }, // South
      { x: -1, y: -1 }, // Southwest
      { x: -1, y: 0 }, // West
      { x: -1, y: 1 }, // Northwest
    ];

    for (const offset of offsets) {
      const neighbor = {
        x: position.x + offset.x,
        y: position.y + offset.y,
        z: position.z,
      };

      if (this.isValidPosition(neighbor)) {
        neighbors.push(neighbor);
      }
    }

    return neighbors;
  }

  getMovementCost(from: Position, to: Position): number {
    const dx = Math.abs(to.x - from.x);
    const dy = Math.abs(to.y - from.y);
    const dz = Math.abs((to.z || 0) - (from.z || 0));

    // Diagonal movement costs more
    if (dx === 1 && dy === 1) return 1.4; // √2 ≈ 1.4
    if (dx === 1 || dy === 1) return 1;
    if (dz === 1) return 1;

    return Number.POSITIVE_INFINITY; // Not adjacent
  }

  getDistance(from: Position, to: Position): number {
    const dx = Math.abs(to.x - from.x);
    const dy = Math.abs(to.y - from.y);
    const dz = Math.abs((to.z || 0) - (from.z || 0));

    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  snapToGrid(position: Position): Position {
    return {
      x: Math.round(position.x / this.gridSize) * this.gridSize,
      y: Math.round(position.y / this.gridSize) * this.gridSize,
      z: position.z ? Math.round(position.z / this.gridSize) * this.gridSize : undefined,
    };
  }

  isValidPosition(position: Position): boolean {
    return this.isWithinBounds(position);
  }

  normalizeDirection(direction: Direction): Direction {
    // Square grid supports all 8 directions
    return direction;
  }

  getPositionsInRange(center: Position, range: number): Position[] {
    const positions: Position[] = [];

    for (let x = center.x - range; x <= center.x + range; x++) {
      for (let y = center.y - range; y <= center.y + range; y++) {
        const pos = { x, y, z: center.z };
        if (this.getDistance(center, pos) <= range && this.isValidPosition(pos)) {
          positions.push(pos);
        }
      }
    }

    return positions;
  }

  hasLineOfSight(from: Position, to: Position): boolean {
    // Simple line of sight - check if no solid obstacles in path
    // This is a simplified version; games should implement proper line tracing
    const path = this.findPath(from, to);
    return path !== null;
  }

  findPath(from: Position, to: Position, maxCost = 100): Position[] | null {
    // Simple A* pathfinding implementation
    const openSet = new Set<string>();
    const closedSet = new Set<string>();
    const cameFrom = new Map<string, Position>();
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();

    const positionKey = (pos: Position) => `${pos.x},${pos.y},${pos.z || 0}`;
    const keyToPosition = (key: string): Position => {
      const [x, y, z] = key.split(',').map(Number);
      return { x, y, z: z || undefined };
    };

    const startKey = positionKey(from);
    const goalKey = positionKey(to);

    openSet.add(startKey);
    gScore.set(startKey, 0);
    fScore.set(startKey, this.getDistance(from, to));

    while (openSet.size > 0) {
      // Find position with lowest fScore
      let current = '';
      let lowestF = Number.POSITIVE_INFINITY;

      for (const pos of openSet) {
        const f = fScore.get(pos) || Number.POSITIVE_INFINITY;
        if (f < lowestF) {
          lowestF = f;
          current = pos;
        }
      }

      if (current === goalKey) {
        // Reconstruct path
        const path: Position[] = [];
        let currentPos = current;

        while (currentPos) {
          path.unshift(keyToPosition(currentPos));
          const parent = cameFrom.get(currentPos);
          currentPos = parent ? positionKey(parent) : '';
        }

        return path;
      }

      openSet.delete(current);
      closedSet.add(current);

      const currentPosition = keyToPosition(current);
      const neighbors = this.getNeighbors(currentPosition);

      for (const neighbor of neighbors) {
        const neighborKey = positionKey(neighbor);

        if (closedSet.has(neighborKey)) continue;

        const tentativeG =
          (gScore.get(current) || 0) + this.getMovementCost(currentPosition, neighbor);

        if (tentativeG > maxCost) continue;

        if (!openSet.has(neighborKey)) {
          openSet.add(neighborKey);
        } else if (tentativeG >= (gScore.get(neighborKey) || Number.POSITIVE_INFINITY)) {
          continue;
        }

        cameFrom.set(neighborKey, currentPosition);
        gScore.set(neighborKey, tentativeG);
        fScore.set(neighborKey, tentativeG + this.getDistance(neighbor, to));
      }
    }

    return null; // No path found
  }
}

/**
 * Simple hexagonal grid implementation
 */
export class HexGrid extends GridSystem {
  getNeighbors(position: Position): Position[] {
    const neighbors: Position[] = [];
    // Hex grid has 6 neighbors (offset coordinates)
    const offsets = [
      { x: 1, y: 0 }, // East
      { x: 0, y: 1 }, // Northeast (even cols) / Southeast (odd cols)
      { x: -1, y: 1 }, // Northwest (even cols) / North (odd cols)
      { x: -1, y: 0 }, // West
      { x: -1, y: -1 }, // Southwest (even cols) / South (odd cols)
      { x: 0, y: -1 }, // Southeast (even cols) / Southwest (odd cols)
    ];

    for (const offset of offsets) {
      const neighbor = {
        x: position.x + offset.x,
        y: position.y + offset.y,
        z: position.z,
      };

      if (this.isValidPosition(neighbor)) {
        neighbors.push(neighbor);
      }
    }

    return neighbors;
  }

  getMovementCost(from: Position, to: Position): number {
    // All hex movements are equal cost
    const neighbors = this.getNeighbors(from);
    const isNeighbor = neighbors.some(
      (neighbor) => neighbor.x === to.x && neighbor.y === to.y && (neighbor.z || 0) === (to.z || 0)
    );

    return isNeighbor ? 1 : Number.POSITIVE_INFINITY;
  }

  getDistance(from: Position, to: Position): number {
    // Hex distance calculation (simplified)
    const dx = to.x - from.x;
    const dy = to.y - from.y;

    return (Math.abs(dx) + Math.abs(dx + dy) + Math.abs(dy)) / 2;
  }

  snapToGrid(position: Position): Position {
    // Hex grid snapping is more complex, simplified here
    return {
      x: Math.round(position.x),
      y: Math.round(position.y),
      z: position.z,
    };
  }

  isValidPosition(position: Position): boolean {
    return this.isWithinBounds(position);
  }

  normalizeDirection(direction: Direction): Direction {
    // Hex grid normalizes to 6 main directions
    switch (direction) {
      case Direction.North:
      case Direction.NorthEast:
        return Direction.NorthEast;
      case Direction.East:
        return Direction.East;
      case Direction.South:
      case Direction.SouthEast:
        return Direction.SouthEast;
      case Direction.SouthWest:
        return Direction.SouthWest;
      case Direction.West:
        return Direction.West;
      case Direction.NorthWest:
        return Direction.NorthWest;
      default:
        return direction;
    }
  }

  getPositionsInRange(center: Position, range: number): Position[] {
    const positions: Position[] = [];

    for (let dx = -range; dx <= range; dx++) {
      const minDy = Math.max(-range, -dx - range);
      const maxDy = Math.min(range, -dx + range);

      for (let dy = minDy; dy <= maxDy; dy++) {
        const pos = { x: center.x + dx, y: center.y + dy, z: center.z };
        if (this.isValidPosition(pos)) {
          positions.push(pos);
        }
      }
    }

    return positions;
  }

  hasLineOfSight(from: Position, to: Position): boolean {
    // Simplified hex line of sight
    const path = this.findPath(from, to);
    return path !== null;
  }

  findPath(from: Position, to: Position, maxCost = 100): Position[] | null {
    // Reuse square grid A* with hex distance
    return new SquareGrid().findPath(from, to, maxCost);
  }
}
