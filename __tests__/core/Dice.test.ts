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
      const result = rollDice(1, 6);
      expect(result).toBeDefined();
      expect(result.result).toBeGreaterThanOrEqual(1);
      expect(result.result).toBeLessThanOrEqual(6);
      expect(result.sides).toBe(6);
      expect(result.roll).toBe(1);
      expect(result.modifier).toBe(0);
    });

    it('should validate input parameters', () => {
      const result = rollDice(1, 0);
      expect(result.result).toBe(1);
      expect(result.sides).toBe(0);
    });

    it('should handle dice notation correctly', () => {
      const result = rollExpression('2d6+3');
      expect(result).toBeGreaterThanOrEqual(5);
      expect(result).toBeLessThanOrEqual(15);
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimum boundary values', () => {
      const result = roll(1);
      expect(result).toBe(1);
    });

    it('should handle maximum boundary values', () => {
      const result = roll(100);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(100);
    });

    it('should handle multiple dice correctly', () => {
      const result = rollDice(3, 6, 2);
      expect(result.result).toBeGreaterThanOrEqual(5);
      expect(result.result).toBeLessThanOrEqual(20);
      expect(result.roll).toBe(3);
      expect(result.sides).toBe(6);
      expect(result.modifier).toBe(2);
    });
  });

  describe('OSRIC Compliance', () => {
    it('should implement authentic OSRIC/AD&D 1st Edition mechanics', () => {
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

      expect(checkTHAC0Hit(20, 5, 15)).toBe(true);

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
        rollExpression('d6');
      }).toThrow('Invalid dice notation');
    });

    it('should handle zero and negative modifiers', () => {
      const resultZero = rollDice(1, 6, 0);
      expect(resultZero.modifier).toBe(0);

      const resultNegative = rollDice(1, 6, -2);
      expect(resultNegative.modifier).toBe(-2);
      expect(resultNegative.result).toBeGreaterThanOrEqual(-1);
      expect(resultNegative.result).toBeLessThanOrEqual(4);
    });
  });
});
