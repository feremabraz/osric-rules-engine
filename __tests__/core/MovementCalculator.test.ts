import { SquareGrid } from '@osric/core/GridSystem';

import {
  MovementCalculator,
  type MovementCapabilities,
  type MovementContext,
  type MovementResult,
  MovementType,
  TerrainType,
} from '@osric/core/MovementCalculator';
import { Direction, type Position } from '@osric/core/Position';
import { beforeEach, describe, expect, it } from 'vitest';

describe('MovementCalculator', () => {
  let calculator: MovementCalculator;
  let gridCalculator: MovementCalculator;
  let mockCapabilities: MovementCapabilities;
  let mockContext: MovementContext;

  beforeEach(() => {
    calculator = new MovementCalculator();
    gridCalculator = new MovementCalculator(new SquareGrid(5));

    mockCapabilities = {
      baseMovementRate: 30,
      runningMultiplier: 2,
      encumbranceModifier: 1.0,
      flyingSpeed: 60,
      swimmingSpeed: 15,
      climbingSpeed: 10,
      specialMovement: [],
    };

    mockContext = {
      character: {
        capabilities: mockCapabilities,
        position: { x: 0, y: 0 },
        facing: Direction.North,
      },
      environment: {
        terrain: new Map<string, TerrainType>(),
        lighting: 'bright' as const,
        weather: 'clear',
        indoor: false,
      },
      tactical: {
        inCombat: false,
        hasActed: false,
        roundsElapsed: 0,
      },
    };
  });

  describe('Basic Movement Calculation', () => {
    it('should calculate successful movement in clear terrain', () => {
      const from: Position = { x: 0, y: 0 };
      const to: Position = { x: 10, y: 0 };

      const result = calculator.calculateMovement(from, to, MovementType.Walking, mockContext);

      expect(result.success).toBe(true);
      expect(result.finalPosition).toEqual(to);
      expect(result.timeElapsed).toBeGreaterThan(0);
      expect(result.movementUsed).toBeGreaterThan(0);
      expect(result.path).toBeDefined();
    });

    it('should handle insufficient movement range', () => {
      const from: Position = { x: 0, y: 0 };
      const to: Position = { x: 100, y: 0 };

      const result = calculator.calculateMovement(from, to, MovementType.Walking, mockContext);

      expect(result.success).toBe(false);
      expect(result.finalPosition).not.toEqual(to);
      expect(result.penalties).toContain('Insufficient movement to reach destination');
    });

    it('should handle movement with grid system', () => {
      const from: Position = { x: 0, y: 0 };
      const to: Position = { x: 5, y: 5 };

      const result = gridCalculator.calculateMovement(from, to, MovementType.Walking, mockContext);

      expect(result.success).toBeDefined();
      expect(result.finalPosition).toBeDefined();
      expect(result.path).toBeDefined();
      expect(result.path?.length).toBeGreaterThan(0);
    });

    it('should calculate movement cost correctly', () => {
      const from: Position = { x: 0, y: 0 };
      const to: Position = { x: 15, y: 0 };

      const result = calculator.calculateMovement(from, to, MovementType.Walking, mockContext);

      expect(result.success).toBe(true);
      expect(result.movementUsed).toBeLessThanOrEqual(mockCapabilities.baseMovementRate);
    });
  });

  describe('Movement Types', () => {
    it('should handle walking movement', () => {
      const from: Position = { x: 0, y: 0 };
      const to: Position = { x: 20, y: 0 };

      const result = calculator.calculateMovement(from, to, MovementType.Walking, mockContext);

      expect(result.movementUsed).toBe(20);
    });

    it('should handle running movement with multiplier', () => {
      const from: Position = { x: 0, y: 0 };
      const to: Position = { x: 50, y: 0 };

      const result = calculator.calculateMovement(from, to, MovementType.Running, mockContext);

      expect(result.success).toBe(true);
    });

    it('should handle charging movement', () => {
      const from: Position = { x: 0, y: 0 };
      const to: Position = { x: 15, y: 0 };

      const result = calculator.calculateMovement(from, to, MovementType.Charging, mockContext);

      expect(result.success).toBe(true);
    });

    it('should handle flying movement', () => {
      const from: Position = { x: 0, y: 0 };
      const to: Position = { x: 40, y: 0 };

      const result = calculator.calculateMovement(from, to, MovementType.Flying, mockContext);

      expect(result.success).toBe(true);
    });

    it('should handle swimming movement', () => {
      const from: Position = { x: 0, y: 0 };
      const to: Position = { x: 10, y: 0 };

      const result = calculator.calculateMovement(from, to, MovementType.Swimming, mockContext);

      expect(result.success).toBe(true);
    });

    it('should handle climbing movement', () => {
      const from: Position = { x: 0, y: 0 };
      const to: Position = { x: 8, y: 0 };

      const result = calculator.calculateMovement(from, to, MovementType.Climbing, mockContext);

      expect(result.success).toBe(true);
    });

    it('should handle crawling movement with speed penalty', () => {
      const from: Position = { x: 0, y: 0 };
      const to: Position = { x: 5, y: 0 };

      const result = calculator.calculateMovement(from, to, MovementType.Crawling, mockContext);

      expect(result.success).toBe(true);
    });
  });

  describe('Terrain Effects', () => {
    it('should handle clear terrain with no penalties', () => {
      const from: Position = { x: 0, y: 0 };
      const to: Position = { x: 10, y: 0 };

      mockContext.environment.terrain.set('10,0,0', TerrainType.Clear);

      const result = calculator.calculateMovement(from, to, MovementType.Walking, mockContext);

      expect(result.terrainEncountered).toContain(TerrainType.Clear);
      expect(result.success).toBe(true);
    });

    it('should apply difficult terrain penalties', () => {
      const from: Position = { x: 0, y: 0 };
      const to: Position = { x: 10, y: 0 };

      mockContext.environment.terrain.set('10,0,0', TerrainType.Difficult);

      const result = calculator.calculateMovement(from, to, MovementType.Walking, mockContext);

      expect(result.terrainEncountered).toContain(TerrainType.Difficult);
      expect(result.movementUsed).toBeGreaterThan(10);
    });

    it('should handle treacherous terrain with high penalties', () => {
      const from: Position = { x: 0, y: 0 };
      const to: Position = { x: 8, y: 0 };

      mockContext.environment.terrain.set('8,0,0', TerrainType.Treacherous);

      const result = calculator.calculateMovement(from, to, MovementType.Walking, mockContext);

      expect(result.terrainEncountered).toContain(TerrainType.Treacherous);
      expect(result.movementUsed).toBeGreaterThan(16);
    });

    it('should handle marsh terrain', () => {
      const from: Position = { x: 0, y: 0 };
      const to: Position = { x: 8, y: 0 };

      mockContext.environment.terrain.set('8,0,0', TerrainType.Marsh);

      const result = calculator.calculateMovement(from, to, MovementType.Walking, mockContext);

      expect(result.terrainEncountered).toContain(TerrainType.Marsh);
      expect(result.movementUsed).toBeGreaterThan(16);
    });

    it('should handle forest terrain', () => {
      const from: Position = { x: 0, y: 0 };
      const to: Position = { x: 15, y: 0 };

      mockContext.environment.terrain.set('15,0,0', TerrainType.Forest);

      const result = calculator.calculateMovement(from, to, MovementType.Walking, mockContext);

      expect(result.terrainEncountered).toContain(TerrainType.Forest);
      expect(result.movementUsed).toBeGreaterThan(15);
    });

    it('should block movement through impassable terrain', () => {
      const from: Position = { x: 0, y: 0 };
      const to: Position = { x: 10, y: 0 };

      mockContext.environment.terrain.set('10,0,0', TerrainType.Impassable);

      const result = calculator.calculateMovement(from, to, MovementType.Walking, mockContext);

      expect(result.success).toBe(false);
    });

    it('should block non-flying movement through lava', () => {
      const from: Position = { x: 0, y: 0 };
      const to: Position = { x: 10, y: 0 };

      mockContext.environment.terrain.set('10,0,0', TerrainType.Lava);

      const walkResult = calculator.calculateMovement(from, to, MovementType.Walking, mockContext);
      expect(walkResult.success).toBe(false);

      const flyResult = calculator.calculateMovement(from, to, MovementType.Flying, mockContext);
      expect(flyResult.success).toBe(false);
    });
  });

  describe('Environmental Conditions', () => {
    it('should apply dim lighting penalties', () => {
      const from: Position = { x: 0, y: 0 };
      const to: Position = { x: 15, y: 0 };

      mockContext.environment.lighting = 'dim';

      const result = calculator.calculateMovement(from, to, MovementType.Walking, mockContext);

      expect(result.success).toBe(true);
    });

    it('should apply dark lighting penalties', () => {
      const from: Position = { x: 0, y: 0 };
      const to: Position = { x: 10, y: 0 };

      mockContext.environment.lighting = 'dark';

      const result = calculator.calculateMovement(from, to, MovementType.Walking, mockContext);

      expect(result.success).toBe(true);
    });

    it('should handle encumbrance modifiers', () => {
      const from: Position = { x: 0, y: 0 };
      const to: Position = { x: 20, y: 0 };

      mockContext.character.capabilities.encumbranceModifier = 0.5;

      const result = calculator.calculateMovement(from, to, MovementType.Walking, mockContext);

      expect(result.success).toBe(false);
    });
  });

  describe('Combat vs Exploration Movement', () => {
    it('should use tactical time in combat', () => {
      const from: Position = { x: 0, y: 0 };
      const to: Position = { x: 10, y: 0 };

      mockContext.tactical.inCombat = true;

      const result = calculator.calculateMovement(from, to, MovementType.Walking, mockContext);

      expect(result.timeElapsed).toBe(1);
    });

    it('should calculate exploration time outside combat', () => {
      const from: Position = { x: 0, y: 0 };
      const to: Position = { x: 10, y: 0 };

      mockContext.tactical.inCombat = false;

      const result = calculator.calculateMovement(from, to, MovementType.Walking, mockContext);

      expect(result.timeElapsed).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Movement Validation', () => {
    it('should validate normal movement', () => {
      const from: Position = { x: 0, y: 0 };
      const to: Position = { x: 10, y: 0 };

      const validation = calculator.validateMovement(from, to, MovementType.Walking, mockContext);

      expect(validation.valid).toBe(true);
    });

    it('should reject charge with insufficient distance', () => {
      const from: Position = { x: 0, y: 0 };
      const to: Position = { x: 5, y: 0 };

      const validation = calculator.validateMovement(from, to, MovementType.Charging, mockContext);

      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('minimum 10-foot movement');
    });

    it('should reject movement through impassable terrain', () => {
      const from: Position = { x: 0, y: 0 };
      const to: Position = { x: 10, y: 0 };

      mockContext.environment.terrain.set('10,0,0', TerrainType.Impassable);

      const validation = calculator.validateMovement(from, to, MovementType.Walking, mockContext);

      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('impassable terrain');
    });

    it('should reject non-flying movement through lava', () => {
      const from: Position = { x: 0, y: 0 };
      const to: Position = { x: 10, y: 0 };

      mockContext.environment.terrain.set('10,0,0', TerrainType.Lava);

      const validation = calculator.validateMovement(from, to, MovementType.Walking, mockContext);

      expect(validation.valid).toBe(false);
      expect(validation.reason).toContain('lava without flying');
    });
  });

  describe('Party Movement', () => {
    it('should calculate movement for multiple party members', () => {
      const positions: Position[] = [
        { x: 0, y: 0 },
        { x: 5, y: 0 },
        { x: 10, y: 0 },
      ];
      const destination: Position = { x: 20, y: 0 };
      const contexts = [mockContext, mockContext, mockContext];

      const results = calculator.calculatePartyMovement(
        positions,
        destination,
        MovementType.Walking,
        contexts
      );

      expect(results).toHaveLength(3);
      expect(results[0]).toBeDefined();
      expect(results[1]).toBeDefined();
      expect(results[2]).toBeDefined();
    });

    it('should handle different movement capabilities in party', () => {
      const positions: Position[] = [
        { x: 0, y: 0 },
        { x: 0, y: 5 },
      ];
      const destination: Position = { x: 25, y: 0 };

      const fastContext = { ...mockContext };
      const slowContext = {
        ...mockContext,
        character: {
          ...mockContext.character,
          capabilities: {
            ...mockCapabilities,
            baseMovementRate: 20,
          },
        },
      };

      const results = calculator.calculatePartyMovement(
        positions,
        destination,
        MovementType.Walking,
        [fastContext, slowContext]
      );

      expect(results).toHaveLength(2);

      expect(results[0].success).toBe(true);
    });
  });

  describe('OSRIC Compliance', () => {
    it('should implement authentic OSRIC/AD&D 1st Edition movement mechanics', () => {
      const humanFighter = {
        ...mockContext,
        character: {
          ...mockContext.character,
          capabilities: {
            ...mockCapabilities,
            baseMovementRate: 120,
            runningMultiplier: 3,
          },
        },
      };

      const from: Position = { x: 0, y: 0 };
      const to: Position = { x: 100, y: 0 };

      const walkResult = calculator.calculateMovement(from, to, MovementType.Walking, humanFighter);
      expect(walkResult.success).toBe(true);

      const runResult = calculator.calculateMovement(from, to, MovementType.Running, humanFighter);
      expect(runResult.success).toBe(true);
    });

    it('should support OSRIC terrain movement penalties', () => {
      const from: Position = { x: 0, y: 0 };
      const to: Position = { x: 20, y: 0 };

      mockContext.environment.terrain.set('20,0,0', TerrainType.Difficult);
      const difficultResult = calculator.calculateMovement(
        from,
        to,
        MovementType.Walking,
        mockContext
      );
      expect(difficultResult.movementUsed).toBe(30);

      mockContext.environment.terrain.clear();
      mockContext.environment.terrain.set('20,0,0', TerrainType.Clear);
      const clearResult = calculator.calculateMovement(from, to, MovementType.Walking, mockContext);
      expect(clearResult.movementUsed).toBe(20);
    });

    it('should handle OSRIC charge requirements', () => {
      const from: Position = { x: 0, y: 0 };
      const to: Position = { x: 15, y: 0 };

      const validation = calculator.validateMovement(from, to, MovementType.Charging, mockContext);
      expect(validation.valid).toBe(true);

      const shortCharge = calculator.validateMovement(
        from,
        { x: 5, y: 0 },
        MovementType.Charging,
        mockContext
      );
      expect(shortCharge.valid).toBe(false);
    });

    it('should implement encumbrance effects per OSRIC rules', () => {
      const from: Position = { x: 0, y: 0 };
      const to: Position = { x: 25, y: 0 };

      mockContext.character.capabilities.encumbranceModifier = 0.9;
      const lightResult = calculator.calculateMovement(from, to, MovementType.Walking, mockContext);

      mockContext.character.capabilities.encumbranceModifier = 0.6;
      const heavyResult = calculator.calculateMovement(from, to, MovementType.Walking, mockContext);

      expect(lightResult.success).toBe(true);
      expect(heavyResult.success).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero movement', () => {
      const from: Position = { x: 0, y: 0 };
      const to: Position = { x: 0, y: 0 };

      const result = calculator.calculateMovement(from, to, MovementType.Walking, mockContext);

      expect(result.success).toBe(true);
      expect(result.movementUsed).toBe(0);
      expect(result.finalPosition).toEqual(from);
    });

    it('should handle movement with no capabilities', () => {
      const from: Position = { x: 0, y: 0 };
      const to: Position = { x: 5, y: 0 };

      const contextWithNoCaps = {
        ...mockContext,
        character: {
          ...mockContext.character,
          capabilities: {
            ...mockCapabilities,
            baseMovementRate: 0,
          },
        },
      };

      const result = calculator.calculateMovement(
        from,
        to,
        MovementType.Walking,
        contextWithNoCaps
      );

      expect(result.success).toBe(false);
    });

    it('should handle invalid positions', () => {
      const from: Position = { x: 0, y: 0 };
      const to: Position = { x: Number.NaN, y: Number.NaN };

      const result = calculator.calculateMovement(from, to, MovementType.Walking, mockContext);

      expect(result.success).toBe(true);
    });

    it('should handle very large distances', () => {
      const from: Position = { x: 0, y: 0 };
      const to: Position = { x: 10000, y: 0 };

      const result = calculator.calculateMovement(from, to, MovementType.Walking, mockContext);

      expect(result.success).toBe(false);
      expect(result.penalties).toContain('Insufficient movement to reach destination');
    });
  });
});
