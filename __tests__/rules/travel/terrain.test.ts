import {
  EnvironmentTerrainEffects,
  TerrainMovementMultipliers,
  calculateDailyMovement,
  calculateTerrainAdjustedMovement,
  getEnvironmentFeatureMultiplier,
  getTerrainMultiplier,
  isTerrainNavigable,
} from '@rules/travel/terrain';
import type { Environment, TerrainType } from '@rules/types';
import { createMockCharacter } from '@tests/utils/mockData';
import { describe, expect, it } from 'vitest';

describe('Travel Terrain', () => {
  describe('getTerrainMultiplier', () => {
    it('should return 1.0 for Normal terrain', () => {
      expect(getTerrainMultiplier('Normal')).toBe(1.0);
    });

    it('should return 0.75 for Difficult terrain', () => {
      expect(getTerrainMultiplier('Difficult')).toBe(0.75);
    });

    it('should return 0.5 for Very Difficult terrain', () => {
      expect(getTerrainMultiplier('Very Difficult')).toBe(0.5);
    });

    it('should return 0.0 for Impassable terrain', () => {
      expect(getTerrainMultiplier('Impassable')).toBe(0.0);
    });
  });

  describe('getEnvironmentFeatureMultiplier', () => {
    it('should return specific multiplier for known features', () => {
      expect(getEnvironmentFeatureMultiplier('Dungeon', 'slippery floor')).toBe(0.5);
      expect(getEnvironmentFeatureMultiplier('Wilderness', 'road')).toBe(1.5);
      expect(getEnvironmentFeatureMultiplier('Forest', 'dense undergrowth')).toBe(0.5);
    });

    it('should return 1.0 for unknown features', () => {
      expect(getEnvironmentFeatureMultiplier('Dungeon', 'unknown feature')).toBe(1.0);
      expect(getEnvironmentFeatureMultiplier('Wilderness', 'non-existent')).toBe(1.0);
    });

    it('should apply the correct multiplier from EnvironmentTerrainEffects', () => {
      const environmentKeys = Object.keys(EnvironmentTerrainEffects);

      for (const environment of environmentKeys) {
        const env = environment as Environment;
        const features = EnvironmentTerrainEffects[env];

        // Test the first feature of each environment
        const firstFeature = Object.keys(features)[0];
        const expectedMultiplier = features[firstFeature];

        expect(getEnvironmentFeatureMultiplier(env, firstFeature)).toBe(expectedMultiplier);
      }
    });
  });

  describe('calculateTerrainAdjustedMovement', () => {
    it('should apply terrain multiplier to base movement rate', () => {
      const baseRate = 36;
      const terrain: TerrainType = 'Difficult';
      const environment: Environment = 'Dungeon';

      const expected = Math.round(baseRate * TerrainMovementMultipliers[terrain]);
      expect(calculateTerrainAdjustedMovement(baseRate, terrain, environment)).toBe(expected);
    });

    it('should apply both terrain and environment feature multipliers', () => {
      const baseRate = 36;
      const terrain: TerrainType = 'Difficult';
      const environment: Environment = 'Dungeon';
      const feature = 'narrow passage';

      const expected = Math.round(
        baseRate *
          TerrainMovementMultipliers[terrain] *
          EnvironmentTerrainEffects[environment][feature]
      );

      expect(calculateTerrainAdjustedMovement(baseRate, terrain, environment, feature)).toBe(
        expected
      );
    });

    it('should handle unknown environment features', () => {
      const baseRate = 36;
      const terrain: TerrainType = 'Normal';
      const environment: Environment = 'Dungeon';
      const feature = 'unknown feature';

      // Unknown features should use a multiplier of 1.0
      const expected = Math.round(baseRate * TerrainMovementMultipliers[terrain]);

      expect(calculateTerrainAdjustedMovement(baseRate, terrain, environment, feature)).toBe(
        expected
      );
    });
  });

  describe('isTerrainNavigable', () => {
    it('should return false for Impassable terrain with Walk movement', () => {
      expect(isTerrainNavigable('Impassable', 'Walk')).toBe(false);
    });

    it('should return true for Impassable terrain with Fly movement', () => {
      expect(isTerrainNavigable('Impassable', 'Fly')).toBe(true);
    });

    it('should return true for Normal terrain with Walk movement', () => {
      expect(isTerrainNavigable('Normal', 'Walk')).toBe(true);
    });

    it('should return true for Difficult terrain with Walk movement', () => {
      expect(isTerrainNavigable('Difficult', 'Walk')).toBe(true);
    });
  });

  describe('calculateDailyMovement', () => {
    it('should calculate kilometers per day based on movement rate and terrain', () => {
      const character = createMockCharacter();
      const terrain: TerrainType = 'Normal';
      const environment: Environment = 'Wilderness';

      // Expected: movementRate * 48 turns per day / 1000 to convert to km
      const expected = Math.round(((character.movementRate * 48) / 1000) * 10) / 10;

      expect(calculateDailyMovement(character, terrain, environment)).toBe(expected);
    });

    it('should apply terrain and environment feature modifiers', () => {
      const character = createMockCharacter();
      const terrain: TerrainType = 'Difficult';
      const environment: Environment = 'Wilderness';
      const feature = 'road';

      // Road gives a 1.5x multiplier while difficult terrain is 0.75x
      // So difficult terrain with road is actually faster than normal terrain

      // 1. Should be greater than movement on difficult terrain without a road
      const withoutRoadMovement = calculateDailyMovement(character, terrain, environment);
      const withRoadMovement = calculateDailyMovement(character, terrain, environment, feature);
      expect(withRoadMovement).toBeGreaterThan(withoutRoadMovement);

      // 2. Calculate the expected multiplier effect:
      // Road (1.5) * Difficult terrain (0.75) = 1.125
      // Normal terrain is 1.0, so road on difficult terrain should be faster
      const normalTerrainMovement = calculateDailyMovement(character, 'Normal', environment);
      expect(withRoadMovement).toBeGreaterThan(normalTerrainMovement);

      // 3. Verify the ratio is approximately consistent with our expectation
      // Due to rounding in the implementation, we can't expect exactly 1.125
      const ratio = withRoadMovement / normalTerrainMovement;
      // Use a lower precision check (0 decimal places)
      expect(ratio).toBeGreaterThan(1.0);
      expect(ratio).toBeLessThan(1.3);
    });

    it('should increase movement by 50% for forced march', () => {
      const character = createMockCharacter();
      const terrain: TerrainType = 'Normal';
      const environment: Environment = 'Wilderness';

      // Normal movement
      const normalMovement = calculateDailyMovement(
        character,
        terrain,
        environment,
        undefined,
        false
      );

      // Forced march movement (should be 1.5x)
      const forcedMovement = calculateDailyMovement(
        character,
        terrain,
        environment,
        undefined,
        true
      );

      // Check that the ratio is approximately 1.5
      const ratio = forcedMovement / normalMovement;
      expect(ratio).toBeCloseTo(1.5, 1);
    });
  });
});
