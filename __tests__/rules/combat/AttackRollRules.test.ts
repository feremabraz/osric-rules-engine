import { beforeEach, describe, expect, test, vi } from 'vitest';

const mockRoll = vi.fn();

function calculateTargetNumber(thac0: number, armorClass: number): number {
  return thac0 - armorClass;
}

function rollD20(): number {
  return mockRoll();
}

function rollDamage(diceExpression: string): number {
  const match = diceExpression.match(/(\d+)d(\d+)(?:\+(\d+))?/);
  if (!match) return 1;

  const [, numDice, , bonus] = match;
  const num = Number.parseInt(numDice, 10);
  const bonusValue = bonus ? Number.parseInt(bonus, 10) : 0;

  let total = 0;
  for (let i = 0; i < num; i++) {
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

  return Math.max(1, totalDamage);
}

describe('OSRIC Attack Rules Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('THAC0 Calculation', () => {
    test('should calculate correct target number using THAC0 formula', () => {
      expect(calculateTargetNumber(20, 10)).toBe(10);
      expect(calculateTargetNumber(18, 5)).toBe(13);
      expect(calculateTargetNumber(15, 0)).toBe(15);
      expect(calculateTargetNumber(18, -2)).toBe(20);
    });

    test('should preserve exact OSRIC THAC0 values', () => {
      expect(calculateTargetNumber(20, 10)).toBe(10);
      expect(calculateTargetNumber(19, 10)).toBe(9);
      expect(calculateTargetNumber(18, 10)).toBe(8);
      expect(calculateTargetNumber(17, 10)).toBe(7);
    });
  });

  describe('Attack Roll Resolution', () => {
    const fighter = { thac0: 18, strengthHitAdj: 1 };
    const orc = { armorClass: 6 };
    const sword = { damage: '1d8', magicBonus: null };

    test('should hit when roll meets target number', () => {
      mockRoll.mockReturnValue(12);

      const result = calculateAttackRoll(fighter, orc);

      expect(result.hit).toBe(true);
      expect(result.targetNumber).toBe(12);
      expect(result.naturalRoll).toBe(12);
    });

    test('should miss when roll is below target number', () => {
      mockRoll.mockReturnValue(8);

      const result = calculateAttackRoll(fighter, orc);

      expect(result.hit).toBe(false);
      expect(result.naturalRoll).toBe(8);
    });

    test('should always hit on natural 20', () => {
      mockRoll.mockReturnValue(20);

      const result = calculateAttackRoll(fighter, { armorClass: -10 });

      expect(result.hit).toBe(true);
      expect(result.critical).toBe(true);
    });

    test('should always miss on natural 1', () => {
      mockRoll.mockReturnValue(1);

      const result = calculateAttackRoll(fighter, { armorClass: 20 });

      expect(result.hit).toBe(false);
      expect(result.naturalRoll).toBe(1);
    });

    test('should apply strength bonus to attack roll', () => {
      mockRoll.mockReturnValue(11);

      const strongFighter = { thac0: 18, strengthHitAdj: 2 };
      const result = calculateAttackRoll(strongFighter, orc);

      expect(result.hit).toBe(true);
    });

    test('should apply weapon magic bonus', () => {
      mockRoll.mockReturnValue(9);

      const magicSword = { damage: '1d8', magicBonus: 2 };
      const result = calculateAttackRoll(fighter, orc, magicSword);

      expect(result.hit).toBe(true);
    });

    test('should apply situational modifiers', () => {
      mockRoll.mockReturnValue(10);

      const result = calculateAttackRoll(fighter, orc, sword, 2);

      expect(result.hit).toBe(true);
    });
  });

  describe('Damage Calculation', () => {
    const fighter = { strengthDamageAdj: 1 };
    const sword = { damage: '1d8', magicBonus: null };

    test('should calculate base weapon damage', () => {
      mockRoll.mockReturnValue(5);

      const damage = calculateDamage(sword, fighter, false);

      expect(damage).toBe(6);
    });

    test('should apply strength damage bonus', () => {
      mockRoll.mockReturnValue(7);

      const strongFighter = { strengthDamageAdj: 3 };
      const damage = calculateDamage(sword, strongFighter, false);

      expect(damage).toBe(10);
    });

    test('should apply weapon magic bonus to damage', () => {
      mockRoll.mockReturnValue(6);

      const magicSword = { damage: '1d8', magicBonus: 2 };
      const damage = calculateDamage(magicSword, fighter, false);

      expect(damage).toBe(9);
    });

    test('should double damage on critical hit', () => {
      mockRoll.mockReturnValue(7);

      const damage = calculateDamage(sword, fighter, true);

      expect(damage).toBe(16);
    });

    test('should ensure minimum 1 damage', () => {
      mockRoll.mockReturnValue(1);

      const weakFighter = { strengthDamageAdj: -2 };
      const damage = calculateDamage(sword, weakFighter, false);

      expect(damage).toBe(1);
    });
  });

  describe('Integration Scenarios', () => {
    test('complete OSRIC attack sequence', () => {
      const fighter = { thac0: 18, strengthHitAdj: 1, strengthDamageAdj: 1 };
      const orc = { armorClass: 6 };
      const longsword = { damage: '1d8', magicBonus: null };

      mockRoll.mockReturnValueOnce(12).mockReturnValueOnce(6);

      const attackResult = calculateAttackRoll(fighter, orc, longsword);

      expect(attackResult.hit).toBe(true);
      expect(attackResult.targetNumber).toBe(12);

      if (attackResult.hit) {
        const damage = calculateDamage(longsword, fighter, attackResult.critical);
        expect(damage).toBe(7);
      }
    });

    test('magical weapon vs heavily armored target', () => {
      const paladin = { thac0: 16, strengthHitAdj: 2, strengthDamageAdj: 2 };
      const knight = { armorClass: 1 };
      const holyAvenger = { damage: '1d8', magicBonus: 3 };

      mockRoll.mockReturnValueOnce(13).mockReturnValueOnce(7);

      const attackResult = calculateAttackRoll(paladin, knight, holyAvenger);

      expect(attackResult.hit).toBe(true);
      expect(attackResult.targetNumber).toBe(15);

      if (attackResult.hit) {
        const damage = calculateDamage(holyAvenger, paladin, attackResult.critical);
        expect(damage).toBe(12);
      }
    });
  });
});
