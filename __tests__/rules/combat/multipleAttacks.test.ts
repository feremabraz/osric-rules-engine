import * as attackRollModule from '@rules/combat/attackRoll';
import { getAttacksPerRound, resolveMultipleAttacks } from '@rules/combat/multipleAttacks';
import { SpecializationLevel } from '@rules/combat/specialization';
import type { Monster } from '@rules/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockFighter, mockGoblin, mockThief, mockTroll, mockWeapons } from './mockData';

describe('Multiple Attacks System', () => {
  // Mock the attackRoll function
  vi.mock('@rules/combat/attackRoll', () => ({
    attackRoll: vi.fn().mockImplementation(() => ({
      hit: true,
      damage: [5],
      critical: false,
      message: 'Hit for 5 damage',
      specialEffects: null,
    })),
  }));

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAttacksPerRound', () => {
    it('should return correct number of attacks for fighter by level', () => {
      // Create fighters at different levels
      const lowLevelFighter = { ...mockFighter, level: 5 };
      const midLevelFighter = { ...mockFighter, level: 8 };
      const highLevelFighter = { ...mockFighter, level: 13 };

      // Test against normal monsters
      expect(getAttacksPerRound(lowLevelFighter, mockWeapons.longsword)).toBe(1);
      expect(getAttacksPerRound(midLevelFighter, mockWeapons.longsword)).toBe(1.5);
      expect(getAttacksPerRound(highLevelFighter, mockWeapons.longsword)).toBe(2);
    });

    it('should return level-based attacks against less than 1 HD monsters', () => {
      // Create different level fighters
      const lowLevelFighter = { ...mockFighter, level: 3 };
      const midLevelFighter = { ...mockFighter, level: 7 };

      // Test against less than 1 HD monsters
      expect(getAttacksPerRound(lowLevelFighter, mockWeapons.longsword, true)).toBe(3);
      expect(getAttacksPerRound(midLevelFighter, mockWeapons.longsword, true)).toBe(7);
    });

    it('should apply weapon specialization bonuses correctly', () => {
      // Create specialized fighter
      const specializedFighter = {
        ...mockFighter,
        level: 6,
        weaponSpecializations: [
          { weaponName: 'Sword, Long', level: SpecializationLevel.SPECIALIZED },
        ],
      };

      const doubleSpecializedFighter = {
        ...mockFighter,
        level: 6,
        weaponSpecializations: [
          { weaponName: 'Sword, Long', level: SpecializationLevel.DOUBLE_SPECIALIZED },
        ],
      };

      // Test specialization attack bonuses
      expect(getAttacksPerRound(specializedFighter, mockWeapons.longsword)).toBe(1.5);
      expect(getAttacksPerRound(doubleSpecializedFighter, mockWeapons.longsword)).toBe(2);
    });

    it('should return 1 attack for non-fighter classes', () => {
      expect(getAttacksPerRound(mockThief, mockWeapons.dagger)).toBe(1);
    });
  });

  describe('resolveMultipleAttacks', () => {
    it('should execute correct number of attacks based on character level', () => {
      // Single attack (level 5 fighter)
      const result1 = resolveMultipleAttacks(mockFighter, mockGoblin, mockWeapons.longsword);
      expect(result1.results.length).toBe(1);
      expect(vi.mocked(attackRollModule.attackRoll)).toHaveBeenCalledTimes(1);

      vi.clearAllMocks();

      // 3/2 attacks (level at 7-12)
      const midLevelFighter = { ...mockFighter, level: 8 };
      const result2 = resolveMultipleAttacks(midLevelFighter, mockGoblin, mockWeapons.longsword);
      expect(result2.results.length).toBe(1);
      expect(result2.fractionalAttacksCarriedOver).toBe(0.5);

      // Next round should include the fractional attack
      const result3 = resolveMultipleAttacks(
        midLevelFighter,
        mockGoblin,
        mockWeapons.longsword,
        0,
        { currentRound: 2, fractionalAttacksCarriedOver: 0.5 }
      );
      expect(result3.results.length).toBe(2); // Should get 2 attacks in this round
      expect(result3.fractionalAttacksCarriedOver).toBe(0);
    });

    it('should stop attacking if target is defeated', () => {
      // Create a target with low hit points
      const weakTarget = {
        ...mockGoblin,
        hitPoints: { current: 4, maximum: 20 },
      };

      // We need to mock the attackRoll function to actually reduce the target's hit points
      // This simulates the real behavior of the combat system
      vi.mocked(attackRollModule.attackRoll).mockImplementation(
        (_attacker, target, _weapon, _modifier) => {
          // Reduce target's hit points when the attack hits
          if (target.hitPoints.current > 0) {
            target.hitPoints.current -= 5; // Damage amount
          }

          return {
            hit: true,
            damage: [5],
            critical: false,
            message: 'Hit for 5 damage',
            specialEffects: null,
          };
        }
      );

      // Set up an attacker with multiple attacks
      const multiAttacker = {
        ...mockFighter,
        level: 13,
        weaponSpecializations: [
          { weaponName: 'Sword, Long', level: SpecializationLevel.DOUBLE_SPECIALIZED },
        ],
      };

      // Should get 3 attacks normally, but should stop after the first one defeats the target
      const result = resolveMultipleAttacks(multiAttacker, weakTarget, mockWeapons.longsword);

      // Despite having 3 potential attacks, should only have made one
      expect(result.results.length).toBe(1);
      expect(vi.mocked(attackRollModule.attackRoll)).toHaveBeenCalledTimes(1);
      expect(weakTarget.hitPoints.current).toBeLessThanOrEqual(0); // Verify target was defeated
    });

    it('should handle fractional attacks correctly across rounds', () => {
      // Level 7 fighter with 3/2 attacks per round
      const fighter = { ...mockFighter, level: 7 };

      // Round 1: should make 1 attack and carry over 0.5
      const round1 = resolveMultipleAttacks(fighter, mockTroll, mockWeapons.longsword);
      expect(round1.results.length).toBe(1);
      expect(round1.fractionalAttacksCarriedOver).toBe(0.5);

      // Round 2: should make 1 attack and carry over 0.5 + 0.5 = 1, which gives an extra attack
      const round2 = resolveMultipleAttacks(fighter, mockTroll, mockWeapons.longsword, 0, {
        currentRound: 2,
        fractionalAttacksCarriedOver: 0.5,
      });
      expect(round2.results.length).toBe(2);
      expect(round2.fractionalAttacksCarriedOver).toBe(0);

      // Round 3: back to 1 attack with 0.5 carried over
      const round3 = resolveMultipleAttacks(fighter, mockTroll, mockWeapons.longsword, 0, {
        currentRound: 3,
        fractionalAttacksCarriedOver: 0,
      });
      expect(round3.results.length).toBe(1);
      expect(round3.fractionalAttacksCarriedOver).toBe(0.5);
    });

    it('should apply situational modifiers to attacks', () => {
      // Test with a situational modifier
      resolveMultipleAttacks(mockFighter, mockGoblin, mockWeapons.longsword, 2);

      // Check if the attackRoll was called with the correct modifier
      expect(attackRollModule.attackRoll).toHaveBeenCalledWith(
        mockFighter,
        mockGoblin,
        mockWeapons.longsword,
        2 // Situational modifier
      );
    });

    it('should handle Monster-specific properties correctly', () => {
      // Create a monster with less than 1 HD
      const weakMonster = {
        ...mockGoblin,
        hitDice: '0.5', // Less than 1 HD
      };

      // A level 4 fighter should get 4 attacks against this monster
      const fighter = { ...mockFighter, level: 4 };

      // First, directly test the getAttacksPerRound function
      const attacks = getAttacksPerRound(fighter, mockWeapons.longsword, true);
      expect(attacks).toBe(4); // Should be equal to fighter's level

      // Now test that resolveMultipleAttacks uses this correctly
      // Clear previous mocks
      vi.clearAllMocks();

      // Mock the attackRoll to return a hit without killing the target
      vi.mocked(attackRollModule.attackRoll).mockReturnValue({
        hit: true,
        damage: [1], // Small damage to not kill the target
        critical: false,
        message: 'Hit for 1 damage',
        specialEffects: null,
      });

      // Execute the attack routine
      const result = resolveMultipleAttacks(fighter, weakMonster, mockWeapons.longsword);

      // Should get the fighter's level number of attacks against < 1 HD monsters
      expect(result.results.length).toBe(4);
      expect(vi.mocked(attackRollModule.attackRoll)).toHaveBeenCalledTimes(4);
    });

    it('should handle character targets correctly (no hitDice property)', () => {
      // Character vs Character combat
      const result = resolveMultipleAttacks(
        mockFighter,
        mockThief as unknown as Monster,
        mockWeapons.longsword
      );

      // Should execute normal number of attacks (1 for level 5 fighter)
      expect(result.results.length).toBe(1);
      expect(vi.mocked(attackRollModule.attackRoll)).toHaveBeenCalledTimes(1);
    });
  });
});
