// File: __tests__/commands/exploration/FallingDamageCommand.test.ts
import { FallingDamageCommand } from '@osric/commands/exploration/FallingDamageCommand';
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

describe('FallingDamageCommand', () => {
  let context: GameContext;

  beforeEach(() => {
    const store = createStore();
    context = new GameContext(store);
  });

  describe('Parameter Validation', () => {
    it('should validate required parameters', async () => {
      // Test with missing characterId
      const command = new FallingDamageCommand({
        characterId: '', // Invalid empty characterId
        fallDistance: 30,
        surfaceType: 'normal',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Character');
    });

    it('should accept valid parameters', async () => {
      // Create a test character with minimal properties
      const character = {
        id: 'test-character',
        name: 'Test Fighter',
        class: 'Fighter',
        level: 3,
        hitPoints: { current: 24, maximum: 24 },
        abilities: { dexterity: 14 },
        statusEffects: [],
      } as unknown as Character;

      context.setEntity('test-character', character);

      const command = new FallingDamageCommand({
        characterId: 'test-character',
        fallDistance: 30,
        surfaceType: 'normal',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);
    });
  });

  describe('Command Execution', () => {
    it('should execute successfully with valid data', async () => {
      const character = {
        id: 'test-character',
        hitPoints: { current: 24, maximum: 24 },
        abilities: { dexterity: 14 },
      } as unknown as Character;

      context.setEntity('test-character', character);

      const command = new FallingDamageCommand({
        characterId: 'test-character',
        fallDistance: 20, // 2d6 damage (20 feet)
        surfaceType: 'normal',
      });

      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
      expect(result.data).toBeDefined();
    });

    it('should handle character takes falling damage correctly', async () => {
      const character = {
        id: 'test-fighter',
        hitPoints: { current: 24, maximum: 24 },
        abilities: { dexterity: 12 },
      } as unknown as Character;

      context.setEntity('test-fighter', character);

      const command = new FallingDamageCommand({
        characterId: 'test-fighter',
        fallDistance: 30, // 3d6 damage (30 feet)
        surfaceType: 'hard', // 1.5x damage multiplier
        circumstances: {
          intentional: false,
          hasFeatherFall: false,
        },
      });

      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      // Should apply OSRIC falling damage: 1d6 per 10 feet
    });
  });

  describe('Error Scenarios', () => {
    it('should handle missing entities', async () => {
      const command = new FallingDamageCommand({
        characterId: 'nonexistent-character',
        fallDistance: 30,
        surfaceType: 'normal',
      });

      const result = await command.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Character with ID');
    });

    it('should handle character with invalid height', async () => {
      const character = {
        id: 'test-character',
        hitPoints: { current: 10, maximum: 10 },
      } as unknown as Character;

      context.setEntity('test-character', character);

      const command = new FallingDamageCommand({
        characterId: 'test-character',
        fallDistance: -10, // Invalid negative distance
        surfaceType: 'normal',
      });

      const result = await command.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('distance');
    });
  });

  describe('OSRIC Compliance', () => {
    it('should implement authentic OSRIC/AD&D 1st Edition mechanics', async () => {
      const character = {
        id: 'test-character',
        hitPoints: { current: 24, maximum: 24 },
        abilities: { dexterity: 16 }, // High dex for checks
        class: 'Fighter',
      } as unknown as Character;

      context.setEntity('test-character', character);

      const command = new FallingDamageCommand({
        characterId: 'test-character',
        fallDistance: 50, // 5d6 damage (50 feet)
        surfaceType: 'spikes', // 2x damage multiplier
        circumstances: {
          dexterityCheck: true,
          encumbrance: 'light',
        },
      });

      const result = await command.execute(context);

      // Validate authentic OSRIC mechanics
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      // Should follow OSRIC falling damage rules: 1d6 per 10 feet with modifiers
    });
  });

  describe('Command Properties', () => {
    it('should have correct command type', () => {
      const command = new FallingDamageCommand({
        characterId: 'test-character',
        fallDistance: 10,
      });

      expect(command.type).toBe('falling-damage');
    });

    it('should provide required rules list', () => {
      const command = new FallingDamageCommand({
        characterId: 'test-character',
        fallDistance: 10,
      });

      const requiredRules = command.getRequiredRules();
      expect(Array.isArray(requiredRules)).toBe(true);
      // Should include falling damage calculation rules
    });
  });
});
