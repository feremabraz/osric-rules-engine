import {
  type CharacterSecondarySkill,
  SECONDARY_SKILL_CATEGORIES,
  SKILL_GROUPS,
  SkillLevel,
  checkSecondarySkill,
  generateRandomSecondarySkill,
  getSkillLevelDescription,
} from '@rules/character/secondarySkills';
import { describe, expect, it, vi } from 'vitest';

describe('Secondary Skills', () => {
  describe('SkillLevel enum', () => {
    it('should have the correct values', () => {
      expect(SkillLevel.Novice).toBe(1);
      expect(SkillLevel.Apprentice).toBe(2);
      expect(SkillLevel.Journeyman).toBe(3);
      expect(SkillLevel.Master).toBe(4);
    });
  });

  describe('checkSecondarySkill', () => {
    it('should return true when roll is less than or equal to success chance', () => {
      // Mock Math.random to return a value that will generate a roll of 50
      vi.spyOn(Math, 'random').mockReturnValue(0.49);

      const skill: CharacterSecondarySkill = {
        skill: 'Blacksmith',
        level: SkillLevel.Novice, // Base chance of 50%
      };

      // For a novice with difficulty 0, success chance = 50%
      // With a roll of 50, this should succeed
      expect(checkSecondarySkill(skill, 0)).toBe(true);

      // Restore original Math.random
      vi.spyOn(Math, 'random').mockRestore();
    });

    it('should return false when roll is greater than success chance', () => {
      // Mock Math.random to return a value that will generate a roll of 51
      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      const skill: CharacterSecondarySkill = {
        skill: 'Blacksmith',
        level: SkillLevel.Novice, // Base chance of 50%
      };

      // For a novice with difficulty 0, success chance = 50%
      // With a roll of 51, this should fail
      expect(checkSecondarySkill(skill, 0)).toBe(false);

      // Restore original Math.random
      vi.spyOn(Math, 'random').mockRestore();
    });

    it('should apply difficulty modifier correctly', () => {
      // Mock Math.random to return a value that will generate a roll of 60
      vi.spyOn(Math, 'random').mockReturnValue(0.59);

      const skill: CharacterSecondarySkill = {
        skill: 'Blacksmith',
        level: SkillLevel.Apprentice, // Base chance of 65%
      };

      // For an apprentice with difficulty 0, success chance = 65%
      // With a roll of 60, this should succeed
      expect(checkSecondarySkill(skill, 0)).toBe(true);

      // For an apprentice with difficulty 2, success chance = 65% - (2 * 5%) = 55%
      // With a roll of 60, this should fail
      expect(checkSecondarySkill(skill, 2)).toBe(false);

      // Restore original Math.random
      vi.spyOn(Math, 'random').mockRestore();
    });

    it('should handle different skill levels correctly', () => {
      // Mock Math.random to return a value that will generate a roll of 70
      vi.spyOn(Math, 'random').mockReturnValue(0.69);

      // Test with same difficulty (5) but different skill levels

      // Novice: 50% - (5 * 5%) = 25% chance
      expect(checkSecondarySkill({ skill: 'Blacksmith', level: SkillLevel.Novice }, 5)).toBe(false);

      // Apprentice: 65% - (5 * 5%) = 40% chance
      expect(checkSecondarySkill({ skill: 'Blacksmith', level: SkillLevel.Apprentice }, 5)).toBe(
        false
      );

      // Journeyman: 80% - (5 * 5%) = 55% chance
      expect(checkSecondarySkill({ skill: 'Blacksmith', level: SkillLevel.Journeyman }, 5)).toBe(
        false
      );

      // Master: 95% - (5 * 5%) = 70% chance
      expect(checkSecondarySkill({ skill: 'Blacksmith', level: SkillLevel.Master }, 5)).toBe(true);

      // Restore original Math.random
      vi.spyOn(Math, 'random').mockRestore();
    });
  });

  describe('generateRandomSecondarySkill', () => {
    it('should generate a valid secondary skill', () => {
      // Reset Math.random mock
      vi.spyOn(Math, 'random').mockRestore();

      const skill = generateRandomSecondarySkill();

      // Verify the skill is one of the valid skills
      expect(SECONDARY_SKILL_CATEGORIES).toContain(skill.skill);

      // Verify the level is valid
      expect(Object.values(SkillLevel)).toContain(skill.level);
    });

    it('should select skills from the proper category based on the roll', () => {
      // Mock the first Math.random to control the category selection
      const randomMock = vi.spyOn(Math, 'random');

      // Roll 0.1 (10%) - should select Rural category
      randomMock.mockReturnValueOnce(0.1);
      // Mock for selecting specific skill and level
      randomMock.mockReturnValueOnce(0);
      randomMock.mockReturnValueOnce(0);

      const ruralSkill = generateRandomSecondarySkill();
      expect(SKILL_GROUPS.Rural).toContain(ruralSkill.skill);

      // Roll 0.5 (50%) - should select Urban category
      randomMock.mockReturnValueOnce(0.5);
      // Mock for selecting specific skill and level
      randomMock.mockReturnValueOnce(0);
      randomMock.mockReturnValueOnce(0);

      const urbanSkill = generateRandomSecondarySkill();
      expect(SKILL_GROUPS.Urban).toContain(urbanSkill.skill);

      // Roll 0.8 (80%) - should select Traveling category
      randomMock.mockReturnValueOnce(0.8);
      // Mock for selecting specific skill and level
      randomMock.mockReturnValueOnce(0);
      randomMock.mockReturnValueOnce(0);

      const travelingSkill = generateRandomSecondarySkill();
      expect(SKILL_GROUPS.Traveling).toContain(travelingSkill.skill);

      // Roll 0.9 (90%) - should select Maritime category
      randomMock.mockReturnValueOnce(0.9);
      // Mock for selecting specific skill and level
      randomMock.mockReturnValueOnce(0);
      randomMock.mockReturnValueOnce(0);

      const maritimeSkill = generateRandomSecondarySkill();
      expect(SKILL_GROUPS.Maritime).toContain(maritimeSkill.skill);

      // Roll 0.96 (96%) - should select Wilderness category
      randomMock.mockReturnValueOnce(0.96);
      // Mock for selecting specific skill and level
      randomMock.mockReturnValueOnce(0);
      randomMock.mockReturnValueOnce(0);

      const wildernessSkill = generateRandomSecondarySkill();
      expect(SKILL_GROUPS.Wilderness).toContain(wildernessSkill.skill);

      // Restore original Math.random
      randomMock.mockRestore();
    });

    it('should assign skill levels based on the roll', () => {
      const randomMock = vi.spyOn(Math, 'random');

      // First mock is for category selection
      randomMock.mockReturnValueOnce(0.1);
      // Second mock is for skill selection
      randomMock.mockReturnValueOnce(0);

      // Roll 0.1 (10%) - should be Novice level
      randomMock.mockReturnValueOnce(0.1);
      const noviceSkill = generateRandomSecondarySkill();
      expect(noviceSkill.level).toBe(SkillLevel.Novice);

      // Reset
      randomMock.mockReturnValueOnce(0.1);
      randomMock.mockReturnValueOnce(0);

      // Roll 0.7 (70%) - should be Apprentice level
      randomMock.mockReturnValueOnce(0.7);
      const apprenticeSkill = generateRandomSecondarySkill();
      expect(apprenticeSkill.level).toBe(SkillLevel.Apprentice);

      // Reset
      randomMock.mockReturnValueOnce(0.1);
      randomMock.mockReturnValueOnce(0);

      // Roll 0.9 (90%) - should be Journeyman level
      randomMock.mockReturnValueOnce(0.9);
      const journeymanSkill = generateRandomSecondarySkill();
      expect(journeymanSkill.level).toBe(SkillLevel.Journeyman);

      // Reset
      randomMock.mockReturnValueOnce(0.1);
      randomMock.mockReturnValueOnce(0);

      // Roll 0.99 (99%) - should be Master level
      randomMock.mockReturnValueOnce(0.99);
      const masterSkill = generateRandomSecondarySkill();
      expect(masterSkill.level).toBe(SkillLevel.Master);

      // Restore original Math.random
      randomMock.mockRestore();
    });
  });

  describe('getSkillLevelDescription', () => {
    it('should return the correct description for each skill level', () => {
      expect(getSkillLevelDescription(SkillLevel.Novice)).toBe('has basic familiarity with');
      expect(getSkillLevelDescription(SkillLevel.Apprentice)).toBe('is competent with');
      expect(getSkillLevelDescription(SkillLevel.Journeyman)).toBe('is highly skilled in');
      expect(getSkillLevelDescription(SkillLevel.Master)).toBe('has mastered');
    });

    it('should handle unexpected values gracefully', () => {
      // @ts-ignore Testing with invalid value
      expect(getSkillLevelDescription(999)).toBe('knows something about');
    });
  });
});
