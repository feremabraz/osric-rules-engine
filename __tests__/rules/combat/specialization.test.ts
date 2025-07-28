import {
  SpecializationLevel,
  calculateAttacksPerRound,
  canSpecializeIn,
  getSpecializationDamageBonus,
  getSpecializationHitBonus,
  isSpecializedWith,
} from '@rules/combat/specialization';
import type { Character, Weapon } from '@rules/types';
import { beforeEach, describe, expect, it } from 'vitest';
import { mockFighter, mockThief, mockWeapons } from './mockData';

describe('Weapon Specialization System', () => {
  // Create a specialized fighter for tests
  let specializedFighter: Character;
  let doubleSpecializedFighter: Character;
  let lowLevelFighter: Character;
  let midLevelFighter: Character;
  let highLevelFighter: Character;

  beforeEach(() => {
    // Clone the mock fighter to avoid test contamination
    specializedFighter = JSON.parse(JSON.stringify(mockFighter));
    doubleSpecializedFighter = JSON.parse(JSON.stringify(mockFighter));

    // Create different level fighters for testing
    lowLevelFighter = JSON.parse(JSON.stringify(mockFighter));
    lowLevelFighter.level = 5;

    midLevelFighter = JSON.parse(JSON.stringify(mockFighter));
    midLevelFighter.level = 9;

    highLevelFighter = JSON.parse(JSON.stringify(mockFighter));
    highLevelFighter.level = 14;

    // Add specializations
    specializedFighter.weaponSpecializations = [
      { weaponName: 'Sword, Long', level: SpecializationLevel.SPECIALIZED },
    ];

    doubleSpecializedFighter.weaponSpecializations = [
      { weaponName: 'Sword, Long', level: SpecializationLevel.DOUBLE_SPECIALIZED },
    ];
  });

  describe('isSpecializedWith', () => {
    it('should correctly identify weapon specialization level', () => {
      // Check specialization status
      expect(isSpecializedWith(specializedFighter, 'Sword, Long')).toBe(
        SpecializationLevel.SPECIALIZED
      );
      expect(isSpecializedWith(doubleSpecializedFighter, 'Sword, Long')).toBe(
        SpecializationLevel.DOUBLE_SPECIALIZED
      );
      expect(isSpecializedWith(mockFighter, 'Sword, Long')).toBe(SpecializationLevel.NONE);
    });

    it('should return NONE if character has no specializations', () => {
      expect(isSpecializedWith(mockThief, 'Dagger')).toBe(SpecializationLevel.NONE);
    });

    it('should be case-insensitive when matching weapon names', () => {
      expect(isSpecializedWith(specializedFighter, 'sword, long')).toBe(
        SpecializationLevel.SPECIALIZED
      );
      expect(isSpecializedWith(specializedFighter, 'SWORD, LONG')).toBe(
        SpecializationLevel.SPECIALIZED
      );
    });
  });

  describe('getSpecializationHitBonus', () => {
    it('should return correct to-hit bonus based on specialization level', () => {
      const longsword = mockWeapons.longsword;

      // Check to-hit bonuses
      expect(getSpecializationHitBonus(mockFighter, longsword)).toBe(0); // No specialization
      expect(getSpecializationHitBonus(specializedFighter, longsword)).toBe(1); // Specialized
      expect(getSpecializationHitBonus(doubleSpecializedFighter, longsword)).toBe(3); // Double specialized
    });
  });

  describe('getSpecializationDamageBonus', () => {
    it('should return correct damage bonus for melee weapons', () => {
      const longsword = mockWeapons.longsword;

      // Check damage bonuses for melee
      expect(getSpecializationDamageBonus(mockFighter, longsword)).toBe(0); // No specialization
      expect(getSpecializationDamageBonus(specializedFighter, longsword)).toBe(2); // Specialized
      expect(getSpecializationDamageBonus(doubleSpecializedFighter, longsword)).toBe(3); // Double specialized
    });

    it('should return correct damage bonus for ranged weapons', () => {
      const shortbow = mockWeapons.shortbow;

      // Add ranged specialization
      const rangedSpecialist = JSON.parse(JSON.stringify(mockFighter));
      rangedSpecialist.weaponSpecializations = [
        { weaponName: 'Bow, Short', level: SpecializationLevel.SPECIALIZED },
      ];

      // Check damage bonuses for ranged
      expect(getSpecializationDamageBonus(mockFighter, shortbow)).toBe(0); // No specialization
      expect(getSpecializationDamageBonus(rangedSpecialist, shortbow)).toBe(1); // Specialized (less for ranged)
    });
  });

  describe('calculateAttacksPerRound', () => {
    it('should return 1 attack for non-fighter classes', () => {
      expect(calculateAttacksPerRound(mockThief, mockWeapons.dagger)).toBe(1);
    });

    it('should use character level for attacks against less than 1 HD monsters', () => {
      expect(calculateAttacksPerRound(lowLevelFighter, mockWeapons.longsword, true)).toBe(5);
      expect(calculateAttacksPerRound(midLevelFighter, mockWeapons.longsword, true)).toBe(9);
    });

    it('should correctly calculate attacks per round for different level tiers', () => {
      // Unspecialized fighters
      expect(calculateAttacksPerRound(lowLevelFighter, mockWeapons.longsword)).toBe(1); // Level 5
      expect(calculateAttacksPerRound(midLevelFighter, mockWeapons.longsword)).toBe(1.5); // Level 9
      expect(calculateAttacksPerRound(highLevelFighter, mockWeapons.longsword)).toBe(2); // Level 14
    });

    it('should correctly apply specialization attack bonuses', () => {
      // Specialized fighters
      lowLevelFighter.weaponSpecializations = [
        { weaponName: 'Sword, Long', level: SpecializationLevel.SPECIALIZED },
      ];
      midLevelFighter.weaponSpecializations = [
        { weaponName: 'Sword, Long', level: SpecializationLevel.SPECIALIZED },
      ];
      highLevelFighter.weaponSpecializations = [
        { weaponName: 'Sword, Long', level: SpecializationLevel.SPECIALIZED },
      ];

      expect(calculateAttacksPerRound(lowLevelFighter, mockWeapons.longsword)).toBe(1.5); // Level 5, specialized
      expect(calculateAttacksPerRound(midLevelFighter, mockWeapons.longsword)).toBe(2); // Level 9, specialized
      expect(calculateAttacksPerRound(highLevelFighter, mockWeapons.longsword)).toBe(2.5); // Level 14, specialized
    });

    it('should correctly apply double specialization attack bonuses', () => {
      // Double specialized fighters
      lowLevelFighter.weaponSpecializations = [
        { weaponName: 'Sword, Long', level: SpecializationLevel.DOUBLE_SPECIALIZED },
      ];
      midLevelFighter.weaponSpecializations = [
        { weaponName: 'Sword, Long', level: SpecializationLevel.DOUBLE_SPECIALIZED },
      ];
      highLevelFighter.weaponSpecializations = [
        { weaponName: 'Sword, Long', level: SpecializationLevel.DOUBLE_SPECIALIZED },
      ];

      expect(calculateAttacksPerRound(lowLevelFighter, mockWeapons.longsword)).toBe(2); // Level 5, double specialized
      expect(calculateAttacksPerRound(midLevelFighter, mockWeapons.longsword)).toBe(2.5); // Level 9, double specialized
      expect(calculateAttacksPerRound(highLevelFighter, mockWeapons.longsword)).toBe(3); // Level 14, double specialized
    });
  });

  describe('canSpecializeIn', () => {
    it('should only allow fighter classes to specialize', () => {
      // Add proficiency to both characters
      mockFighter.proficiencies = [{ weapon: 'Sword, Long', penalty: 0 }];
      mockThief.proficiencies = [{ weapon: 'Dagger', penalty: 0 }];

      expect(canSpecializeIn(mockFighter, mockWeapons.longsword)).toBe(true);
      expect(canSpecializeIn(mockThief, mockWeapons.dagger)).toBe(false);
    });

    it('should only allow specialization in proficient weapons', () => {
      // Fighter with different proficiencies
      const proficientFighter = JSON.parse(JSON.stringify(mockFighter));
      proficientFighter.proficiencies = [{ weapon: 'Sword, Long', penalty: 0 }];

      expect(canSpecializeIn(proficientFighter, mockWeapons.longsword)).toBe(true);
      expect(canSpecializeIn(proficientFighter, mockWeapons.dagger)).toBe(false);
    });
  });
});
