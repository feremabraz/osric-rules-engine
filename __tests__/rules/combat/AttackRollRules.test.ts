/**
 * AttackRollRules.test.ts - Tests for OSRIC Attack Roll Rules
 *
 * Tests the THAC0-based attack calculation logic and damage mechanics
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';

// Mock dice rolling for predictable tests
const mockRoll = vi.fn();

// Simple THAC0 calculation function from our rules
function calculateTargetNumber(thac0: number, armorClass: number): number {
  return thac0 - armorClass;
}

function rollD20(): number {
  return mockRoll();
}

function rollDamage(diceExpression: string): number {
  // Simple damage calculation - extract dice info and roll
  const match = diceExpression.match(/(\d+)d(\d+)(?:\+(\d+))?/);
  if (!match) return 1;

  const [, numDice, , bonus] = match;
  const num = Number.parseInt(numDice, 10);
  const bonusValue = bonus ? Number.parseInt(bonus, 10) : 0;

  let total = 0;
  for (let i = 0; i < num; i++) {
    // Use mockRoll directly for controlled tests - it returns the exact value we set
    total += mockRoll();
  }
  return total + bonusValue;
}

function calculateAttackRoll(
  attacker: { thac0: number; strengthHitAdj: number },
  target: { armorClass: number },
  weapon?: { magicBonus?: number | null },
  situationalModifiers = 0
): { hit: boolean; critical: boolean; naturalRoll: number; targetNumber: number } {
  const naturalRoll = rollD20();
  const strengthBonus = attacker.strengthHitAdj || 0;
  const magicBonus = weapon?.magicBonus || 0;
  const targetNumber = calculateTargetNumber(attacker.thac0, target.armorClass);

  const totalAttackRoll = naturalRoll + strengthBonus + magicBonus + situationalModifiers;

  return {
    hit: naturalRoll === 20 || (naturalRoll > 1 && totalAttackRoll >= targetNumber),
    critical: naturalRoll === 20,
    naturalRoll,
    targetNumber,
  };
}

function calculateDamage(
  weapon: { damage: string; magicBonus?: number | null },
  attacker: { strengthDamageAdj: number },
  isCritical: boolean
): number {
  const baseDamage = rollDamage(weapon.damage);
  const strengthBonus = attacker.strengthDamageAdj || 0;
  const magicBonus = weapon.magicBonus || 0;

  let totalDamage = baseDamage + strengthBonus + magicBonus;

  if (isCritical) {
    totalDamage *= 2;
  }

  return Math.max(1, totalDamage); // Minimum 1 damage
}

describe('OSRIC Attack Rules Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('THAC0 Calculation', () => {
    test('should calculate correct target number using THAC0 formula', () => {
      // THAC0 - AC = target number
      expect(calculateTargetNumber(20, 10)).toBe(10); // Novice vs unarmored
      expect(calculateTargetNumber(18, 5)).toBe(13); // Fighter vs chain mail
      expect(calculateTargetNumber(15, 0)).toBe(15); // High level vs plate mail
      expect(calculateTargetNumber(18, -2)).toBe(20); // Fighter vs magical armor
    });

    test('should preserve exact OSRIC THAC0 values', () => {
      // These are the exact OSRIC progression values
      expect(calculateTargetNumber(20, 10)).toBe(10); // 1st level fighter
      expect(calculateTargetNumber(19, 10)).toBe(9); // 2nd level fighter
      expect(calculateTargetNumber(18, 10)).toBe(8); // 3rd level fighter
      expect(calculateTargetNumber(17, 10)).toBe(7); // 4th level fighter
    });
  });

  describe('Attack Roll Resolution', () => {
    const fighter = { thac0: 18, strengthHitAdj: 1 };
    const orc = { armorClass: 6 };
    const sword = { damage: '1d8', magicBonus: null };

    test('should hit when roll meets target number', () => {
      mockRoll.mockReturnValue(12); // Roll 12

      const result = calculateAttackRoll(fighter, orc);

      // THAC0 18 - AC 6 = need 12, rolled 12 + 1 strength = 13, should hit
      expect(result.hit).toBe(true);
      expect(result.targetNumber).toBe(12);
      expect(result.naturalRoll).toBe(12);
    });

    test('should miss when roll is below target number', () => {
      mockRoll.mockReturnValue(8); // Roll 8

      const result = calculateAttackRoll(fighter, orc);

      // Rolled 8 + 1 strength = 9, need 12, should miss
      expect(result.hit).toBe(false);
      expect(result.naturalRoll).toBe(8);
    });

    test('should always hit on natural 20', () => {
      mockRoll.mockReturnValue(20);

      const result = calculateAttackRoll(fighter, { armorClass: -10 }); // Impossible AC

      expect(result.hit).toBe(true);
      expect(result.critical).toBe(true);
    });

    test('should always miss on natural 1', () => {
      mockRoll.mockReturnValue(1);

      const result = calculateAttackRoll(fighter, { armorClass: 20 }); // Easy target

      expect(result.hit).toBe(false);
      expect(result.naturalRoll).toBe(1);
    });

    test('should apply strength bonus to attack roll', () => {
      mockRoll.mockReturnValue(11); // Roll 11

      const strongFighter = { thac0: 18, strengthHitAdj: 2 };
      const result = calculateAttackRoll(strongFighter, orc);

      // Rolled 11 + 2 strength = 13, need 12, should hit
      expect(result.hit).toBe(true);
    });

    test('should apply weapon magic bonus', () => {
      mockRoll.mockReturnValue(9); // Roll 9

      const magicSword = { damage: '1d8', magicBonus: 2 };
      const result = calculateAttackRoll(fighter, orc, magicSword);

      // Rolled 9 + 1 strength + 2 magic = 12, need 12, should hit
      expect(result.hit).toBe(true);
    });

    test('should apply situational modifiers', () => {
      mockRoll.mockReturnValue(10); // Roll 10

      const result = calculateAttackRoll(fighter, orc, sword, 2); // +2 situational

      // Rolled 10 + 1 strength + 2 situational = 13, need 12, should hit
      expect(result.hit).toBe(true);
    });
  });

  describe('Damage Calculation', () => {
    const fighter = { strengthDamageAdj: 1 };
    const sword = { damage: '1d8', magicBonus: null };

    test('should calculate base weapon damage', () => {
      mockRoll.mockReturnValue(5); // Roll 5 on d8

      const damage = calculateDamage(sword, fighter, false);

      // 5 (roll) + 1 (strength) = 6
      expect(damage).toBe(6);
    });

    test('should apply strength damage bonus', () => {
      mockRoll.mockReturnValue(7);

      const strongFighter = { strengthDamageAdj: 3 };
      const damage = calculateDamage(sword, strongFighter, false);

      // 7 (roll) + 3 (strength) = 10
      expect(damage).toBe(10);
    });

    test('should apply weapon magic bonus to damage', () => {
      mockRoll.mockReturnValue(6);

      const magicSword = { damage: '1d8', magicBonus: 2 };
      const damage = calculateDamage(magicSword, fighter, false);

      // 6 (roll) + 1 (strength) + 2 (magic) = 9
      expect(damage).toBe(9);
    });

    test('should double damage on critical hit', () => {
      mockRoll.mockReturnValue(7);

      const damage = calculateDamage(sword, fighter, true);

      // (7 + 1) * 2 = 16
      expect(damage).toBe(16);
    });

    test('should ensure minimum 1 damage', () => {
      mockRoll.mockReturnValue(1);

      const weakFighter = { strengthDamageAdj: -2 };
      const damage = calculateDamage(sword, weakFighter, false);

      // 1 (roll) - 2 (penalty) = -1, but minimum is 1
      expect(damage).toBe(1);
    });
  });

  describe('Integration Scenarios', () => {
    test('complete OSRIC attack sequence', () => {
      // 3rd level fighter (THAC0 18, Str 16) attacks orc (AC 6) with longsword
      const fighter = { thac0: 18, strengthHitAdj: 1, strengthDamageAdj: 1 };
      const orc = { armorClass: 6 };
      const longsword = { damage: '1d8', magicBonus: null };

      // Sequence of rolls: attack roll = 12, damage roll = 6
      mockRoll.mockReturnValueOnce(12).mockReturnValueOnce(6);

      const attackResult = calculateAttackRoll(fighter, orc, longsword);

      expect(attackResult.hit).toBe(true);
      expect(attackResult.targetNumber).toBe(12); // 18 - 6 = 12

      if (attackResult.hit) {
        const damage = calculateDamage(longsword, fighter, attackResult.critical);
        expect(damage).toBe(7); // 6 (d8) + 1 (str) = 7
      }
    });

    test('magical weapon vs heavily armored target', () => {
      const paladin = { thac0: 16, strengthHitAdj: 2, strengthDamageAdj: 2 };
      const knight = { armorClass: 1 }; // Plate mail + shield
      const holyAvenger = { damage: '1d8', magicBonus: 3 };

      mockRoll.mockReturnValueOnce(13).mockReturnValueOnce(7);

      const attackResult = calculateAttackRoll(paladin, knight, holyAvenger);

      // Need 15 (16 - 1), rolled 13 + 2 str + 3 magic = 18, hits
      expect(attackResult.hit).toBe(true);
      expect(attackResult.targetNumber).toBe(15);

      if (attackResult.hit) {
        const damage = calculateDamage(holyAvenger, paladin, attackResult.critical);
        expect(damage).toBe(12); // 7 + 2 + 3 = 12
      }
    });
  });
});
