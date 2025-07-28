import {
  applyProficiencyModifiers,
  calculateProficiencyModifier,
  calculateSpecializationBonus,
  getNonProficiencyPenalty,
  isCharacterProficientWithWeapon,
} from '@rules/combat/proficiency';
import type { Character } from '@rules/types';
import { describe, expect, it } from 'vitest';
import { mockFighter, mockGoblin, mockThief, mockWeapons, mockWizard } from './mockData';

describe('Weapon Proficiency Mechanics', () => {
  describe('getNonProficiencyPenalty', () => {
    it('should return the correct penalty for each class', () => {
      expect(getNonProficiencyPenalty('Fighter')).toBe(-2);
      expect(getNonProficiencyPenalty('Paladin')).toBe(-2);
      expect(getNonProficiencyPenalty('Ranger')).toBe(-2);
      expect(getNonProficiencyPenalty('Magic-User')).toBe(-5);
      expect(getNonProficiencyPenalty('Illusionist')).toBe(-5);
      expect(getNonProficiencyPenalty('Cleric')).toBe(-3);
      expect(getNonProficiencyPenalty('Druid')).toBe(-3);
      expect(getNonProficiencyPenalty('Thief')).toBe(-3);
      expect(getNonProficiencyPenalty('Assassin')).toBe(-3);
    });

    it('should return default penalty of -3 for unknown class', () => {
      expect(getNonProficiencyPenalty('Unknown')).toBe(-3);
    });
  });

  describe('isCharacterProficientWithWeapon', () => {
    it('should return true if the character has the weapon proficiency', () => {
      // Fighter is proficient with longsword
      expect(isCharacterProficientWithWeapon(mockFighter, mockWeapons.longsword)).toBe(true);

      // Thief is proficient with short bow
      expect(isCharacterProficientWithWeapon(mockThief, mockWeapons.shortbow)).toBe(true);
    });

    it('should return false if the character does not have the weapon proficiency', () => {
      // Fighter is not proficient with short bow
      expect(isCharacterProficientWithWeapon(mockFighter, mockWeapons.shortbow)).toBe(false);
    });

    it('should return false if character has no proficiencies', () => {
      const noProficiencyChar: Character = {
        ...mockFighter,
        proficiencies: [],
      };

      expect(isCharacterProficientWithWeapon(noProficiencyChar, mockWeapons.longsword)).toBe(false);
    });
  });

  describe('calculateProficiencyModifier', () => {
    it('should return 0 for monsters (always proficient)', () => {
      expect(calculateProficiencyModifier(mockGoblin)).toBe(0);
    });

    it('should return 0 when no weapon is specified', () => {
      expect(calculateProficiencyModifier(mockFighter)).toBe(0);
    });

    it('should return 0 for proficient weapons', () => {
      expect(calculateProficiencyModifier(mockFighter, mockWeapons.longsword)).toBe(0);
    });

    it('should return class penalty for non-proficient weapons', () => {
      const result = calculateProficiencyModifier(mockFighter, mockWeapons.shortbow);

      expect(result).toBe(-2); // Fighter penalty
    });

    it('should use the most favorable penalty for multi-class characters', () => {
      // Create a Fighter/Thief multi-class character
      const multiClassChar: Character = {
        ...mockFighter,
        class: 'Fighter',
        classes: {
          Fighter: 3,
          Thief: 3,
        },
        proficiencies: [],
      };

      // Not proficient with longsword, should get -2 (Fighter) instead of -3 (Thief)
      const result = calculateProficiencyModifier(multiClassChar, mockWeapons.longsword);

      expect(result).toBe(-2);
    });
  });

  describe('calculateSpecializationBonus', () => {
    it('should return 0 for non-Fighter classes', () => {
      expect(calculateSpecializationBonus(mockThief, mockWeapons.dagger)).toBe(0);
      expect(calculateSpecializationBonus(mockWizard, mockWeapons.dagger)).toBe(0);
    });

    it('should return 0 when no weapon is specified', () => {
      expect(calculateSpecializationBonus(mockFighter)).toBe(0);
    });

    it('should return 0 for weapons not specialized in', () => {
      // Current implementation always returns 0 as specialization data is not implemented
      expect(calculateSpecializationBonus(mockFighter, mockWeapons.longsword)).toBe(0);
    });
  });

  describe('applyProficiencyModifiers', () => {
    it('should combine proficiency and specialization modifiers for characters', () => {
      // Fighter is proficient with longsword
      expect(applyProficiencyModifiers(mockFighter, mockWeapons.longsword)).toBe(0);

      // Fighter is not proficient with shortbow
      expect(applyProficiencyModifiers(mockFighter, mockWeapons.shortbow)).toBe(-2);
    });

    it('should return 0 for monsters', () => {
      expect(applyProficiencyModifiers(mockGoblin)).toBe(0);
    });

    it('should handle case with no weapon specified', () => {
      expect(applyProficiencyModifiers(mockFighter)).toBe(0);
    });
  });
});
