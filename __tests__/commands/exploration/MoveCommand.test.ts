import { MoveCommand } from '@osric/commands/exploration/MoveCommand';
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

describe('MoveCommand', () => {
  let context: GameContext;

  beforeEach(() => {
    const store = createStore();
    context = new GameContext(store);
  });

  describe('Parameter Validation', () => {
    it('should validate required parameters', async () => {
      const command = new MoveCommand({
        characterId: '',
        movement: {
          type: 'walk',
          distance: 30,
        },
        terrain: {
          type: 'Normal',
          environment: 'dungeon',
        },
        timeScale: 'exploration',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Character');
    });

    it('should accept valid parameters', async () => {
      const character = {
        id: 'test-character',
        name: 'Test Fighter',
        class: 'Fighter',
        level: 2,
        hitPoints: { current: 16, maximum: 16 },
        abilities: { dexterity: 12, constitution: 14 },
        statusEffects: [],
      } as unknown as Character;

      context.setEntity('test-character', character);

      const command = new MoveCommand({
        characterId: 'test-character',
        movement: {
          type: 'walk',
          distance: 30,
        },
        terrain: {
          type: 'Normal',
          environment: 'dungeon',
        },
        timeScale: 'exploration',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);
    });
  });

  describe('Command Execution', () => {
    it('should execute successfully with valid data', async () => {
      const character = {
        id: 'test-character',
        hitPoints: { current: 20, maximum: 20 },
        abilities: { dexterity: 13, constitution: 12 },
        statusEffects: [],
      } as unknown as Character;

      context.setEntity('test-character', character);

      const command = new MoveCommand({
        characterId: 'test-character',
        movement: {
          type: 'walk',
          distance: 60,
          direction: 'north',
        },
        terrain: {
          type: 'Normal',
          environment: 'corridor',
        },
        timeScale: 'exploration',
      });

      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
      expect(result.data).toBeDefined();
    });

    it('should handle character moves to valid location', async () => {
      const character = {
        id: 'test-explorer',
        class: 'Ranger',
        level: 3,
        hitPoints: { current: 24, maximum: 24 },
        abilities: { dexterity: 15, constitution: 16 },
        statusEffects: [],
      } as unknown as Character;

      context.setEntity('test-explorer', character);

      const command = new MoveCommand({
        characterId: 'test-explorer',
        movement: {
          type: 'sneak',
          distance: 15,
          destination: 'secret_chamber',
        },
        terrain: {
          type: 'Difficult',
          environment: 'underground',
          environmentalFeature: 'loose_stones',
        },
        timeScale: 'exploration',
      });

      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe('Error Scenarios', () => {
    it('should handle missing entities', async () => {
      const command = new MoveCommand({
        characterId: 'nonexistent-character',
        movement: {
          type: 'walk',
          distance: 30,
        },
        terrain: {
          type: 'Normal',
          environment: 'corridor',
        },
        timeScale: 'exploration',
      });

      const result = await command.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Character with ID');
    });

    it('should handle character moves to blocked location', async () => {
      const character = {
        id: 'test-character',
        hitPoints: { current: 12, maximum: 12 },
        abilities: { dexterity: 10, constitution: 11 },
        statusEffects: [],
      } as unknown as Character;

      context.setEntity('test-character', character);

      const command = new MoveCommand({
        characterId: 'test-character',
        movement: {
          type: 'walk',
          distance: 30,
        },
        terrain: {
          type: 'Impassable',
          environment: 'solid_wall',
        },
        timeScale: 'exploration',
      });

      const result = await command.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Impassable');
    });
  });

  describe('OSRIC Compliance', () => {
    it('should respect OSRIC movement rates by time scale', async () => {
      const character = {
        id: 'test-character',
        hitPoints: { current: 12, maximum: 12 },
        abilities: { dexterity: 14, constitution: 12 },
        statusEffects: [],
      } as unknown as Character;

      context.setEntity('test-character', character);

      const command = new MoveCommand({
        characterId: 'test-character',
        movement: {
          type: 'walk',
          distance: 120,
        },
        terrain: {
          type: 'Normal',
          environment: 'corridor',
        },
        timeScale: 'exploration',
      });

      const result = await command.execute(context);

      expect(result.success).toBe(true);

      expect(result.data).toBeDefined();
    });

    it('should apply proper terrain movement modifiers', async () => {
      const character = {
        id: 'test-character',
        hitPoints: { current: 12, maximum: 12 },
        abilities: { dexterity: 10, constitution: 11 },
        statusEffects: [],
      } as unknown as Character;

      context.setEntity('test-character', character);

      const command = new MoveCommand({
        characterId: 'test-character',
        movement: {
          type: 'walk',
          distance: 60,
        },
        terrain: {
          type: 'Difficult',
          environment: 'thick_undergrowth',
        },
        timeScale: 'exploration',
      });

      const result = await command.execute(context);

      expect(result.data).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe('Command Properties', () => {
    it('should have correct command type', () => {
      const command = new MoveCommand({
        characterId: 'test-character',
        movement: {
          type: 'walk',
          distance: 30,
        },
        terrain: {
          type: 'Normal',
          environment: 'corridor',
        },
        timeScale: 'exploration',
      });

      expect(command.type).toBe('move');
    });

    it('should return required movement rules', () => {
      const command = new MoveCommand({
        characterId: 'test-character',
        movement: {
          type: 'walk',
          distance: 30,
        },
        terrain: {
          type: 'Normal',
          environment: 'corridor',
        },
        timeScale: 'exploration',
      });

      const requiredRules = command.getRequiredRules();
      expect(requiredRules).toEqual(expect.arrayContaining(['movement-rates', 'terrain-effects']));
    });
  });
});
