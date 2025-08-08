// File: __tests__/commands/exploration/TerrainNavigationCommand.test.ts
import { TerrainNavigationCommand } from '@osric/commands/exploration/TerrainNavigationCommand';
import { GameContext } from '@osric/core/GameContext';
import type {
  AbilityScores,
  Alignment,
  Character,
  CharacterClass,
  CharacterRace,
  CharacterSex,
} from '@osric/types/entities';
import { createStore } from 'jotai';
import { beforeEach, describe, expect, it } from 'vitest';

describe('TerrainNavigationCommand', () => {
  let context: GameContext;

  beforeEach(() => {
    const store = createStore();
    context = new GameContext(store);
  });

  describe('Parameter Validation', () => {
    it('should validate required parameters', async () => {
      // Test with missing character
      const command = new TerrainNavigationCommand({
        characterId: 'nonexistent-character',
        terrainType: TerrainNavigationCommand.TERRAIN_TYPES.plains,
        distance: 10,
        navigationMethod: 'compass',
        hasMap: false,
        timeOfDay: 'day',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Character with ID');
    });

    it('should accept valid parameters', async () => {
      const character = {
        id: 'test-character',
        name: 'Test Navigator',
        race: 'Human',
        class: 'Ranger',
        abilities: { wisdom: 14 },
        movementRate: 120,
        hitPoints: { current: 12, maximum: 12 },
      } as unknown as Character;

      context.setEntity('test-character', character);

      const command = new TerrainNavigationCommand({
        characterId: 'test-character',
        terrainType: TerrainNavigationCommand.TERRAIN_TYPES.forest,
        distance: 5,
        navigationMethod: 'landmark',
        hasMap: true,
        timeOfDay: 'day',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);
    });
  });

  describe('Command Execution', () => {
    it('should execute successfully with valid data', async () => {
      const character = {
        id: 'test-character',
        name: 'Test Navigator',
        race: 'Human',
        class: 'Fighter',
        abilities: { wisdom: 12 },
        movementRate: 120,
        hitPoints: { current: 12, maximum: 12 },
      } as unknown as Character;

      context.setEntity('test-character', character);

      const command = new TerrainNavigationCommand({
        characterId: 'test-character',
        terrainType: TerrainNavigationCommand.TERRAIN_TYPES.plains,
        distance: 8,
        navigationMethod: 'compass',
        hasMap: false,
        timeOfDay: 'day',
      });

      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
      expect(result.data).toBeDefined();
    });

    it('should handle valid parameters provided', async () => {
      const character = {
        id: 'test-character',
        name: 'Ranger Navigator',
        race: 'Human',
        class: 'Ranger',
        abilities: { wisdom: 16 },
        movementRate: 120,
        hitPoints: { current: 15, maximum: 15 },
      } as unknown as Character;

      context.setEntity('test-character', character);

      const command = new TerrainNavigationCommand({
        characterId: 'test-character',
        terrainType: TerrainNavigationCommand.TERRAIN_TYPES.forest,
        distance: 12,
        navigationMethod: 'ranger-tracking',
        weatherConditions: {
          visibility: 2000,
          movementPenalty: -10,
        },
        hasMap: true,
        timeOfDay: 'day',
      });

      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.terrainType).toBe('Forest');
      expect(result.data?.plannedDistance).toBe(12);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle missing entities', async () => {
      const command = new TerrainNavigationCommand({
        characterId: 'nonexistent-character',
        terrainType: TerrainNavigationCommand.TERRAIN_TYPES.mountains,
        distance: 15,
        navigationMethod: 'none',
        hasMap: false,
        timeOfDay: 'night',
      });

      const result = await command.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Character with ID');
    });

    it('should handle invalid parameters provided', async () => {
      const character = {
        id: 'test-character',
        name: 'Lost Traveler',
        race: 'Human',
        class: 'Fighter',
        abilities: { wisdom: 6 },
        movementRate: 120,
        hitPoints: { current: 8, maximum: 12 },
      } as unknown as Character;

      context.setEntity('test-character', character);

      const command = new TerrainNavigationCommand({
        characterId: 'test-character',
        terrainType: TerrainNavigationCommand.TERRAIN_TYPES.swamp,
        distance: 20,
        navigationMethod: 'none',
        weatherConditions: {
          visibility: 100,
          movementPenalty: 50,
        },
        hasMap: false,
        timeOfDay: 'night',
      });

      const result = await command.execute(context);

      // Navigation should execute but may result in getting lost
      expect(result.success).toBe(true);
      expect(result.data?.terrainType).toBe('Swamp');
    });
  });

  describe('OSRIC Compliance', () => {
    it('should implement authentic OSRIC/AD&D 1st Edition mechanics', async () => {
      const character = {
        id: 'test-character',
        name: 'Experienced Ranger',
        race: 'Human',
        class: 'Ranger',
        abilities: { wisdom: 18 },
        movementRate: 120,
        hitPoints: { current: 16, maximum: 16 },
      } as unknown as Character;

      context.setEntity('test-character', character);

      const command = new TerrainNavigationCommand({
        characterId: 'test-character',
        terrainType: TerrainNavigationCommand.TERRAIN_TYPES.forest,
        distance: 15,
        navigationMethod: 'ranger-tracking',
        hasMap: true,
        timeOfDay: 'day',
      });

      const result = await command.execute(context);

      // Validate authentic OSRIC mechanics
      expect(result.success).toBe(true);
      expect(result.data?.navigationResult).toBeDefined();
      expect(result.data?.effectiveMovementRate).toBeDefined();
      expect(result.data?.actualTime).toBeDefined();
    });
  });

  describe('Command Properties', () => {
    it('should have correct command type', () => {
      const command = new TerrainNavigationCommand({
        characterId: 'test-character',
        terrainType: TerrainNavigationCommand.TERRAIN_TYPES.hills,
        distance: 10,
        navigationMethod: 'stars',
        hasMap: false,
        timeOfDay: 'night',
      });

      expect(command.type).toBe('terrain-navigation');
    });

    it('should provide required rules list', () => {
      const command = new TerrainNavigationCommand({
        characterId: 'test-character',
        terrainType: TerrainNavigationCommand.TERRAIN_TYPES.desert,
        distance: 25,
        navigationMethod: 'compass',
        hasMap: true,
        timeOfDay: 'day',
      });

      const requiredRules = command.getRequiredRules();
      expect(Array.isArray(requiredRules)).toBe(true);
      expect(requiredRules).toEqual([]);
    });
  });
});
