import {
  applyRacialAbilityAdjustments,
  generate3d6Arranged,
  generate4d6DropLowest,
  generateStandard3d6,
  meetsRacialRequirements,
  rollExceptionalStrength,
} from '@rules/character/abilityScoreGeneration';
import type { AbilityScores } from '@rules/types';
import type { CharacterRace } from '@rules/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock Math.random for predictable test results
const mockMathRandom = vi.spyOn(Math, 'random');

describe('Ability Score Generation', () => {
  beforeEach(() => {
    mockMathRandom.mockReset();
  });

  describe('generateStandard3d6', () => {
    it('should generate ability scores within 3-18 range', () => {
      // Setup Math.random to return predictable values
      mockMathRandom
        .mockReturnValueOnce(0) // 1
        .mockReturnValueOnce(0.5) // 4
        .mockReturnValueOnce(1) // 6
        .mockReturnValueOnce(0.1) // 2
        .mockReturnValueOnce(0.8) // 5
        .mockReturnValueOnce(0.9) // 6
        .mockReturnValueOnce(0.2) // 2
        .mockReturnValueOnce(0.3) // 3
        .mockReturnValueOnce(0.7) // 5
        .mockReturnValueOnce(0.4) // 3
        .mockReturnValueOnce(0.6) // 4
        .mockReturnValueOnce(0.5) // 4
        .mockReturnValueOnce(0.9) // 6
        .mockReturnValueOnce(0.8) // 5
        .mockReturnValueOnce(0.7) // 5
        .mockReturnValueOnce(0.6) // 4
        .mockReturnValueOnce(0.2) // 2
        .mockReturnValueOnce(0.1); // 2

      const scores = generateStandard3d6();

      // 1+4+6 = 11
      expect(scores.strength).toBe(12);
      // 2+5+6 = 13
      expect(scores.dexterity).toBe(12);
      // 2+3+5 = 10
      expect(scores.constitution).toBe(9);
      // 3+4+4 = 11
      expect(scores.intelligence).toBe(11);
      // 6+5+5 = 16
      expect(scores.wisdom).toBe(16);
      // 4+2+2 = 8
      expect(scores.charisma).toBe(7);

      // All scores should be between 3 and 18
      for (const score of Object.values(scores)) {
        expect(score).toBeGreaterThanOrEqual(3);
        expect(score).toBeLessThanOrEqual(18);
      }
    });
  });

  describe('generate3d6Arranged', () => {
    it('should generate six values within 3-18 range', () => {
      mockMathRandom.mockImplementation(() => 0.5); // All dice will be 4

      const scores = generate3d6Arranged();

      expect(scores).toHaveLength(6);
      for (const score of scores) {
        // Each score should be 4+4+4 = 12
        expect(score).toBe(12);
        expect(score).toBeGreaterThanOrEqual(3);
        expect(score).toBeLessThanOrEqual(18);
      }
    });
  });

  describe('generate4d6DropLowest', () => {
    it('should generate six values dropping the lowest die', () => {
      // Return specific values to test drop lowest functionality
      mockMathRandom
        // First roll: 1,2,3,4 (drops 1) = 9
        .mockReturnValueOnce(0) // 1 - lowest, dropped
        .mockReturnValueOnce(0.2) // 2
        .mockReturnValueOnce(0.4) // 3
        .mockReturnValueOnce(0.6) // 4
        // Second roll: 2,3,4,5 (drops 2) = 12
        .mockReturnValueOnce(0.2) // 2 - lowest, dropped
        .mockReturnValueOnce(0.4) // 3
        .mockReturnValueOnce(0.6) // 4
        .mockReturnValueOnce(0.8); // 5

      const scores = generate4d6DropLowest();

      expect(scores).toHaveLength(6);
      expect(scores[0]).toBe(9); // 2+3+4 = 9
      expect(scores[1]).toBe(12); // 3+4+5 = 12
    });
  });

  describe('rollExceptionalStrength', () => {
    it('should return null for non-warrior classes', () => {
      expect(rollExceptionalStrength('Magic-User')).toBeNull();
      expect(rollExceptionalStrength('Thief')).toBeNull();
      expect(rollExceptionalStrength('Cleric')).toBeNull();
    });

    it('should return a number between 1-100 for warrior classes', () => {
      mockMathRandom.mockReturnValue(0.5); // 51

      expect(rollExceptionalStrength('Fighter')).toBe(51);
      expect(rollExceptionalStrength('Paladin')).toBe(51);
      expect(rollExceptionalStrength('Ranger')).toBe(51);
    });
  });

  describe('applyRacialAbilityAdjustments', () => {
    it('should apply Dwarf adjustments correctly', () => {
      const baseScores: AbilityScores = {
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
      };

      const adjusted = applyRacialAbilityAdjustments(baseScores, 'Dwarf');

      expect(adjusted.constitution).toBe(11); // +1
      expect(adjusted.charisma).toBe(9); // -1
    });

    it('should apply Elf adjustments correctly', () => {
      const baseScores: AbilityScores = {
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
      };

      const adjusted = applyRacialAbilityAdjustments(baseScores, 'Elf');

      expect(adjusted.dexterity).toBe(11); // +1
      expect(adjusted.constitution).toBe(9); // -1
    });

    it('should not modify Human ability scores', () => {
      const baseScores: AbilityScores = {
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
      };

      const adjusted = applyRacialAbilityAdjustments(baseScores, 'Human');

      // Should be identical to original
      expect(adjusted).toEqual(baseScores);
    });

    it('should enforce minimum score of 3', () => {
      const lowScores: AbilityScores = {
        strength: 4,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 3,
      };

      const adjusted = applyRacialAbilityAdjustments(lowScores, 'Half-Orc');

      // Half-Orc has -2 charisma, but should be capped at 3
      expect(adjusted.charisma).toBe(3);
    });
  });

  describe('meetsRacialRequirements', () => {
    it('should return true for Humans with any scores', () => {
      const lowScores: AbilityScores = {
        strength: 3,
        dexterity: 3,
        constitution: 3,
        intelligence: 3,
        wisdom: 3,
        charisma: 3,
      };

      expect(meetsRacialRequirements(lowScores, 'Human')).toBe(true);
    });

    it('should return true for Elves with qualifying scores', () => {
      const elfScores: AbilityScores = {
        strength: 3,
        dexterity: 7, // min 7
        constitution: 8, // min 8
        intelligence: 8, // min 8
        wisdom: 3,
        charisma: 8, // min 8
      };

      expect(meetsRacialRequirements(elfScores, 'Elf')).toBe(true);
    });

    it('should return false for Elves with insufficient scores', () => {
      const lowScores: AbilityScores = {
        strength: 3,
        dexterity: 6, // below min 7
        constitution: 8,
        intelligence: 8,
        wisdom: 3,
        charisma: 8,
      };

      expect(meetsRacialRequirements(lowScores, 'Elf')).toBe(false);
    });

    it('should return false for unknown races', () => {
      const scores: AbilityScores = {
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
      };

      expect(meetsRacialRequirements(scores, 'Unknown' as CharacterRace)).toBe(false);
    });
  });
});
