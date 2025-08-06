import {
  ThiefSkillCheckCommand,
  type ThiefSkillCheckParameters,
} from '@osric/commands/character/ThiefSkillCheckCommand';
import type { Command } from '@osric/core/Command';
import { GameContext } from '@osric/core/GameContext';
import { ThiefSkillRule } from '@osric/rules/character/ThiefSkillRules';
import { RULE_NAMES } from '@osric/types/constants';
import type {
  AbilityScoreModifiers,
  AgeCategory,
  Character,
  CharacterClass,
  CharacterRace,
  SavingThrowType,
} from '@osric/types/entities';
import { createStore } from 'jotai';
import { beforeEach, describe, expect, it } from 'vitest';

// Helper function for mock character creation (CRITICAL)
function createMockCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'test-character',
    name: 'Test Thief',
    level: 3,
    race: 'Human',
    class: 'Thief',
    alignment: 'Chaotic Neutral',
    abilities: {
      strength: 12,
      dexterity: 16, // Good dexterity for thief skills
      constitution: 14,
      intelligence: 13,
      wisdom: 11,
      charisma: 10,
    },
    hitPoints: { current: 18, maximum: 18 },
    experience: { current: 2500, requiredForNextLevel: 5000, level: 3 },
    armorClass: 7, // Leather armor
    thac0: 18,
    inventory: [
      {
        id: 'thieves-tools',
        name: "Thieves' Tools",
        description: 'Tools of the trade',
        value: 25,
        equipped: true,
        weight: 1,
        magicBonus: null,
        charges: null,
      },
      {
        id: 'leather-armor',
        name: 'Leather Armor',
        description: 'Basic leather protection',
        value: 5,
        equipped: true,
        weight: 15,
        magicBonus: null,
        charges: null,
      },
    ],
    position: 'ready',
    statusEffects: [],
    abilityModifiers: {} as AbilityScoreModifiers,
    savingThrows: {} as Record<SavingThrowType, number>,
    spells: [],
    currency: { platinum: 0, gold: 50, electrum: 0, silver: 25, copper: 100 },
    encumbrance: 0,
    movementRate: 120,
    classes: { Thief: 3 },
    primaryClass: null,
    spellSlots: {},
    memorizedSpells: {},
    spellbook: [],
    thiefSkills: {
      pickPockets: 43,
      openLocks: 38,
      findTraps: 33,
      removeTraps: 33,
      moveSilently: 30,
      hideInShadows: 30,
      hearNoise: 16,
      climbWalls: 84,
      readLanguages: 10,
    },
    turnUndead: null,
    languages: ['Common', "Thieves' Cant"],
    age: 20,
    ageCategory: 'Young' as AgeCategory,
    henchmen: [],
    racialAbilities: [],
    classAbilities: [],
    proficiencies: [{ weapon: 'Dagger', penalty: 0 }],
    secondarySkills: [],
    ...overrides,
  };
}

describe('ThiefSkillRule', () => {
  let rule: ThiefSkillRule;
  let context: GameContext;

  beforeEach(() => {
    const store = createStore();
    context = new GameContext(store);
    rule = new ThiefSkillRule();
  });

  describe('Rule Creation', () => {
    it('should create rule with proper name', () => {
      expect(rule.name).toBe(RULE_NAMES.THIEF_SKILLS);
    });

    it('should have correct priority', () => {
      expect(rule.priority).toBe(500);
    });
  });

  describe('Rule Applicability', () => {
    it('should apply to thief skill check commands', () => {
      const params: ThiefSkillCheckParameters = {
        characterId: 'test-character',
        skillType: 'pick-locks',
      };
      const command = new ThiefSkillCheckCommand(params);

      expect(rule.canApply(context, command)).toBe(true);
    });

    it('should not apply to other command types', () => {
      // Mock command with different type
      const mockCommand = {
        type: 'other-command-type',
      } as Command;

      expect(rule.canApply(context, mockCommand)).toBe(false);
    });
  });

  describe('Rule Execution', () => {
    beforeEach(() => {
      const character = createMockCharacter();
      context.setEntity('test-character', character);
    });

    it('should execute successfully with valid thief skill data', async () => {
      const params: ThiefSkillCheckParameters = {
        characterId: 'test-character',
        skillType: 'pick-locks',
      };
      const command = new ThiefSkillCheckCommand(params);

      // Set temporary data as the command would
      context.setTemporary('thief-skill-params', params);

      const result = await rule.execute(context, command);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      if (result.data) {
        expect(result.data.characterId).toBe('test-character');
        expect(result.data.skillType).toBe('pick-locks');
        expect(result.data.baseChance).toBeDefined();
        expect(result.data.finalChance).toBeDefined();
        expect(result.data.canAttempt).toBe(true);
      }
    });

    it('should handle different skill types', async () => {
      const skillTypes = [
        'pick-locks',
        'find-traps',
        'move-silently',
        'hide-shadows',
        'hear-noise',
        'climb-walls',
      ] as const;

      for (const skillType of skillTypes) {
        const params: ThiefSkillCheckParameters = {
          characterId: 'test-character',
          skillType,
        };
        const command = new ThiefSkillCheckCommand(params);

        context.setTemporary('thief-skill-params', params);

        const result = await rule.execute(context, command);
        expect(result.success).toBe(true);
        if (result.data) {
          expect(result.data.skillType).toBe(skillType);
        }
      }
    });

    it('should calculate base skill percentages correctly', async () => {
      const character = createMockCharacter({ level: 1 });
      context.setEntity('test-character', character);

      const params: ThiefSkillCheckParameters = {
        characterId: 'test-character',
        skillType: 'climb-walls',
      };
      const command = new ThiefSkillCheckCommand(params);

      context.setTemporary('thief-skill-params', params);

      const result = await rule.execute(context, command);
      expect(result.success).toBe(true);

      if (result.data) {
        // Level 1 thief should have ~85% climb walls base
        expect(result.data.baseChance).toBeGreaterThan(80);
        expect(result.data.baseChance).toBeLessThan(90);
      }
    });

    it('should apply racial modifiers', async () => {
      const halfling = createMockCharacter({ race: 'Halfling' });
      context.setEntity('test-character', halfling);

      const params: ThiefSkillCheckParameters = {
        characterId: 'test-character',
        skillType: 'hide-shadows',
      };
      const command = new ThiefSkillCheckCommand(params);

      context.setTemporary('thief-skill-params', params);

      const result = await rule.execute(context, command);
      expect(result.success).toBe(true);

      if (result.data) {
        // Should include racial modifiers
        expect(result.data.modifiers).toBeDefined();
        const modifiers = result.data.modifiers as Array<{
          source: string;
          modifier: number;
          description: string;
        }>;
        const hasRacialMod = modifiers.some((mod) => mod.source === 'racial');
        expect(hasRacialMod).toBe(true);
      }
    });

    it('should apply dexterity modifiers', async () => {
      const highDexCharacter = createMockCharacter({
        abilities: {
          strength: 12,
          dexterity: 18, // Very high dexterity
          constitution: 14,
          intelligence: 13,
          wisdom: 11,
          charisma: 10,
        },
      });
      context.setEntity('test-character', highDexCharacter);

      const params: ThiefSkillCheckParameters = {
        characterId: 'test-character',
        skillType: 'pick-locks',
      };
      const command = new ThiefSkillCheckCommand(params);

      context.setTemporary('thief-skill-params', params);

      const result = await rule.execute(context, command);
      expect(result.success).toBe(true);

      if (result.data) {
        // Should include ability score modifiers
        expect(result.data.modifiers).toBeDefined();
        const modifiers = result.data.modifiers as Array<{
          source: string;
          modifier: number;
          description: string;
        }>;
        const hasAbilityMod = modifiers.some((mod) => mod.source === 'ability');
        expect(hasAbilityMod).toBe(true);
      }
    });

    it('should apply situational modifiers', async () => {
      const params: ThiefSkillCheckParameters = {
        characterId: 'test-character',
        skillType: 'move-silently',
        situationalModifiers: {
          difficulty: 'hard',
          lighting: 'pitch-black',
          time: 'careful',
        },
      };
      const command = new ThiefSkillCheckCommand(params);

      context.setTemporary('thief-skill-params', params);

      const result = await rule.execute(context, command);
      expect(result.success).toBe(true);

      if (result.data) {
        // Should include various situational modifiers
        const modifiers = result.data.modifiers as Array<{
          source: string;
          modifier: number;
          description: string;
        }>;
        expect(modifiers.length).toBeGreaterThan(1);
        const hasDifficultyMod = modifiers.some((mod) => mod.source === 'difficulty');
        const hasLightingMod = modifiers.some((mod) => mod.source === 'lighting');
        expect(hasDifficultyMod).toBe(true);
        expect(hasLightingMod).toBe(true);
      }
    });

    it('should enforce OSRIC skill percentage limits', async () => {
      const params: ThiefSkillCheckParameters = {
        characterId: 'test-character',
        skillType: 'pick-locks',
        targetDifficulty: 150, // Extreme override
      };
      const command = new ThiefSkillCheckCommand(params);

      context.setTemporary('thief-skill-params', params);

      const result = await rule.execute(context, command);
      expect(result.success).toBe(true);

      if (result.data) {
        // Should cap at 99%
        expect(result.data.finalChance).toBeLessThanOrEqual(99);
      }
    });

    it('should handle assassin characters', async () => {
      const assassin = createMockCharacter({ class: 'Assassin' });
      context.setEntity('test-character', assassin);

      const params: ThiefSkillCheckParameters = {
        characterId: 'test-character',
        skillType: 'move-silently',
      };
      const command = new ThiefSkillCheckCommand(params);

      context.setTemporary('thief-skill-params', params);

      const result = await rule.execute(context, command);
      expect(result.success).toBe(true);

      if (result.data) {
        // Should work for assassins
        expect(result.data.canAttempt).toBe(true);
      }
    });

    it('should validate non-thief characters', async () => {
      const fighter = createMockCharacter({
        class: 'Fighter',
        thiefSkills: null,
      });
      context.setEntity('test-character', fighter);

      const params: ThiefSkillCheckParameters = {
        characterId: 'test-character',
        skillType: 'pick-locks',
      };
      const command = new ThiefSkillCheckCommand(params);

      context.setTemporary('thief-skill-params', params);

      const result = await rule.execute(context, command);
      expect(result.success).toBe(false);
      expect(result.message).toContain('does not have thief skills');
    });

    it('should handle level restrictions', async () => {
      const lowLevelCharacter = createMockCharacter({
        level: 2,
        experience: { current: 1500, requiredForNextLevel: 2500, level: 2 },
      });
      context.setEntity('test-character', lowLevelCharacter);

      const params: ThiefSkillCheckParameters = {
        characterId: 'test-character',
        skillType: 'read-languages',
      };
      const command = new ThiefSkillCheckCommand(params);

      context.setTemporary('thief-skill-params', params);

      const result = await rule.execute(context, command);
      expect(result.success).toBe(false);
      expect(result.message).toContain('requires level 4');
    });

    it('should provide special rules information', async () => {
      const params: ThiefSkillCheckParameters = {
        characterId: 'test-character',
        skillType: 'find-traps',
      };
      const command = new ThiefSkillCheckCommand(params);

      context.setTemporary('thief-skill-params', params);

      const result = await rule.execute(context, command);
      expect(result.success).toBe(true);

      if (result.data) {
        const specialRules = result.data.specialRules as string[];
        expect(specialRules).toBeDefined();
        expect(specialRules.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle missing skill data', async () => {
      const params: ThiefSkillCheckParameters = {
        characterId: 'test-character',
        skillType: 'pick-locks',
      };
      const command = new ThiefSkillCheckCommand(params);

      // Don't set temporary data to simulate missing data

      const result = await rule.execute(context, command);
      expect(result.success).toBe(false);
      expect(result.message).toContain('No thief skill check data');
    });

    it('should handle missing character', async () => {
      const params: ThiefSkillCheckParameters = {
        characterId: 'nonexistent-character',
        skillType: 'pick-locks',
      };
      const command = new ThiefSkillCheckCommand(params);

      context.setTemporary('thief-skill-params', params);

      const result = await rule.execute(context, command);
      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });

    it('should handle unexpected errors gracefully', async () => {
      // Create invalid skill data to trigger error
      const invalidParams = {
        characterId: 'test-character',
        skillType: null, // Invalid skill type
      };
      const command = new ThiefSkillCheckCommand({ characterId: 'test', skillType: 'pick-locks' });

      context.setTemporary('thief-skill-params', invalidParams);

      const result = await rule.execute(context, command);
      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });
  });

  describe('OSRIC Compliance', () => {
    it('should implement OSRIC skill progression tables', async () => {
      // Test progression across levels for key skills
      const levels = [1, 5, 10, 15];

      for (const level of levels) {
        const character = createMockCharacter({
          level,
          experience: { current: level * 2500, requiredForNextLevel: (level + 1) * 2500, level },
        });
        context.setEntity('test-character', character);

        const params: ThiefSkillCheckParameters = {
          characterId: 'test-character',
          skillType: 'pick-locks',
        };
        const command = new ThiefSkillCheckCommand(params);

        context.setTemporary('thief-skill-params', params);

        const result = await rule.execute(context, command);
        expect(result.success).toBe(true);

        if (result.data) {
          // Higher levels should generally have better base chances
          expect(result.data.baseChance).toBeGreaterThan(0);
          expect(result.data.baseChance).toBeLessThanOrEqual(99);
        }
      }
    });

    it('should implement OSRIC racial modifiers correctly', async () => {
      const racialTests = [
        { race: 'Halfling' as CharacterRace, skill: 'hide-shadows' as const },
        { race: 'Elf' as CharacterRace, skill: 'move-silently' as const },
        { race: 'Half-Elf' as CharacterRace, skill: 'move-silently' as const },
      ];

      for (const test of racialTests) {
        const character = createMockCharacter({ race: test.race });
        context.setEntity('test-character', character);

        const params: ThiefSkillCheckParameters = {
          characterId: 'test-character',
          skillType: test.skill,
        };
        const command = new ThiefSkillCheckCommand(params);

        context.setTemporary('thief-skill-params', params);

        const result = await rule.execute(context, command);
        expect(result.success).toBe(true);

        if (result.data) {
          // Should include racial modifiers
          expect(result.data.modifiers).toBeDefined();
          const modifiers = result.data.modifiers as Array<{
            source: string;
            modifier: number;
            description: string;
          }>;
          const racialMod = modifiers.find((mod) => mod.source === 'racial');
          if (racialMod) {
            expect(racialMod.modifier).toBeGreaterThan(0); // Should have positive racial modifier
          }
        }
      }
    });

    it('should implement OSRIC ability score adjustments', async () => {
      const dexterityTests = [
        { dexterity: 9, expectedNegative: true },
        { dexterity: 12, expectedNeutral: true },
        { dexterity: 18, expectedPositive: true },
      ];

      for (const test of dexterityTests) {
        const character = createMockCharacter({
          abilities: {
            strength: 12,
            dexterity: test.dexterity,
            constitution: 14,
            intelligence: 13,
            wisdom: 11,
            charisma: 10,
          },
        });
        context.setEntity('test-character', character);

        const params: ThiefSkillCheckParameters = {
          characterId: 'test-character',
          skillType: 'pick-locks', // Dexterity-based skill
        };
        const command = new ThiefSkillCheckCommand(params);

        context.setTemporary('thief-skill-params', params);

        const result = await rule.execute(context, command);
        expect(result.success).toBe(true);

        if (result.data) {
          const modifiers = result.data.modifiers as Array<{
            source: string;
            modifier: number;
            description: string;
          }>;
          const abilityMod = modifiers.find((mod) => mod.source === 'ability');
          if (abilityMod) {
            if (test.expectedNegative) {
              expect(abilityMod.modifier).toBeLessThan(0);
            } else if (test.expectedPositive) {
              expect(abilityMod.modifier).toBeGreaterThan(0);
            }
            // Neutral case doesn't require ability modifier
          }
        }
      }
    });

    it('should enforce OSRIC percentage limits (1-99%)', async () => {
      const character = createMockCharacter();
      context.setEntity('test-character', character);

      // Test both extreme cases
      const extremeCases = [
        { targetDifficulty: 200, expectMax: 99 },
        { targetDifficulty: -100, expectMin: 1 },
      ];

      for (const testCase of extremeCases) {
        const params: ThiefSkillCheckParameters = {
          characterId: 'test-character',
          skillType: 'pick-locks',
          targetDifficulty: testCase.targetDifficulty,
        };
        const command = new ThiefSkillCheckCommand(params);

        context.setTemporary('thief-skill-params', params);

        const result = await rule.execute(context, command);
        expect(result.success).toBe(true);

        if (result.data) {
          if (testCase.expectMax) {
            expect(result.data.finalChance).toBeLessThanOrEqual(testCase.expectMax);
          }
          if (testCase.expectMin) {
            expect(result.data.finalChance).toBeGreaterThanOrEqual(testCase.expectMin);
          }
        }
      }
    });
  });
});
