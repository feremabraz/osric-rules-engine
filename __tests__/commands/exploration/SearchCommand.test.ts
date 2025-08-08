import { SearchCommand } from '@osric/commands/exploration/SearchCommand';
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

describe('SearchCommand', () => {
  let context: GameContext;

  beforeEach(() => {
    const store = createStore();
    context = new GameContext(store);
  });

  describe('Parameter Validation', () => {
    it('should validate required parameters', async () => {
      const command = new SearchCommand({
        characterId: 'nonexistent-character',
        searchType: 'secret-doors',
        timeSpent: 10,
        thoroughness: 'normal',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Character with ID');
    });

    it('should accept valid parameters', async () => {
      const character = {
        id: 'test-character',
        name: 'Test Searcher',
        race: 'Human',
        class: 'Fighter',
        abilities: { wisdom: 14 },
        hitPoints: { current: 12, maximum: 12 },
      } as unknown as Character;

      context.setEntity('test-character', character);

      const command = new SearchCommand({
        characterId: 'test-character',
        searchType: 'secret-doors',
        timeSpent: 10,
        thoroughness: 'normal',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);
    });
  });

  describe('Command Execution', () => {
    it('should execute successfully with valid data', async () => {
      const character = {
        id: 'test-character',
        name: 'Test Searcher',
        race: 'Human',
        class: 'Fighter',
        abilities: { wisdom: 12 },
        hitPoints: { current: 12, maximum: 12 },
      } as unknown as Character;

      context.setEntity('test-character', character);

      const command = new SearchCommand({
        characterId: 'test-character',
        searchType: 'general',
        timeSpent: 10,
        thoroughness: 'normal',
      });

      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
      expect(result.data).toBeDefined();
    });

    it('should handle character searches area successfully', async () => {
      const character = {
        id: 'test-character',
        name: 'Elven Searcher',
        race: 'Elf',
        class: 'Fighter',
        abilities: { wisdom: 16 },
        hitPoints: { current: 12, maximum: 12 },
      } as unknown as Character;

      context.setEntity('test-character', character);

      const command = new SearchCommand({
        characterId: 'test-character',
        searchType: 'secret-doors',
        target: {
          area: 'north wall',
          specificTarget: 'hidden door mechanism',
        },
        timeSpent: 10,
        thoroughness: 'careful',
      });

      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.searchType).toBe('secret-doors');
      expect(result.data?.target).toBeDefined();
    });
  });

  describe('Error Scenarios', () => {
    it('should handle missing entities', async () => {
      const command = new SearchCommand({
        characterId: 'nonexistent-character',
        searchType: 'traps',
        timeSpent: 5,
        thoroughness: 'quick',
      });

      const result = await command.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Character with ID');
    });

    it('should handle character searches invalid area', async () => {
      const character = {
        id: 'test-character',
        name: 'Test Searcher',
        race: 'Human',
        class: 'Fighter',
        abilities: { wisdom: 8 },
        hitPoints: { current: 12, maximum: 12 },
      } as unknown as Character;

      context.setEntity('test-character', character);

      const command = new SearchCommand({
        characterId: 'test-character',
        searchType: 'traps',
        target: {
          area: 'dangerous_trapped_area',
        },
        timeSpent: 5,
        thoroughness: 'quick',
      });

      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.searchType).toBe('traps');
    });
  });

  describe('OSRIC Compliance', () => {
    it('should implement authentic OSRIC/AD&D 1st Edition mechanics', async () => {
      const character = {
        id: 'test-character',
        name: 'Elven Thief',
        race: 'Elf',
        class: 'Thief',
        abilities: { wisdom: 16 },
        thiefSkills: { findTraps: 75 },
        hitPoints: { current: 12, maximum: 12 },
      } as unknown as Character;

      context.setEntity('test-character', character);

      const command = new SearchCommand({
        characterId: 'test-character',
        searchType: 'secret-doors',
        timeSpent: 10,
        thoroughness: 'careful',
      });

      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.modifiers).toBeDefined();
      expect(result.data?.searchRoll).toBeGreaterThanOrEqual(1);
      expect(result.data?.searchRoll).toBeLessThanOrEqual(100);
    });
  });

  describe('Command Properties', () => {
    it('should have correct command type', () => {
      const command = new SearchCommand({
        characterId: 'test-character',
        searchType: 'hidden-objects',
        timeSpent: 10,
        thoroughness: 'normal',
      });

      expect(command.type).toBe('search');
    });

    it('should provide required rules list', () => {
      const command = new SearchCommand({
        characterId: 'test-character',
        searchType: 'traps',
        timeSpent: 5,
        thoroughness: 'meticulous',
      });

      const requiredRules = command.getRequiredRules();
      expect(Array.isArray(requiredRules)).toBe(true);
      expect(requiredRules).toEqual(
        expect.arrayContaining(['search-mechanics', 'secret-door-detection'])
      );
    });
  });
});
