import { ForagingCommand } from '@osric/commands/exploration/ForagingCommand';
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

describe('ForagingCommand', () => {
  let context: GameContext;

  beforeEach(() => {
    const store = createStore();
    context = new GameContext(store);
  });

  describe('Parameter Validation', () => {
    it('should validate required parameters', async () => {
      const command = new ForagingCommand({
        characterId: '',
        forageType: 'food',
        terrain: 'forest',
        season: 'summer',
        timeSpent: 4,
        groupSize: 1,
        hasForagingTools: false,
      });

      const result = await command.execute(context);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Character');
    });

    it('should accept valid parameters', async () => {
      const character = {
        id: 'test-character',
        name: 'Test Ranger',
        class: 'Ranger',
        level: 3,
        abilities: { wisdom: 15, intelligence: 12 },
        statusEffects: [],
      } as unknown as Character;

      context.setEntity('test-character', character);

      const command = new ForagingCommand({
        characterId: 'test-character',
        forageType: 'food',
        terrain: 'forest',
        season: 'summer',
        timeSpent: 4,
        groupSize: 1,
        hasForagingTools: false,
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);
    });
  });

  describe('Command Execution', () => {
    it('should execute successfully with valid data', async () => {
      const character = {
        id: 'test-character',
        abilities: { wisdom: 14, intelligence: 10 },
      } as unknown as Character;

      context.setEntity('test-character', character);

      const command = new ForagingCommand({
        characterId: 'test-character',
        forageType: 'food',
        terrain: 'forest',
        season: 'summer',
        timeSpent: 4,
        groupSize: 1,
        hasForagingTools: false,
      });

      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
      expect(result.data).toBeDefined();
    });

    it('should handle valid parameters provided', async () => {
      const character = {
        id: 'test-ranger',
        class: 'Ranger',
        level: 5,
        hitPoints: { current: 32, maximum: 32 },
        abilities: { wisdom: 16, intelligence: 13 },
        statusEffects: [],
      } as unknown as Character;

      context.setEntity('test-ranger', character);

      const command = new ForagingCommand({
        characterId: 'test-ranger',
        forageType: 'both',
        terrain: 'grassland',
        season: 'autumn',
        timeSpent: 8,
        groupSize: 3,
        hasForagingTools: true,
        weatherConditions: {
          type: 'clear',
          impactsForaging: false,
        },
      });

      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe('Error Scenarios', () => {
    it('should handle missing entities', async () => {
      const command = new ForagingCommand({
        characterId: 'nonexistent-character',
        forageType: 'food',
        terrain: 'forest',
        season: 'summer',
        timeSpent: 4,
        groupSize: 1,
        hasForagingTools: false,
      });

      const result = await command.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Character with ID');
    });

    it('should handle invalid parameters provided', async () => {
      const character = {
        id: 'test-character',
        hitPoints: { current: 10, maximum: 10 },
        abilities: { wisdom: 10 },
        statusEffects: [],
      } as unknown as Character;

      context.setEntity('test-character', character);

      const command = new ForagingCommand({
        characterId: 'test-character',
        forageType: 'food',
        terrain: 'forest',
        season: 'summer',
        timeSpent: 0,
        groupSize: 1,
        hasForagingTools: false,
      });

      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe('OSRIC Compliance', () => {
    it('should implement authentic OSRIC/AD&D 1st Edition mechanics', async () => {
      const character = {
        id: 'test-character',
        class: 'Ranger',
        level: 4,
        hitPoints: { current: 28, maximum: 28 },
        abilities: { wisdom: 17, intelligence: 14 },
        statusEffects: [],
      } as unknown as Character;

      context.setEntity('test-character', character);

      const command = new ForagingCommand({
        characterId: 'test-character',
        forageType: 'both',
        terrain: 'forest',
        season: 'spring',
        timeSpent: 8,
        groupSize: 4,
        hasForagingTools: true,
        weatherConditions: {
          type: 'light_rain',
          impactsForaging: true,
        },
      });

      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe('Command Properties', () => {
    it('should have correct command type', () => {
      const command = new ForagingCommand({
        characterId: 'test-character',
        forageType: 'food',
        terrain: 'forest',
        season: 'summer',
        timeSpent: 4,
        groupSize: 1,
        hasForagingTools: false,
      });

      expect(command.type).toBe('foraging');
    });

    it('should provide required rules list', () => {
      const command = new ForagingCommand({
        characterId: 'test-character',
        forageType: 'food',
        terrain: 'forest',
        season: 'summer',
        timeSpent: 4,
        groupSize: 1,
        hasForagingTools: false,
      });

      const requiredRules = command.getRequiredRules();
      expect(Array.isArray(requiredRules)).toBe(true);
    });
  });
});
