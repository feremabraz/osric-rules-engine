/**
 * Position - Basic Position Interface
 *
 * Abstract positioning system that works with any grid type.
 * Games can implement their own grid systems (hex, square, etc.)
 * while using this common position interface.
 *
 * PRESERVATION: Grid-agnostic design allows games to choose
 * appropriate positioning systems for their needs.
 */

/**
 * Basic 2D/3D position interface
 */
export interface Position {
  x: number;
  y: number;
  z?: number; // Optional for multi-level environments
}

/**
 * Direction enumeration for common directions
 */
export enum Direction {
  North = 'north',
  NorthEast = 'northeast',
  East = 'east',
  SouthEast = 'southeast',
  South = 'south',
  SouthWest = 'southwest',
  West = 'west',
  NorthWest = 'northwest',
  Up = 'up',
  Down = 'down',
}

/**
 * Position with facing direction
 */
export interface OrientedPosition extends Position {
  facing: Direction;
}

/**
 * Position bounds for area definitions
 */
export interface PositionBounds {
  min: Position;
  max: Position;
}

/**
 * Position utilities - using namespace to avoid class-with-only-static-methods warning
 */
export namespace PositionUtils {
  /**
   * Create a new position
   */
  export function create(x: number, y: number, z?: number): Position {
    return z !== undefined ? { x, y, z } : { x, y };
  }

  /**
   * Check if two positions are equal
   */
  export function equals(pos1: Position, pos2: Position): boolean {
    return pos1.x === pos2.x && pos1.y === pos2.y && (pos1.z || 0) === (pos2.z || 0);
  }

  /**
   * Calculate the Euclidean distance between two positions
   */
  export function euclideanDistance(from: Position, to: Position): number {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dz = (to.z || 0) - (from.z || 0);

    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * Calculate Manhattan distance (grid-based movement)
   */
  export function manhattanDistance(from: Position, to: Position): number {
    const dx = Math.abs(to.x - from.x);
    const dy = Math.abs(to.y - from.y);
    const dz = Math.abs((to.z || 0) - (from.z || 0));

    return dx + dy + dz;
  }

  /**
   * Add two positions together
   */
  export function add(pos1: Position, pos2: Position): Position {
    return {
      x: pos1.x + pos2.x,
      y: pos1.y + pos2.y,
      z: (pos1.z || 0) + (pos2.z || 0) || undefined,
    };
  }

  /**
   * Subtract one position from another
   */
  export function subtract(pos1: Position, pos2: Position): Position {
    return {
      x: pos1.x - pos2.x,
      y: pos1.y - pos2.y,
      z: (pos1.z || 0) - (pos2.z || 0) || undefined,
    };
  }

  /**
   * Scale a position by a factor
   */
  export function scale(pos: Position, factor: number): Position {
    return {
      x: pos.x * factor,
      y: pos.y * factor,
      z: pos.z ? pos.z * factor : undefined,
    };
  }

  /**
   * Check if a position is within bounds
   */
  export function isWithinBounds(pos: Position, bounds: PositionBounds): boolean {
    return (
      pos.x >= bounds.min.x &&
      pos.x <= bounds.max.x &&
      pos.y >= bounds.min.y &&
      pos.y <= bounds.max.y &&
      (pos.z || 0) >= (bounds.min.z || 0) &&
      (pos.z || 0) <= (bounds.max.z || 0)
    );
  }

  /**
   * Get the direction from one position to another
   */
  export function getDirection(from: Position, to: Position): Direction {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dz = (to.z || 0) - (from.z || 0);

    // Handle vertical movement first
    if (Math.abs(dz) > Math.abs(dx) && Math.abs(dz) > Math.abs(dy)) {
      return dz > 0 ? Direction.Up : Direction.Down;
    }

    // Handle horizontal movement
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;

    if (angle >= -22.5 && angle < 22.5) return Direction.East;
    if (angle >= 22.5 && angle < 67.5) return Direction.NorthEast;
    if (angle >= 67.5 && angle < 112.5) return Direction.North;
    if (angle >= 112.5 && angle < 157.5) return Direction.NorthWest;
    if (angle >= 157.5 || angle < -157.5) return Direction.West;
    if (angle >= -157.5 && angle < -112.5) return Direction.SouthWest;
    if (angle >= -112.5 && angle < -67.5) return Direction.South;
    if (angle >= -67.5 && angle < -22.5) return Direction.SouthEast;

    return Direction.North; // Default
  }

  /**
   * Get the position offset for a direction
   */
  export function getDirectionOffset(direction: Direction): Position {
    switch (direction) {
      case Direction.North:
        return { x: 0, y: 1 };
      case Direction.NorthEast:
        return { x: 1, y: 1 };
      case Direction.East:
        return { x: 1, y: 0 };
      case Direction.SouthEast:
        return { x: 1, y: -1 };
      case Direction.South:
        return { x: 0, y: -1 };
      case Direction.SouthWest:
        return { x: -1, y: -1 };
      case Direction.West:
        return { x: -1, y: 0 };
      case Direction.NorthWest:
        return { x: -1, y: 1 };
      case Direction.Up:
        return { x: 0, y: 0, z: 1 };
      case Direction.Down:
        return { x: 0, y: 0, z: -1 };
      default:
        return { x: 0, y: 0 };
    }
  }

  /**
   * Move a position in a direction by a certain distance
   */
  export function moveInDirection(pos: Position, direction: Direction, distance = 1): Position {
    const offset = getDirectionOffset(direction);
    const scaledOffset = scale(offset, distance);
    return add(pos, scaledOffset);
  }

  /**
   * Get all positions within a certain radius
   */
  export function getPositionsInRadius(center: Position, radius: number): Position[] {
    const positions: Position[] = [];

    for (let x = center.x - radius; x <= center.x + radius; x++) {
      for (let y = center.y - radius; y <= center.y + radius; y++) {
        const pos = { x, y, z: center.z };
        if (euclideanDistance(center, pos) <= radius) {
          positions.push(pos);
        }
      }
    }

    return positions;
  }

  /**
   * Convert position to string representation
   */
  export function stringify(pos: Position): string {
    return pos.z !== undefined ? `(${pos.x}, ${pos.y}, ${pos.z})` : `(${pos.x}, ${pos.y})`;
  }

  /**
   * Parse position from string representation
   */
  export function fromString(str: string): Position | null {
    const match = str.match(/\((-?\d+),\s*(-?\d+)(?:,\s*(-?\d+))?\)/);
    if (!match) return null;

    const x = Number.parseInt(match[1], 10);
    const y = Number.parseInt(match[2], 10);
    const z = match[3] ? Number.parseInt(match[3], 10) : undefined;

    return { x, y, z };
  }
}
