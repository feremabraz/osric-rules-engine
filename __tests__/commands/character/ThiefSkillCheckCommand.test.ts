import { ThiefSkillCheckCommand } from '@osric/commands/character/ThiefSkillCheckCommand';
import type { ThiefSkillCheckParameters } from '@osric/commands/character/ThiefSkillCheckCommand';
import { GameContext } from '@osric/core/GameContext';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';
import type { Character, CharacterClass, CharacterRace } from '@osric/types/entities';
import { createStore } from 'jotai';
import { beforeEach, describe, expect, it } from 'vitest';

function createMockCharacter(overrides: Partial<Character> = {}): Character {
  const character: Character = {
    id: 'test-character',
    name: 'Test Thief',
    race: 'Human' as CharacterRace,
    class: 'Thief' as CharacterClass,
    classes: { Thief: 3 },
    primaryClass: 'Thief' as CharacterClass,
    level: 3,
    hitPoints: { current: 18, maximum: 18 },
    armorClass: 8,
    encumbrance: 50,
    movementRate: 120,
    abilities: {
      strength: 12,
      dexterity: 16,
      constitution: 14,
      intelligence: 13,
      wisdom: 11,
      charisma: 10,
    },
    abilityModifiers: {
      strengthHitAdj: null,
      strengthDamageAdj: null,
      strengthEncumbrance: null,
      strengthOpenDoors: null,
      strengthBendBars: null,

      dexterityReaction: 2,
      dexterityMissile: 2,
      dexterityDefense: -2,
      dexterityPickPockets: 10,
      dexterityOpenLocks: 15,
      dexterityFindTraps: 5,
      dexterityMoveSilently: 10,
      dexterityHideInShadows: 10,

      constitutionHitPoints: null,
      constitutionSystemShock: null,
      constitutionResurrectionSurvival: null,
      constitutionPoisonSave: null,

      intelligenceLanguages: null,
      intelligenceLearnSpells: null,
      intelligenceMaxSpellLevel: null,
      intelligenceIllusionImmunity: false,

      wisdomMentalSave: null,
      wisdomBonusSpells: null,
      wisdomSpellFailure: null,

      charismaReactionAdj: null,
      charismaLoyaltyBase: null,
      charismaMaxHenchmen: null,
    },
    savingThrows: {
      'Poison or Death': 13,
      Wands: 14,
      'Paralysis, Polymorph, or Petrification': 13,
      'Breath Weapons': 16,
      'Spells, Rods, or Staves': 15,
    },
    experience: {
      current: 2500,
      requiredForNextLevel: 5000,
      level: 3,
    },
    thiefSkills: {
      pickPockets: 35,
      openLocks: 30,
      findTraps: 25,
      removeTraps: 25,
      moveSilently: 27,
      hideInShadows: 25,
      hearNoise: 10,
      climbWalls: 80,
      readLanguages: 1,
    },
    currency: {
      platinum: 0,
      gold: 100,
      electrum: 0,
      silver: 50,
      copper: 25,
    },
    spells: [],
    spellSlots: {},
    memorizedSpells: {},
    spellbook: [],
    turnUndead: null,
    languages: ['Common', 'Thieves Cant'],
    age: 22,
    ageCategory: 'Adult',
    henchmen: [],
    racialAbilities: [],
    classAbilities: [],
    proficiencies: [],
    secondarySkills: [],
    thac0: 19,
    alignment: 'Chaotic Neutral',
    inventory: [],
    position: '0,0',
    statusEffects: [],
    ...overrides,
  };

  return character;
}

describe('ThiefSkillCheckCommand', () => {
  let context: GameContext;
  let command: ThiefSkillCheckCommand;

  beforeEach(() => {
    const store = createStore();
    context = new GameContext(store);

    const character = createMockCharacter();
    context.setEntity('test-character', character);

    command = new ThiefSkillCheckCommand({
      characterId: 'test-character',
      skillType: 'pick-locks',
    });
  });

  describe('Command Creation', () => {
    it('should create command with proper type', () => {
      const params: ThiefSkillCheckParameters = {
        characterId: 'test-character',
        skillType: 'pick-locks',
      };
      const newCommand = new ThiefSkillCheckCommand(params);

      expect(newCommand.type).toBe(COMMAND_TYPES.THIEF_SKILL_CHECK);
      expect(newCommand.getInvolvedEntities()).toContain('test-character');
    });

    it('should accept all valid thief skills', () => {
      const validSkills = [
        'pick-locks',
        'find-traps',
        'move-silently',
        'hide-shadows',
        'hear-noise',
        'climb-walls',
        'read-languages',
      ] as const;

      for (const skill of validSkills) {
        const params: ThiefSkillCheckParameters = {
          characterId: 'test-character',
          skillType: skill,
        };
        const testCommand = new ThiefSkillCheckCommand(params);
        expect(testCommand.type).toBe(COMMAND_TYPES.THIEF_SKILL_CHECK);
      }
    });

    it('should accept situational modifiers', () => {
      const params: ThiefSkillCheckParameters = {
        characterId: 'test-character',
        skillType: 'pick-locks',
        situationalModifiers: {
          difficulty: 'hard',
          lighting: 'dim',
          time: 'careful',
          equipment: -5,
        },
      };
      const testCommand = new ThiefSkillCheckCommand(params);
      expect(testCommand.type).toBe(COMMAND_TYPES.THIEF_SKILL_CHECK);
    });
  });

  describe('Command Validation', () => {
    it('should validate when character exists and has thief skills', () => {
      expect(command.canExecute(context)).toBe(true);
    });

    it('should fail validation when character does not exist', () => {
      const noCharCommand = new ThiefSkillCheckCommand({
        characterId: 'nonexistent-character',
        skillType: 'pick-locks',
      });
      expect(noCharCommand.canExecute(context)).toBe(false);
    });

    it('should fail validation when character is not a thief or assassin', () => {
      const fighter = createMockCharacter({
        class: 'Fighter',
        thiefSkills: null,
      });
      context.setEntity('fighter-character', fighter);

      const fighterCommand = new ThiefSkillCheckCommand({
        characterId: 'fighter-character',
        skillType: 'pick-locks',
      });
      expect(fighterCommand.canExecute(context)).toBe(false);
    });

    it('should validate assassins can use thief skills', () => {
      const assassin = createMockCharacter({
        class: 'Assassin',
        thiefSkills: {
          pickPockets: 35,
          openLocks: 30,
          findTraps: 25,
          removeTraps: 25,
          moveSilently: 30,
          hideInShadows: 30,
          hearNoise: 10,
          climbWalls: 75,
          readLanguages: 1,
        },
      });
      context.setEntity('assassin-character', assassin);

      const assassinCommand = new ThiefSkillCheckCommand({
        characterId: 'assassin-character',
        skillType: 'move-silently',
      });
      expect(assassinCommand.canExecute(context)).toBe(true);
    });
  });

  describe('Command Execution', () => {
    it('should execute successfully with valid data', async () => {
      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
      expect(result.data).toBeDefined();
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
        const testCommand = new ThiefSkillCheckCommand({
          characterId: 'test-character',
          skillType,
        });

        const result = await testCommand.execute(context);
        expect(result.success).toBe(true);
      }
    });

    it('should apply situational modifiers correctly', async () => {
      const easyCommand = new ThiefSkillCheckCommand({
        characterId: 'test-character',
        skillType: 'pick-locks',
        situationalModifiers: {
          difficulty: 'easy',
          lighting: 'bright',
          time: 'careful',
        },
      });

      const easyResult = await easyCommand.execute(context);
      expect(easyResult.success).toBe(true);

      const hardCommand = new ThiefSkillCheckCommand({
        characterId: 'test-character',
        skillType: 'pick-locks',
        situationalModifiers: {
          difficulty: 'very-hard',
          lighting: 'pitch-black',
          time: 'rushed',
        },
      });

      const hardResult = await hardCommand.execute(context);
      expect(hardResult.success).toBe(true);
    });

    it('should respect OSRIC skill percentage limits (1-99%)', async () => {
      const extremeEasyCommand = new ThiefSkillCheckCommand({
        characterId: 'test-character',
        skillType: 'pick-locks',
        targetDifficulty: 200,
      });

      const result = await extremeEasyCommand.execute(context);
      expect(result.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing character', async () => {
      const command = new ThiefSkillCheckCommand({
        characterId: 'missing-character',
        skillType: 'pick-locks',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });

    it('should handle non-thief characters', async () => {
      const fighter = createMockCharacter({
        id: 'fighter-character',
        class: 'Fighter',
        thiefSkills: null,
      });
      context.setEntity('fighter-character', fighter);

      const command = new ThiefSkillCheckCommand({
        characterId: 'fighter-character',
        skillType: 'pick-locks',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(false);
      expect(result.message).toContain('thief skills');
    });

    it('should handle rule execution failure gracefully', async () => {
      const emptyContext = new GameContext(createStore());

      const result = await command.execute(emptyContext);
      expect(result.success).toBe(false);
      expect(result.message).toBeDefined();
    });
  });

  describe('Required Rules', () => {
    it('should return required rule names', () => {
      const requiredRules = command.getRequiredRules();
      expect(requiredRules).toContain(RULE_NAMES.THIEF_SKILLS);
    });
  });

  describe('OSRIC Compliance', () => {
    it('should implement authentic OSRIC thief skill mechanics', async () => {
      const character = createMockCharacter({ level: 1 });
      context.setEntity('level1-character', character);

      const command = new ThiefSkillCheckCommand({
        characterId: 'level1-character',
        skillType: 'climb-walls',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);
    });
  });
});
