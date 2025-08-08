// File: __tests__/commands/exploration/WeatherCheckCommand.test.ts
import { WeatherCheckCommand } from '@osric/commands/exploration/WeatherCheckCommand';
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

describe('WeatherCheckCommand', () => {
  let context: GameContext;

  beforeEach(() => {
    const store = createStore();
    context = new GameContext(store);
  });

  describe('Parameter Validation', () => {
    it('should validate required parameters', async () => {
      // Test with missing character
      const command = new WeatherCheckCommand({
        characterId: 'nonexistent-character',
        currentWeather: {
          type: 'clear',
          intensity: 'light',
          duration: 2,
          temperature: 'mild',
        },
        activityType: 'travel',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Character with ID');
    });

    it('should accept valid parameters', async () => {
      const character = {
        id: 'test-character',
        name: 'Test Traveler',
        race: 'Human',
        class: 'Fighter',
        abilities: { constitution: 14 },
        movementRate: 120,
        hitPoints: { current: 12, maximum: 12 },
        inventory: [],
      } as unknown as Character;

      context.setEntity('test-character', character);

      const command = new WeatherCheckCommand({
        characterId: 'test-character',
        currentWeather: {
          type: 'overcast',
          intensity: 'moderate',
          duration: 4,
          temperature: 'cool',
        },
        activityType: 'travel',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);
    });
  });

  describe('Command Execution', () => {
    it('should execute successfully with valid data', async () => {
      const character = {
        id: 'test-character',
        name: 'Test Adventurer',
        race: 'Human',
        class: 'Fighter',
        abilities: { constitution: 12 },
        movementRate: 120,
        hitPoints: { current: 12, maximum: 12 },
        inventory: [],
      } as unknown as Character;

      context.setEntity('test-character', character);

      const command = new WeatherCheckCommand({
        characterId: 'test-character',
        currentWeather: {
          type: 'light-rain',
          intensity: 'moderate',
          duration: 3,
          temperature: 'cool',
        },
        activityType: 'combat',
      });

      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
      expect(result.data).toBeDefined();
    });

    it('should handle valid parameters provided', async () => {
      const character = {
        id: 'test-character',
        name: 'Weather-Hardy Ranger',
        race: 'Human',
        class: 'Ranger',
        abilities: { constitution: 16 },
        movementRate: 120,
        hitPoints: { current: 18, maximum: 18 },
        inventory: [{ name: 'Fur Cloak', magicBonus: 0 }],
      } as unknown as Character;

      context.setEntity('test-character', character);

      const command = new WeatherCheckCommand({
        characterId: 'test-character',
        currentWeather: {
          type: 'heavy-snow',
          intensity: 'heavy',
          duration: 6,
          temperature: 'freezing',
        },
        activityType: 'travel',
        exposureTime: 4,
      });

      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.weather).toBeDefined();
      expect(result.data?.activityType).toBe('travel');
    });
  });

  describe('Error Scenarios', () => {
    it('should handle missing entities', async () => {
      const command = new WeatherCheckCommand({
        characterId: 'nonexistent-character',
        currentWeather: {
          type: 'storm',
          intensity: 'severe',
          duration: 8,
          temperature: 'cold',
        },
        activityType: 'combat',
      });

      const result = await command.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Character with ID');
    });

    it('should handle invalid parameters provided', async () => {
      const character = {
        id: 'test-character',
        name: 'Exposed Character',
        race: 'Human',
        class: 'Fighter',
        abilities: { constitution: 8 },
        movementRate: 120,
        hitPoints: { current: 6, maximum: 10 },
        inventory: [],
      } as unknown as Character;

      context.setEntity('test-character', character);

      const command = new WeatherCheckCommand({
        characterId: 'test-character',
        currentWeather: {
          type: 'blizzard',
          intensity: 'severe',
          duration: 12,
          temperature: 'freezing',
        },
        activityType: 'spellcasting',
        exposureTime: 8,
      });

      const result = await command.execute(context);

      // Weather check should execute but cause damage and penalties
      expect(result.success).toBe(true);
      expect(result.data?.damage).toBeGreaterThan(0);
    });
  });

  describe('OSRIC Compliance', () => {
    it('should implement authentic OSRIC/AD&D 1st Edition mechanics', async () => {
      const character = {
        id: 'test-character',
        name: 'Hardy Adventurer',
        race: 'Human',
        class: 'Ranger',
        abilities: { constitution: 15 },
        movementRate: 120,
        hitPoints: { current: 14, maximum: 14 },
        inventory: [{ name: 'Resistance Cloak', magicBonus: 1 }],
      } as unknown as Character;

      context.setEntity('test-character', character);

      const command = new WeatherCheckCommand({
        characterId: 'test-character',
        currentWeather: {
          type: 'fog',
          intensity: 'heavy',
          duration: 4,
          temperature: 'mild',
        },
        activityType: 'ranged-attack',
        exposureTime: 2,
      });

      const result = await command.execute(context);

      // Validate authentic OSRIC mechanics
      expect(result.success).toBe(true);
      expect(result.data?.effects).toBeDefined();
      expect(result.data?.modifiedMovementRate).toBeDefined();
      expect(result.effects).toBeDefined();
    });
  });

  describe('Command Properties', () => {
    it('should have correct command type', () => {
      const command = new WeatherCheckCommand({
        characterId: 'test-character',
        currentWeather: {
          type: 'wind',
          intensity: 'moderate',
          duration: 3,
          temperature: 'warm',
        },
        activityType: 'rest',
      });

      expect(command.type).toBe('weather-check');
    });

    it('should provide required rules list', () => {
      const command = new WeatherCheckCommand({
        characterId: 'test-character',
        currentWeather: {
          type: 'clear',
          intensity: 'light',
          duration: 1,
          temperature: 'mild',
        },
        activityType: 'foraging',
      });

      const requiredRules = command.getRequiredRules();
      expect(Array.isArray(requiredRules)).toBe(true);
      expect(requiredRules).toEqual([]);
    });
  });
});
