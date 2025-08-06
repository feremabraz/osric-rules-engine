import { GameContext } from '@osric/core/GameContext';
import { TrainingRule } from '@osric/rules/experience/TrainingRules';
import { COMMAND_TYPES } from '@osric/types/constants';
import type { Character } from '@osric/types/entities';
import { createStore } from 'jotai';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function createMockCharacter(overrides: Partial<Character> = {}): Character {
  const defaultCharacter: Character = {
    id: 'test-char',
    name: 'Test Character',
    level: 1,
    hitPoints: { current: 8, maximum: 8 },
    armorClass: 10,
    thac0: 20,
    experience: { current: 0, requiredForNextLevel: 2000, level: 1 },
    alignment: 'True Neutral',
    inventory: [],
    position: 'town',
    statusEffects: [],
    race: 'Human',
    class: 'Fighter',
    abilities: {
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
    },
    abilityModifiers: {
      strengthHitAdj: null,
      strengthDamageAdj: null,
      strengthEncumbrance: null,
      strengthOpenDoors: null,
      strengthBendBars: null,
      dexterityReaction: null,
      dexterityMissile: null,
      dexterityDefense: null,
      dexterityPickPockets: null,
      dexterityOpenLocks: null,
      dexterityFindTraps: null,
      dexterityMoveSilently: null,
      dexterityHideInShadows: null,
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
      'Poison or Death': 14,
      Wands: 16,
      'Paralysis, Polymorph, or Petrification': 15,
      'Breath Weapons': 17,
      'Spells, Rods, or Staves': 17,
    },
    spells: [],
    currency: { platinum: 0, gold: 0, electrum: 0, silver: 0, copper: 0 },
    encumbrance: 0,
    movementRate: 120,
    classes: { Fighter: 1 },
    primaryClass: null,
    spellSlots: {},
    memorizedSpells: {},
    spellbook: [],
    thiefSkills: null,
    turnUndead: null,
    languages: ['Common'],
    age: 20,
    ageCategory: 'Adult',
    henchmen: [],
    racialAbilities: [],
    classAbilities: [],
    proficiencies: [],
    secondarySkills: [],
  };

  return { ...defaultCharacter, ...overrides };
}

class MockTrainingCommand {
  readonly type = COMMAND_TYPES.LEVEL_UP;
  readonly actorId = 'test-character';
  readonly targetIds: string[] = [];

  async execute(_context: GameContext) {
    return { success: true, message: 'Mock training command executed' };
  }

  canExecute(_context: GameContext): boolean {
    return true;
  }

  getRequiredRules(): string[] {
    return ['training'];
  }

  getInvolvedEntities(): string[] {
    return [this.actorId, ...this.targetIds];
  }
}

describe('TrainingRules', () => {
  let context: GameContext;
  let trainingRule: TrainingRule;
  let mockCommand: MockTrainingCommand;
  let originalMathRandom: () => number;

  beforeEach(() => {
    const store = createStore();
    context = new GameContext(store);
    trainingRule = new TrainingRule();
    mockCommand = new MockTrainingCommand();

    originalMathRandom = Math.random;

    Math.random = vi.fn(() => 0.1);

    const testCharacter = createMockCharacter({
      id: 'test-character',
      name: 'Test Hero',
      level: 2,
      experience: { current: 100000, requiredForNextLevel: 100000, level: 2 },
      currency: { platinum: 0, gold: 2000, electrum: 0, silver: 0, copper: 0 },
    });

    context.setEntity('test-character', testCharacter);

    context.setTemporary('training-request-params', {
      characterId: 'test-character',
      trainingType: 'level_advancement',
      targetLevel: 3,
    });
  });

  afterEach(() => {
    Math.random = originalMathRandom;
  });

  describe('Rule Application', () => {
    it('should apply to training commands', () => {
      const result = trainingRule.canApply(context, mockCommand);
      expect(result).toBe(true);
    });

    it('should not apply to other command types', () => {
      class OtherCommand {
        readonly type = COMMAND_TYPES.GAIN_EXPERIENCE;
        readonly actorId = 'test-character';
        readonly targetIds: string[] = [];

        async execute(_context: GameContext) {
          return { success: true, message: 'Mock other command executed' };
        }

        canExecute(_context: GameContext): boolean {
          return true;
        }

        getRequiredRules(): string[] {
          return ['level-progression'];
        }

        getInvolvedEntities(): string[] {
          return [this.actorId, ...this.targetIds];
        }
      }

      const otherCommand = new OtherCommand();
      const result = trainingRule.canApply(context, otherCommand);
      expect(result).toBe(false);
    });
  });

  describe('Basic Training Requirements', () => {
    it('should calculate training cost correctly', async () => {
      const result = await trainingRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.message).toContain('Training');
    });

    it('should handle insufficient experience points', async () => {
      const lowXpCharacter = createMockCharacter({
        id: 'low-xp-character',
        name: 'Poor Hero',
        level: 1,
        experience: { current: 1000, requiredForNextLevel: 1000, level: 1 },
        currency: { platinum: 0, gold: 2000, electrum: 0, silver: 0, copper: 0 },
      });
      context.setEntity('low-xp-character', lowXpCharacter);

      context.setTemporary('training-request-params', {
        characterId: 'low-xp-character',
        trainingType: 'level_advancement',
        targetLevel: 3,
      });

      const result = await trainingRule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Insufficient experience points');
    });

    it('should require higher prime requisite for high levels', async () => {
      const lowStatCharacter = createMockCharacter({
        id: 'low-stat-character',
        name: 'Weak Hero',
        level: 8,
        experience: { current: 1000000, requiredForNextLevel: 1000000, level: 8 },
        currency: { platinum: 0, gold: 2000, electrum: 0, silver: 0, copper: 0 },
        abilities: {
          strength: 12,
          dexterity: 14,
          constitution: 15,
          intelligence: 12,
          wisdom: 13,
          charisma: 11,
        },
      });
      context.setEntity('low-stat-character', lowStatCharacter);

      context.setTemporary('training-request-params', {
        characterId: 'low-stat-character',
        trainingType: 'level_advancement',
        targetLevel: 9,
      });

      const result = await trainingRule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Prime requisite ability score too low');
    });
  });

  describe('Training Duration and Costs', () => {
    it('should calculate training for higher levels', async () => {
      context.setTemporary('training-request-params', {
        characterId: 'test-character',
        trainingType: 'level_advancement',
        targetLevel: 3,
      });

      const result = await trainingRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Training completed successfully');
    });

    it('should handle training with sufficient resources', async () => {
      context.setTemporary('training-request-params', {
        characterId: 'test-character',
        trainingType: 'level_advancement',
        targetLevel: 3,
      });

      const result = await trainingRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
    });
  });

  describe('Skill and Ability Training', () => {
    it('should handle new skill training', async () => {
      context.setTemporary('training-request-params', {
        characterId: 'test-character',
        trainingType: 'new_skill',
        skillType: 'weapon_proficiency',
      });

      const result = await trainingRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
    });

    it('should handle skill improvement training', async () => {
      context.setTemporary('training-request-params', {
        characterId: 'test-character',
        trainingType: 'skill_improvement',
        skillType: 'language',
      });

      const result = await trainingRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
    });
  });

  describe('Spellcaster Training', () => {
    it('should handle training for spellcasters', async () => {
      const wizardCharacter = createMockCharacter({
        id: 'wizard-char',
        name: 'Gandalf',
        level: 5,
        class: 'Magic-User',
        currency: { platinum: 0, gold: 5000, electrum: 0, silver: 0, copper: 0 },
      });
      context.setEntity('wizard-char', wizardCharacter);

      context.setTemporary('training-request-params', {
        characterId: 'wizard-char',
        trainingType: 'new_skill',
        skillType: 'spell_learning',
      });

      const result = await trainingRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing training data', async () => {
      context.setTemporary('training-request-params', null);

      const result = await trainingRule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('No training request data provided');
    });

    it('should handle missing character', async () => {
      context.setTemporary('training-request-params', {
        characterId: 'nonexistent-character',
        trainingType: 'level_advancement',
        targetLevel: 2,
      });

      const result = await trainingRule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Character not found');
    });
  });

  describe('Training Completion', () => {
    it('should complete basic training successfully', async () => {
      context.setTemporary('training-request-params', {
        characterId: 'test-character',
        trainingType: 'level_advancement',
        targetLevel: 3,
      });

      const result = await trainingRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Training completed successfully');
    });

    it('should handle different training types', async () => {
      context.setTemporary('training-request-params', {
        characterId: 'test-character',
        trainingType: 'new_skill',
        skillType: 'general',
      });

      const result = await trainingRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
    });
  });
});
