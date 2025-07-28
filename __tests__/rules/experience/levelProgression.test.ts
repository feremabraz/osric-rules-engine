import {
  determineLevel,
  getExperienceForNextLevel,
  getLevelTitle,
  levelProgressionTables,
} from '@rules/experience/levelProgression';
import type { CharacterClass } from '@rules/types';
import { describe, expect, it } from 'vitest';

describe('Level Progression', () => {
  describe('levelProgressionTables', () => {
    it('should contain progression tables for all character classes', () => {
      expect(levelProgressionTables).toHaveProperty('Fighter');
      expect(levelProgressionTables).toHaveProperty('Cleric');
      expect(levelProgressionTables).toHaveProperty('Magic-User');
      expect(levelProgressionTables).toHaveProperty('Thief');

      // Check that each class has a valid progression table
      for (const className in levelProgressionTables) {
        const table = levelProgressionTables[className as CharacterClass];
        expect(Array.isArray(table)).toBe(true);
        expect(table.length).toBeGreaterThan(0);
        expect(table[0]).toHaveProperty('level', 1);
        expect(table[0]).toHaveProperty('experienceRequired', 0);
      }
    });
  });

  describe('determineLevel', () => {
    it('should correctly determine level based on experience points', () => {
      // Test for Fighter class
      expect(determineLevel('Fighter', 0)).toBe(1); // 0 XP = level 1
      expect(determineLevel('Fighter', 1999)).toBe(1); // 1999 XP = level 1
      expect(determineLevel('Fighter', 2000)).toBe(2); // 2000 XP = level 2
      expect(determineLevel('Fighter', 4000)).toBe(3); // 4000 XP = level 3

      // Test for another class (Magic-User)
      expect(determineLevel('Magic-User', 0)).toBe(1);
      expect(determineLevel('Magic-User', 2500)).toBe(2);
    });

    it('should return highest level if experience exceeds max table entry', () => {
      const maxFighterLevel = levelProgressionTables.Fighter.length;
      const maxXPEntry = levelProgressionTables.Fighter[maxFighterLevel - 1].experienceRequired;

      // Extremely high XP value should still return highest level in table
      expect(determineLevel('Fighter', maxXPEntry * 10)).toBe(maxFighterLevel);
    });
  });

  describe('getExperienceForNextLevel', () => {
    it('should return correct XP needed for next level', () => {
      // Level 1 Fighter needs 2000 XP to reach level 2
      expect(getExperienceForNextLevel('Fighter', 1)).toBe(2000);

      // Level 2 Fighter needs 4000 XP to reach level 3
      expect(getExperienceForNextLevel('Fighter', 2)).toBe(4000);
    });

    it('should return Number.MAX_SAFE_INTEGER for max level characters', () => {
      const maxFighterLevel = levelProgressionTables.Fighter.length;
      expect(getExperienceForNextLevel('Fighter', maxFighterLevel)).toBe(Number.MAX_SAFE_INTEGER);
    });
  });

  describe('getLevelTitle', () => {
    it('should return correct title for a given class and level', () => {
      expect(getLevelTitle('Fighter', 1)).toBe('Veteran');
      expect(getLevelTitle('Fighter', 2)).toBe('Warrior');
      expect(getLevelTitle('Fighter', 3)).toBe('Swordsman');

      // Also test another class
      expect(getLevelTitle('Thief', 1)).toBe('Apprentice');
    });

    it('should return default title for levels without specific titles', () => {
      // Assuming there might be some high level without specific title
      const maxFighterLevel = levelProgressionTables.Fighter.length;

      // This might not be applicable if all levels have titles, but test the behavior
      const title = getLevelTitle('Fighter', maxFighterLevel);
      expect(title).toBeTypeOf('string');
      expect(title.length).toBeGreaterThan(0);
    });
  });
});
