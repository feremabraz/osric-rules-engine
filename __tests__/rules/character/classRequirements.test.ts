import {
  CLASS_MINIMUM_SCORES,
  RACIAL_CLASS_OPTIONS,
  RACIAL_LEVEL_LIMITS,
  canRaceBeClass,
  getMaxLevelForRaceClass,
  meetsClassRequirements,
} from '@rules/character/classRequirements';
import type { AbilityScores, CharacterClass, CharacterRace } from '@rules/types';
import { describe, expect, it } from 'vitest';

describe('Class Requirements', () => {
  describe('meetsClassRequirements', () => {
    it('should return true when character meets all class requirements', () => {
      const scores: AbilityScores = {
        strength: 12,
        dexterity: 12,
        constitution: 10,
        intelligence: 10,
        wisdom: 15,
        charisma: 18,
      };

      expect(meetsClassRequirements(scores, 'Fighter')).toBe(true);
      expect(meetsClassRequirements(scores, 'Cleric')).toBe(true);
      expect(meetsClassRequirements(scores, 'Paladin')).toBe(true);
    });

    it('should return false when character fails to meet any class requirement', () => {
      const scores: AbilityScores = {
        strength: 12,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 12,
        charisma: 16, // Just below paladin minimum
      };

      expect(meetsClassRequirements(scores, 'Paladin')).toBe(false);
    });

    it('should check each stat against class requirements', () => {
      // Test each class with scores just below minimum
      for (const [characterClass, requirements] of Object.entries(CLASS_MINIMUM_SCORES)) {
        // Create scores that just meet requirements
        const validScores = {
          strength: 3,
          dexterity: 3,
          constitution: 3,
          intelligence: 3,
          wisdom: 3,
          charisma: 3,
        };

        for (const [ability, minScore] of Object.entries(requirements)) {
          validScores[ability as keyof AbilityScores] = minScore;
        }

        expect(meetsClassRequirements(validScores, characterClass as CharacterClass)).toBe(true);

        // Now test with each requirement reduced by 1
        for (const [ability, minScore] of Object.entries(requirements)) {
          const invalidScores = { ...validScores };
          invalidScores[ability as keyof AbilityScores] = minScore - 1;

          expect(meetsClassRequirements(invalidScores, characterClass as CharacterClass)).toBe(
            false
          );
        }
      }
    });
  });

  describe('canRaceBeClass', () => {
    it('should return true for valid race/class combinations', () => {
      // Test some specific combinations
      expect(canRaceBeClass('Human', 'Fighter')).toBe(true);
      expect(canRaceBeClass('Human', 'Paladin')).toBe(true);
      expect(canRaceBeClass('Elf', 'Magic-User')).toBe(true);
      expect(canRaceBeClass('Dwarf', 'Fighter')).toBe(true);
      expect(canRaceBeClass('Halfling', 'Thief')).toBe(true);
    });

    it('should return false for invalid race/class combinations', () => {
      expect(canRaceBeClass('Dwarf', 'Magic-User')).toBe(false);
      expect(canRaceBeClass('Halfling', 'Paladin')).toBe(false);
      expect(canRaceBeClass('Gnome', 'Druid')).toBe(false);
    });

    it('should match the RACIAL_CLASS_OPTIONS table for all races', () => {
      for (const [race, allowedClasses] of Object.entries(RACIAL_CLASS_OPTIONS)) {
        // All allowed classes should return true
        for (const characterClass of allowedClasses) {
          expect(canRaceBeClass(race as CharacterRace, characterClass)).toBe(true);
        }

        // All non-allowed classes should return false
        const allClasses = [
          'Fighter',
          'Paladin',
          'Ranger',
          'Magic-User',
          'Illusionist',
          'Cleric',
          'Druid',
          'Thief',
          'Assassin',
        ];

        const disallowedClasses = allClasses.filter(
          (characterClass) => !allowedClasses.includes(characterClass as CharacterClass)
        );

        for (const characterClass of disallowedClasses) {
          expect(canRaceBeClass(race as CharacterRace, characterClass as CharacterClass)).toBe(
            false
          );
        }
      }
    });
  });

  describe('getMaxLevelForRaceClass', () => {
    it('should return -1 for unlimited advancement', () => {
      expect(getMaxLevelForRaceClass('Human', 'Fighter')).toBe(-1);
      expect(getMaxLevelForRaceClass('Human', 'Magic-User')).toBe(-1);
    });

    it('should return specific level limits for various race/class combinations', () => {
      expect(getMaxLevelForRaceClass('Elf', 'Fighter')).toBe(7);
      expect(getMaxLevelForRaceClass('Dwarf', 'Fighter')).toBe(9);
      expect(getMaxLevelForRaceClass('Halfling', 'Fighter')).toBe(4);
      expect(getMaxLevelForRaceClass('Half-Elf', 'Magic-User')).toBe(8);
    });

    it('should return 0 for invalid race/class combinations', () => {
      expect(getMaxLevelForRaceClass('Dwarf', 'Magic-User')).toBe(0);
      expect(getMaxLevelForRaceClass('Halfling', 'Paladin')).toBe(0);
    });

    it('should match the RACIAL_LEVEL_LIMITS table for all entries', () => {
      for (const [race, classLimits] of Object.entries(RACIAL_LEVEL_LIMITS)) {
        for (const [characterClass, maxLevel] of Object.entries(classLimits)) {
          expect(
            getMaxLevelForRaceClass(race as CharacterRace, characterClass as CharacterClass)
          ).toBe(maxLevel);
        }
      }
    });
  });
});
