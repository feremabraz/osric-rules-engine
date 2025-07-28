import {
  VALID_MULTICLASS_COMBINATIONS,
  canDualClass,
  canMultiClass,
  distributeExperience,
} from '@rules/character/multiClass';
import type { AbilityScores, CharacterRace } from '@rules/types';
import { describe, expect, it } from 'vitest';

describe('Multi-Class Handling', () => {
  const validScores: AbilityScores = {
    strength: 14,
    dexterity: 15,
    constitution: 12,
    intelligence: 15,
    wisdom: 13,
    charisma: 12,
  };

  describe('canMultiClass', () => {
    it('should return false for humans', () => {
      expect(canMultiClass('Human', ['Fighter', 'Thief'])).toBe(false);
    });

    it('should require at least 2 classes', () => {
      expect(canMultiClass('Elf', ['Fighter'])).toBe(false);
    });

    it('should return true for valid race/class combinations', () => {
      expect(canMultiClass('Elf', ['Fighter', 'Magic-User'])).toBe(true);
      expect(canMultiClass('Dwarf', ['Fighter', 'Thief'])).toBe(true);
      expect(canMultiClass('Elf', ['Fighter', 'Magic-User', 'Thief'])).toBe(true);
      expect(canMultiClass('Half-Elf', ['Cleric', 'Fighter', 'Magic-User'])).toBe(true);
    });

    it('should return false for invalid race/class combinations', () => {
      expect(canMultiClass('Dwarf', ['Fighter', 'Magic-User'])).toBe(false);
      expect(canMultiClass('Halfling', ['Fighter', 'Cleric'])).toBe(false);
      expect(canMultiClass('Gnome', ['Illusionist', 'Cleric'])).toBe(false);
    });

    it('should match the VALID_MULTICLASS_COMBINATIONS table for all races', () => {
      // Test each race's valid combinations
      for (const [race, validCombos] of Object.entries(VALID_MULTICLASS_COMBINATIONS)) {
        // Skip humans
        if (race === 'Human') continue;

        // All valid combinations should return true
        for (const combo of validCombos) {
          expect(canMultiClass(race as CharacterRace, combo)).toBe(true);
        }
      }
    });

    it('should return false for combinations that match in classes but not length', () => {
      expect(canMultiClass('Elf', ['Fighter', 'Magic-User', 'Thief', 'Assassin'])).toBe(false);
      expect(canMultiClass('Halfling', ['Fighter'])).toBe(false);
    });
  });

  describe('canDualClass', () => {
    it('should require original level of at least 2', () => {
      expect(canDualClass('Fighter', 'Magic-User', 1, validScores)).toBe(false);
      expect(canDualClass('Fighter', 'Magic-User', 2, validScores)).toBe(true);
    });

    it('should prevent dual-classing to the same class', () => {
      expect(canDualClass('Fighter', 'Fighter', 2, validScores)).toBe(false);
    });

    it('should check ability score requirements for both classes', () => {
      const lowIntScores: AbilityScores = {
        ...validScores,
        intelligence: 8, // Below Magic-User minimum
      };

      expect(canDualClass('Fighter', 'Magic-User', 2, validScores)).toBe(true);
      expect(canDualClass('Fighter', 'Magic-User', 2, lowIntScores)).toBe(false);
    });
  });

  describe('distributeExperience', () => {
    it('should distribute XP evenly among all classes', () => {
      const result = distributeExperience(1000, ['Fighter', 'Magic-User']);
      expect(result.Fighter).toBe(500);
      expect(result['Magic-User']).toBe(500);
    });

    it('should handle more than two classes', () => {
      const result = distributeExperience(3000, ['Fighter', 'Magic-User', 'Thief']);
      expect(result.Fighter).toBe(1000);
      expect(result['Magic-User']).toBe(1000);
      expect(result.Thief).toBe(1000);
    });

    it('should round down XP when division is not even', () => {
      const result = distributeExperience(999, ['Fighter', 'Magic-User']);
      expect(result.Fighter).toBe(499);
      expect(result['Magic-User']).toBe(499);
      // Note: 1 XP is lost due to rounding down
    });
  });
});
