import {
  checkResurrectionSurvival,
  checkSystemShock,
  handleBleeding,
  processDeath,
  resurrectCharacter,
} from '@rules/combat/death';
import type { Character, Monster, StatusEffect } from '@rules/types';
import { roll } from '@rules/utils/dice';
import { createMockCharacter } from '@tests/utils/mockData';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { mockFighter, mockGoblin } from './mockData';

// Mock dice rolls for consistent testing
vi.mock('@rules/utils/dice', () => ({
  roll: vi.fn(),
}));

// Create test character with specified constitution
const createTestCharacter = (constitutionScore: number): Character => {
  const character = createMockCharacter({});
  character.abilities.constitution = constitutionScore;
  character.level = 5;
  character.hitPoints = { current: 30, maximum: 30 };
  character.experience = {
    current: 8000,
    requiredForNextLevel: 16000,
    level: 5,
  };

  // Reset the modifiers to 0 as the functions will calculate the actual chances
  character.abilityModifiers.constitutionSystemShock = 0;
  character.abilityModifiers.constitutionResurrectionSurvival = 0;

  return character;
};

// Use mockGoblin for monster tests
const createTestMonster = (): Monster => {
  return { ...mockGoblin };
};

describe('Death and System Shock mechanics', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('System Shock Survival', () => {
    test('should pass system shock check if roll is below survival chance', () => {
      const character = createTestCharacter(12); // 80% chance
      vi.mocked(roll).mockReturnValue(75); // Roll below survival chance

      expect(checkSystemShock(character)).toBe(true);
      expect(roll).toHaveBeenCalledWith(100);
    });

    test('should fail system shock check if roll is above survival chance', () => {
      const character = createTestCharacter(12); // 80% chance
      vi.mocked(roll).mockReturnValue(85); // Roll above survival chance

      expect(checkSystemShock(character)).toBe(false);
      expect(roll).toHaveBeenCalledWith(100);
    });

    test('should apply constitution modifiers to system shock chance', () => {
      const character = createTestCharacter(12); // Base 80% chance
      character.abilityModifiers.constitutionSystemShock = 5; // Modify to 85%

      vi.mocked(roll).mockReturnValue(82); // Would fail at 80%, but pass at 85%

      expect(checkSystemShock(character)).toBe(true);
      expect(roll).toHaveBeenCalledWith(100);
    });
  });

  describe('Resurrection Survival', () => {
    test('should pass resurrection check if roll is below survival chance', () => {
      const character = createTestCharacter(15); // 94% chance
      vi.mocked(roll).mockReturnValue(90); // Roll below survival chance

      expect(checkResurrectionSurvival(character)).toBe(true);
      expect(roll).toHaveBeenCalledWith(100);
    });

    test('should fail resurrection check if roll is above survival chance', () => {
      const character = createTestCharacter(15); // 94% chance
      vi.mocked(roll).mockReturnValue(95); // Roll above survival chance

      expect(checkResurrectionSurvival(character)).toBe(false);
      expect(roll).toHaveBeenCalledWith(100);
    });

    test('should always fail for monsters', () => {
      const monster = createTestMonster();

      expect(checkResurrectionSurvival(monster)).toBe(false);
      expect(roll).not.toHaveBeenCalled();
    });
  });

  describe('Death Processing', () => {
    test('should create Dead status effect', () => {
      const character = createTestCharacter(15);
      const result = processDeath(character);

      expect(result.statusEffects.length).toBe(1);
      expect(result.statusEffects[0].name).toBe('Dead');
      expect(result.message).toContain('has died');
    });

    test('should check resurrection possibility for characters', () => {
      const character = createTestCharacter(15);
      vi.mocked(roll).mockReturnValue(80); // Pass resurrection check

      const result = processDeath(character);

      expect(result.message).toContain('can be resurrected');
      expect(roll).toHaveBeenCalledWith(100);
    });

    test('should handle characters that cannot be resurrected', () => {
      const character = createTestCharacter(15);
      vi.mocked(roll).mockReturnValue(99); // Fail resurrection check

      const result = processDeath(character);

      expect(result.message).toContain('cannot be resurrected');
      expect(result.statusEffects[0].endCondition).toBe('Cannot be resurrected');
      expect(roll).toHaveBeenCalledWith(100);
    });
  });

  describe('Resurrection', () => {
    test('should resurrect character successfully', () => {
      const character = createTestCharacter(15);
      character.hitPoints.current = 0;
      character.statusEffects.push({
        name: 'Dead',
        duration: 0,
        effect: 'Character is dead',
        savingThrow: null,
        endCondition: 'When resurrected',
      });

      vi.mocked(roll).mockReturnValue(80); // Pass resurrection check

      const result = resurrectCharacter(character);

      expect(result.success).toBe(true);
      expect(character.hitPoints.current).toBe(1);
      expect(character.statusEffects.length).toBe(0); // Dead effect removed
      expect(result.statusEffects.length).toBe(1); // Weakened effect added
      expect(result.statusEffects[0].name).toBe('Weakened');
    });

    test('should handle failed resurrection', () => {
      const character = createTestCharacter(15);
      character.hitPoints.current = 0;

      vi.mocked(roll).mockReturnValue(99); // Fail resurrection check

      const result = resurrectCharacter(character);

      expect(result.success).toBe(false);
      expect(character.hitPoints.current).toBe(0); // Hit points unchanged
      expect(result.statusEffects.length).toBe(0);
    });

    test('should add Bedridden status for Raise Dead spell', () => {
      const character = createTestCharacter(15);
      character.hitPoints.current = 0;
      character.statusEffects.push({
        name: 'Dead',
        duration: 0,
        effect: 'Character is dead',
        savingThrow: null,
        endCondition: 'When resurrected',
      });

      vi.mocked(roll).mockReturnValue(80); // Pass resurrection check

      const result = resurrectCharacter(character, 5); // Level 5 = Raise Dead

      expect(result.success).toBe(true);
      expect(result.statusEffects.length).toBe(2);
      expect(result.statusEffects[0].name).toBe('Weakened');
      expect(result.statusEffects[1].name).toBe('Bedridden');
      expect(result.statusEffects[1].duration).toBe(character.level); // Days equal to character level
    });
  });

  describe('Bleeding', () => {
    test('should apply bleeding to unconscious characters', () => {
      const character = createTestCharacter(15);
      character.hitPoints.current = 0;

      const result = handleBleeding(character);

      expect(character.hitPoints.current).toBe(-1); // Lost 1 hp
      expect(result.isDead).toBe(false);
      expect(result.statusEffects.length).toBe(1);
      expect(result.statusEffects[0].name).toBe('Bleeding');
    });

    test('should handle death from bleeding', () => {
      const character = createTestCharacter(15);
      character.hitPoints.current = -9;

      // Add a bleeding status effect to ensure the bleeding function processes it
      character.statusEffects.push({
        name: 'Bleeding',
        duration: 0,
        effect: 'Losing 1 hp per round',
        savingThrow: null,
        endCondition: 'When healed above 0 hp or dies',
      });

      const result = handleBleeding(character);

      expect(character.hitPoints.current).toBe(-10); // Lost 1 hp
      expect(result.isDead).toBe(true);
      expect(result.statusEffects.length).toBeGreaterThan(0);
      expect(result.statusEffects[0].name).toBe('Dead');
    });

    test('should not affect characters not at exactly 0 hp', () => {
      const character = createTestCharacter(15);
      character.hitPoints.current = 5;

      const result = handleBleeding(character);

      expect(character.hitPoints.current).toBe(5); // Unchanged
      expect(result.isDead).toBe(false);
      expect(result.statusEffects.length).toBe(0);
    });
  });
});
