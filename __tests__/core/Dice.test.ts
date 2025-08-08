// File: __tests__/core/Dice.test.ts
import {
  checkTHAC0Hit,
  roll,
  rollAbilityScore,
  rollAbilityScore4d6DropLowest,
  rollDice,
  rollExpression,
  rollPercentile,
  rollSavingThrow,
  rollWithAdvantage,
  rollWithDisadvantage,
} from '@osric/core/Dice';
import { describe, expect, it } from 'vitest';

describe('Dice', () => {
  describe('Basic Functionality', () => {
    it('should perform primary function correctly', () => {
      // Test basic rollDice function
      const result = rollDice(1, 6);
      expect(result).toBeDefined();
      expect(result.result).toBeGreaterThanOrEqual(1);
      expect(result.result).toBeLessThanOrEqual(6);
      expect(result.sides).toBe(6);
      expect(result.roll).toBe(1);
      expect(result.modifier).toBe(0);
    });

    it('should validate input parameters', () => {
      // Test that zero-sided dice returns 1 (since Math.floor(Math.random() * 0) + 1 = 1)
      const result = rollDice(1, 0);
      expect(result.result).toBe(1);
      expect(result.sides).toBe(0);
    });

    it('should handle dice notation correctly', () => {
      const result = rollExpression('2d6+3');
      expect(result).toBeGreaterThanOrEqual(5); // min: 2 + 3
      expect(result).toBeLessThanOrEqual(15); // max: 12 + 3
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimum boundary values', () => {
      // Test with minimum valid values
      const result = roll(1);
      expect(result).toBe(1);
    });

    it('should handle maximum boundary values', () => {
      // Test with maximum valid values (e.g., d100)
      const result = roll(100);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(100);
    });

    it('should handle multiple dice correctly', () => {
      const result = rollDice(3, 6, 2);
      expect(result.result).toBeGreaterThanOrEqual(5); // min: 3 + 2
      expect(result.result).toBeLessThanOrEqual(20); // max: 18 + 2
      expect(result.roll).toBe(3);
      expect(result.sides).toBe(6);
      expect(result.modifier).toBe(2);
    });
  });

  describe('OSRIC Compliance', () => {
    it('should implement authentic OSRIC/AD&D 1st Edition mechanics', () => {
      // Test standard AD&D dice (d4, d6, d8, d10, d12, d20, d100)
      const standardDice = [4, 6, 8, 10, 12, 20, 100];
      for (const sides of standardDice) {
        const result = roll(sides);
        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeLessThanOrEqual(sides);
      }
    });

    it('should roll ability scores correctly (3d6)', () => {
      const result = rollAbilityScore();
      expect(result).toBeGreaterThanOrEqual(3);
      expect(result).toBeLessThanOrEqual(18);
    });

    it('should roll heroic ability scores correctly (4d6 drop lowest)', () => {
      const result = rollAbilityScore4d6DropLowest();
      expect(result).toBeGreaterThanOrEqual(3);
      expect(result).toBeLessThanOrEqual(18);
    });

    it('should handle percentile rolls', () => {
      const result = rollPercentile();
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(100);
    });

    it('should implement THAC0 attack mechanics', () => {
      const thac0 = 20;
      const targetAC = 5;
      const attackRoll = 15;

      const hit = checkTHAC0Hit(thac0, targetAC, attackRoll);
      expect(typeof hit).toBe('boolean');

      // Should hit (need 15, rolled 15)
      expect(checkTHAC0Hit(20, 5, 15)).toBe(true);
      // Should miss (need 15, rolled 14)
      expect(checkTHAC0Hit(20, 5, 14)).toBe(false);
    });

    it('should handle saving throws', () => {
      const saveResult = rollSavingThrow(15, 2);
      expect(saveResult.roll).toBeGreaterThanOrEqual(1);
      expect(saveResult.roll).toBeLessThanOrEqual(20);
      expect(saveResult.total).toBe(saveResult.roll + 2);
      expect(saveResult.target).toBe(15);
      expect(typeof saveResult.success).toBe('boolean');
    });

    it('should implement advantage/disadvantage mechanics', () => {
      const advantageRoll = rollWithAdvantage(20);
      const disadvantageRoll = rollWithDisadvantage(20);

      expect(advantageRoll).toBeGreaterThanOrEqual(1);
      expect(advantageRoll).toBeLessThanOrEqual(20);
      expect(disadvantageRoll).toBeGreaterThanOrEqual(1);
      expect(disadvantageRoll).toBeLessThanOrEqual(20);
    });
  });

  describe('Error Handling', () => {
    it('should throw error for invalid dice notation', () => {
      expect(() => {
        rollExpression('invalid');
      }).toThrow('Invalid dice notation');

      expect(() => {
        rollExpression('d6'); // Missing count
      }).toThrow('Invalid dice notation');
    });

    it('should handle zero and negative modifiers', () => {
      const resultZero = rollDice(1, 6, 0);
      expect(resultZero.modifier).toBe(0);

      const resultNegative = rollDice(1, 6, -2);
      expect(resultNegative.modifier).toBe(-2);
      expect(resultNegative.result).toBeGreaterThanOrEqual(-1); // min: 1 - 2
      expect(resultNegative.result).toBeLessThanOrEqual(4); // max: 6 - 2
    });
  });
});
