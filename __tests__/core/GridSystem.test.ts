import { GridSystem, HexGrid, SquareGrid } from '@osric/core/GridSystem';
import { Direction } from '@osric/core/Position';
import type { Position, PositionBounds } from '@osric/core/Position';
import { beforeEach, describe, expect, it } from 'vitest';

describe('GridSystem', () => {
  let squareGrid: SquareGrid;
  let hexGrid: HexGrid;

  beforeEach(() => {
    squareGrid = new SquareGrid(5);
    hexGrid = new HexGrid(5);
  });

  describe('Basic Functionality', () => {
    it('should create grid systems with correct properties', () => {
      expect(squareGrid.getGridSize()).toBe(5);
      expect(hexGrid.getGridSize()).toBe(5);
      expect(squareGrid.getBounds()).toBeUndefined();
      expect(hexGrid.getBounds()).toBeUndefined();
    });

    it('should set and get bounds correctly', () => {
      const bounds: PositionBounds = {
        min: { x: 0, y: 0, z: 0 },
        max: { x: 10, y: 10, z: 5 },
      };

      squareGrid.setBounds(bounds);
      expect(squareGrid.getBounds()).toEqual(bounds);
    });

    it('should validate positions within bounds', () => {
      const bounds: PositionBounds = {
        min: { x: 0, y: 0 },
        max: { x: 5, y: 5 },
      };

      squareGrid.setBounds(bounds);

      expect(squareGrid.isWithinBounds({ x: 2, y: 3 })).toBe(true);
      expect(squareGrid.isWithinBounds({ x: 0, y: 0 })).toBe(true);
      expect(squareGrid.isWithinBounds({ x: 5, y: 5 })).toBe(true);
      expect(squareGrid.isWithinBounds({ x: -1, y: 3 })).toBe(false);
      expect(squareGrid.isWithinBounds({ x: 3, y: 6 })).toBe(false);
    });
  });

  describe('SquareGrid Functionality', () => {
    it('should get correct neighbors for square grid', () => {
      const position: Position = { x: 5, y: 5 };
      const neighbors = squareGrid.getNeighbors(position);

      expect(neighbors).toHaveLength(8);
      expect(neighbors).toContainEqual({ x: 4, y: 4 });
      expect(neighbors).toContainEqual({ x: 5, y: 4 });
      expect(neighbors).toContainEqual({ x: 6, y: 4 });
      expect(neighbors).toContainEqual({ x: 4, y: 5 });
      expect(neighbors).toContainEqual({ x: 6, y: 5 });
      expect(neighbors).toContainEqual({ x: 4, y: 6 });
      expect(neighbors).toContainEqual({ x: 5, y: 6 });
      expect(neighbors).toContainEqual({ x: 6, y: 6 });
    });

    it('should calculate movement cost correctly', () => {
      const from: Position = { x: 0, y: 0 };
      const adjacent: Position = { x: 1, y: 0 };
      const diagonal: Position = { x: 1, y: 1 };
      const distant: Position = { x: 3, y: 3 };

      expect(squareGrid.getMovementCost(from, adjacent)).toBe(1);
      expect(squareGrid.getMovementCost(from, diagonal)).toBe(1.4);
      expect(squareGrid.getMovementCost(from, distant)).toBe(Number.POSITIVE_INFINITY);
    });

    it('should calculate distance correctly', () => {
      const from: Position = { x: 0, y: 0 };
      const to: Position = { x: 3, y: 4 };

      const distance = squareGrid.getDistance(from, to);
      expect(distance).toBe(5);
    });

    it('should snap to grid correctly', () => {
      const position: Position = { x: 7, y: 13 };
      const snapped = squareGrid.snapToGrid(position);

      expect(snapped.x).toBe(5);
      expect(snapped.y).toBe(15);
    });

    it('should find positions in range', () => {
      const center: Position = { x: 0, y: 0 };
      const positions = squareGrid.getPositionsInRange(center, 1);

      expect(positions.length).toBeGreaterThan(0);
      expect(positions).toContainEqual({ x: 0, y: 0 });
      expect(positions).toContainEqual({ x: 1, y: 0 });
      expect(positions).toContainEqual({ x: 0, y: 1 });
    });
  });

  describe('HexGrid Functionality', () => {
    it('should get correct neighbors for hex grid', () => {
      const position: Position = { x: 0, y: 0 };
      const neighbors = hexGrid.getNeighbors(position);

      expect(neighbors).toHaveLength(6);
      expect(neighbors).toContainEqual({ x: 1, y: 0 });
      expect(neighbors).toContainEqual({ x: 0, y: 1 });
      expect(neighbors).toContainEqual({ x: -1, y: 1 });
      expect(neighbors).toContainEqual({ x: -1, y: 0 });
      expect(neighbors).toContainEqual({ x: -1, y: -1 });
      expect(neighbors).toContainEqual({ x: 0, y: -1 });
    });

    it('should calculate hex distance correctly', () => {
      const from: Position = { x: 0, y: 0 };
      const to: Position = { x: 3, y: 2 };

      const distance = hexGrid.getDistance(from, to);
      expect(distance).toBe(5);
    });

    it('should normalize direction for hex grid', () => {
      expect(hexGrid.normalizeDirection(Direction.North)).toBe(Direction.NorthEast);
      expect(hexGrid.normalizeDirection(Direction.East)).toBe(Direction.East);
      expect(hexGrid.normalizeDirection(Direction.South)).toBe(Direction.SouthEast);
    });

    it('should get positions in hex range', () => {
      const center: Position = { x: 0, y: 0 };
      const positions = hexGrid.getPositionsInRange(center, 1);

      expect(positions.length).toBe(7);
      expect(positions).toContainEqual({ x: 0, y: 0 });
    });
  });

  describe('Pathfinding', () => {
    it('should provide correct start and end positions', () => {
      const from: Position = { x: 0, y: 0 };
      const to: Position = { x: 2, y: 0 };
      const path = squareGrid.findPath(from, to);
      expect(path).not.toBeNull();
      expect(path?.[0]).toEqual(from);
      expect(path?.[path.length - 1]).toEqual(to);
    });

    it('should return null for impossible paths', () => {
      const bounds: PositionBounds = {
        min: { x: 0, y: 0 },
        max: { x: 1, y: 1 },
      };
      squareGrid.setBounds(bounds);

      const from: Position = { x: 0, y: 0 };
      const to: Position = { x: 5, y: 5 };

      const path = squareGrid.findPath(from, to);
      expect(path).toBeNull();
    });

    it('should respect max cost limit', () => {
      const from: Position = { x: 0, y: 0 };
      const to: Position = { x: 10, y: 10 };

      const path = squareGrid.findPath(from, to, 5);
      expect(path).toBeNull();
    });
  });

  describe('Line of Sight', () => {
    it('should have line of sight to adjacent positions', () => {
      const from: Position = { x: 0, y: 0 };
      const to: Position = { x: 1, y: 0 };

      expect(squareGrid.hasLineOfSight(from, to)).toBe(true);
    });

    it('should not have line of sight to blocked positions', () => {
      const bounds: PositionBounds = {
        min: { x: 0, y: 0 },
        max: { x: 1, y: 1 },
      };
      squareGrid.setBounds(bounds);

      const from: Position = { x: 0, y: 0 };
      const to: Position = { x: 5, y: 5 };

      expect(squareGrid.hasLineOfSight(from, to)).toBe(false);
    });
  });

  describe('OSRIC Compliance', () => {
    it('should implement authentic OSRIC/AD&D 1st Edition mechanics', () => {
      const position: Position = { x: 0, y: 0 };

      const squareNeighbors = squareGrid.getNeighbors(position);
      expect(squareNeighbors).toHaveLength(8);

      const hexNeighbors = hexGrid.getNeighbors(position);
      expect(hexNeighbors).toHaveLength(6);

      const diagonalCost = squareGrid.getMovementCost({ x: 0, y: 0 }, { x: 1, y: 1 });
      expect(diagonalCost).toBeCloseTo(1.4, 1);
    });

    it('should support 3D movement for dungeon levels', () => {
      const from: Position = { x: 0, y: 0, z: 0 };
      const to: Position = { x: 0, y: 0, z: 1 };

      const cost = squareGrid.getMovementCost(from, to);
      expect(cost).toBe(1);

      const distance = squareGrid.getDistance(from, to);
      expect(distance).toBe(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle positions with undefined z coordinates', () => {
      const pos1: Position = { x: 0, y: 0 };
      const pos2: Position = { x: 1, y: 1, z: undefined };

      const distance = squareGrid.getDistance(pos1, pos2);
      expect(distance).toBeCloseTo(Math.sqrt(2), 1);
    });

    it('should handle boundary positions correctly', () => {
      const bounds: PositionBounds = {
        min: { x: 0, y: 0 },
        max: { x: 5, y: 5 },
      };
      squareGrid.setBounds(bounds);

      const edgePosition: Position = { x: 5, y: 5 };
      expect(squareGrid.isValidPosition(edgePosition)).toBe(true);

      const neighbors = squareGrid.getNeighbors(edgePosition);
      expect(neighbors.length).toBeLessThan(8);
    });

    it('should handle grid snapping edge cases', () => {
      const grid = new SquareGrid(1);
      const position: Position = { x: 0.7, y: -0.3 };
      const snapped = grid.snapToGrid(position);

      expect(snapped.x).toBe(1);
      expect(snapped.y).toBe(-0);
    });
  });
});
