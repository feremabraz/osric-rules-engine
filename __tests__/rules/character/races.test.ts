import {
  getBaseMovementRate,
  getInfravisionDistance,
  getMaxAdditionalLanguages,
  getMultiClassOptions,
  getPermittedClassOptions,
  getRaceLevelLimits,
  getRacialAbilities,
  getRacialLanguages,
} from '@rules/character/races';
import type { CharacterClass, CharacterRace } from '@rules/types';
import { describe, expect, it } from 'vitest';

describe('Character Races', () => {
  describe('getRacialLanguages', () => {
    it('should return Common for Humans', () => {
      const languages = getRacialLanguages('Human');
      expect(languages).toEqual(['Common']);
    });

    it('should include multiple languages for Dwarves', () => {
      const languages = getRacialLanguages('Dwarf');
      expect(languages).toContain('Common');
      expect(languages).toContain('Dwarfish');
      expect(languages.length).toBeGreaterThan(1);
    });

    it('should return a default language if race is unknown', () => {
      const languages = getRacialLanguages('Unknown' as CharacterRace);
      expect(languages).toEqual(['Common']);
    });
  });

  describe('getMaxAdditionalLanguages', () => {
    it('should return 0 for low intelligence', () => {
      expect(getMaxAdditionalLanguages('Human', 7)).toBe(0);
    });

    it('should respect racial limits for Dwarves', () => {
      // Dwarf limit is 2 regardless of intelligence
      expect(getMaxAdditionalLanguages('Dwarf', 18)).toBe(2);
    });

    it('should scale with intelligence for Humans', () => {
      expect(getMaxAdditionalLanguages('Human', 8)).toBe(1);
      expect(getMaxAdditionalLanguages('Human', 10)).toBe(2);
      expect(getMaxAdditionalLanguages('Human', 14)).toBe(4);
      expect(getMaxAdditionalLanguages('Human', 18)).toBe(6);
    });
  });

  describe('getRaceLevelLimits', () => {
    it('should return null for Humans, indicating unlimited advancement', () => {
      expect(getRaceLevelLimits('Human', 'Fighter', 10, 10, 10)).toBeNull();
    });

    it('should return numeric limit for class/race combinations', () => {
      expect(getRaceLevelLimits('Dwarf', 'Cleric', 10, 10, 10)).toBe(8);
    });

    it('should return null for unavailable classes', () => {
      expect(getRaceLevelLimits('Dwarf', 'Druid', 10, 10, 10)).toBeNull();
    });

    it('should adjust limits based on ability scores', () => {
      // Dwarf fighter level limit is higher with 18 strength
      expect(getRaceLevelLimits('Dwarf', 'Fighter', 18, 10, 10)).toBe(9);
      expect(getRaceLevelLimits('Dwarf', 'Fighter', 16, 10, 10)).toBe(7);
    });
  });

  describe('getInfravisionDistance', () => {
    it('should return null for Humans', () => {
      expect(getInfravisionDistance('Human')).toBeNull();
    });

    it('should return 18 meters for most non-human races', () => {
      expect(getInfravisionDistance('Dwarf')).toBe(18);
      expect(getInfravisionDistance('Elf')).toBe(18);
      expect(getInfravisionDistance('Half-Orc')).toBe(18);
    });
  });

  describe('getBaseMovementRate', () => {
    it('should return 36 meters for Humans', () => {
      expect(getBaseMovementRate('Human')).toBe(36);
    });

    it('should return 27 meters for smaller races', () => {
      expect(getBaseMovementRate('Dwarf')).toBe(27);
      expect(getBaseMovementRate('Halfling')).toBe(27);
      expect(getBaseMovementRate('Gnome')).toBe(27);
    });
  });

  describe('getRacialAbilities', () => {
    it('should return at least one racial ability for each race', () => {
      const races: CharacterRace[] = [
        'Human',
        'Dwarf',
        'Elf',
        'Gnome',
        'Half-Elf',
        'Halfling',
        'Half-Orc',
      ];

      for (const race of races) {
        const abilities = getRacialAbilities(race);
        expect(abilities.length).toBeGreaterThan(0);
        expect(abilities[0].name).toBeDefined();
        expect(abilities[0].description).toBeDefined();
        expect(typeof abilities[0].effect).toBe('function');
      }
    });

    it('should return combat bonuses for Dwarves', () => {
      const abilities = getRacialAbilities('Dwarf');
      const hasCombatBonus = abilities.some((ability) => ability.name.includes('Combat Bonus'));

      expect(hasCombatBonus).toBe(true);
    });
  });

  describe('getPermittedClassOptions', () => {
    it('should return all classes for Humans', () => {
      const classes = getPermittedClassOptions('Human');
      expect(classes).toContain('Fighter');
      expect(classes).toContain('Magic-User');
      expect(classes).toContain('Paladin');
      expect(classes).toContain('Ranger');
      expect(classes).toContain('Thief');
      expect(classes).toContain('Cleric');
      expect(classes).toContain('Druid');
      expect(classes).toContain('Illusionist');
      expect(classes).toContain('Assassin');
    });

    it('should return restricted classes for Halflings', () => {
      const classes = getPermittedClassOptions('Halfling');
      expect(classes).toContain('Fighter');
      expect(classes).toContain('Thief');
      expect(classes).toContain('Druid');
      expect(classes).not.toContain('Magic-User');
      expect(classes).not.toContain('Paladin');
    });
  });

  describe('getMultiClassOptions', () => {
    it('should return an empty array for Humans', () => {
      expect(getMultiClassOptions('Human')).toEqual([]);
    });

    it('should return multiple options for Elves', () => {
      const options = getMultiClassOptions('Elf');
      expect(options.length).toBeGreaterThan(0);

      // Check that each option is an array of valid classes
      for (const combination of options) {
        expect(Array.isArray(combination)).toBe(true);
        for (const cls of combination) {
          expect(typeof cls).toBe('string');
        }
      }

      // Verify specific combinations exist
      const hasFighterMage = options.some(
        (combo) => combo.includes('Fighter') && combo.includes('Magic-User')
      );
      expect(hasFighterMage).toBe(true);
    });
  });
});
