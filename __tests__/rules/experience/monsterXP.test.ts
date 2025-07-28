import {
  calculateGroupXP,
  calculateMonsterXP,
  calculateXPRewardFactors,
} from '@rules/experience/monsterXP';
import type { Alignment, Monster, MovementType } from '@rules/types';
import { describe, expect, it } from 'vitest';

describe('Monster XP Calculations', () => {
  // Sample monster for testing
  const testMonster: Monster = {
    id: 'test-monster',
    name: 'Test Monster',
    level: 3,
    hitPoints: {
      current: 20,
      maximum: 20,
    },
    armorClass: 6,
    thac0: 17,
    experience: { current: 0, requiredForNextLevel: 4000, level: 3 },
    alignment: 'True Neutral' as Alignment,
    inventory: [],
    position: 'guarding',
    statusEffects: [],
    hitDice: '3+1',
    damagePerAttack: ['1d8'],
    morale: 8,
    treasure: 'C',
    specialAbilities: ['attack'],
    xpValue: 0,
    size: 'Medium',
    movementTypes: [{ type: 'Walk', rate: 30 }],
    habitat: ['dungeon'],
    frequency: 'Common',
    organization: 'solitary',
    diet: 'carnivore',
    ecology: 'predator',
  };

  describe('getHitDiceKey function (internal)', () => {
    // Testing through the calculateXPRewardFactors function which uses getHitDiceKey
    it('should handle string hit dice formats', () => {
      const factors = calculateXPRewardFactors(testMonster, 1);
      // We can't directly test getHitDiceKey as it's not exported, but we can check the result
      expect(factors.baseXP).toBeGreaterThan(0);
    });
  });

  describe('calculateXPRewardFactors', () => {
    it('should calculate correct XP reward factors for a monster', () => {
      const factors = calculateXPRewardFactors(testMonster, 1);
      expect(factors).toHaveProperty('baseXP');
      expect(factors).toHaveProperty('specialAbilityBonus');
      expect(factors).toHaveProperty('exceptionalChallengeBonus');
      expect(factors).toHaveProperty('levelDifferenceModifier');
      expect(factors.baseXP).toBeGreaterThan(0);
      expect(factors.specialAbilityBonus).toBeGreaterThan(0); // Should have special attack bonus
    });

    it('should apply level difference modifier correctly', () => {
      // Low level character vs monster
      const lowLevelFactors = calculateXPRewardFactors(testMonster, 1);
      // Higher level character vs same monster
      const highLevelFactors = calculateXPRewardFactors(testMonster, 10);
      // Level difference modifier should be higher for lower level character
      expect(lowLevelFactors.levelDifferenceModifier).toBeGreaterThan(
        highLevelFactors.levelDifferenceModifier
      );
    });
  });

  describe('calculateMonsterXP', () => {
    it('should calculate correct total XP for a monster', () => {
      const xp = calculateMonsterXP(testMonster, 1);
      expect(xp).toBeGreaterThan(0);
      expect(typeof xp).toBe('number');
      expect(Number.isInteger(xp)).toBe(true);
    });
  });

  describe('calculateGroupXP', () => {
    it('should calculate correct total XP for a group of monsters', () => {
      const monsters = [testMonster, testMonster, testMonster]; // 3 identical monsters
      const groupXP = calculateGroupXP(monsters, 1);
      const singleXP = calculateMonsterXP(testMonster, 1);
      expect(groupXP).toBe(singleXP * 3);
    });

    it('should return 0 for an empty group', () => {
      const emptyGroupXP = calculateGroupXP([], 1);
      expect(emptyGroupXP).toBe(0);
    });
  });
});
