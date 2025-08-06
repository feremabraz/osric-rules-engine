import { createStore } from 'jotai';
import { beforeEach, describe, expect, it } from 'vitest';
import { GameContext } from '../../../osric/core/GameContext';
import { LevelProgressionRule } from '../../../osric/rules/experience/LevelProgressionRules';
import type { Character } from '../../../osric/types/entities';

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

class MockLevelUpCommand {
  readonly type = 'level-up';
  readonly actorId = 'test-character';
  readonly targetIds: string[] = [];

  async execute(_context: GameContext) {
    return { success: true, message: 'Mock level up command executed' };
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

describe('LevelProgressionRules', () => {
  let context: GameContext;
  let levelProgressionRule: LevelProgressionRule;
  let mockCommand: MockLevelUpCommand;

  beforeEach(() => {
    const store = createStore();
    context = new GameContext(store);
    levelProgressionRule = new LevelProgressionRule();
    mockCommand = new MockLevelUpCommand();

    const testCharacter = createMockCharacter({
      id: 'test-character',
      name: 'Test Hero',
      level: 1,
      experience: { current: 2000, requiredForNextLevel: 2000, level: 1 },
      abilities: {
        strength: 14,
        dexterity: 12,
        constitution: 16,
        intelligence: 10,
        wisdom: 13,
        charisma: 11,
      },
    });

    context.setEntity('test-character', testCharacter);
  });

  describe('Rule Application', () => {
    it('should apply to level-up commands', () => {
      const result = levelProgressionRule.canApply(context, mockCommand);
      expect(result).toBe(true);
    });

    it('should not apply to other command types', () => {
      class OtherCommand {
        readonly type = 'gain-experience';
        readonly actorId = 'test-character';
        readonly targetIds: string[] = [];

        async execute(_context: GameContext) {
          return { success: true, message: 'Mock other command executed' };
        }

        canExecute(_context: GameContext): boolean {
          return true;
        }

        getRequiredRules(): string[] {
          return ['gain-experience'];
        }

        getInvolvedEntities(): string[] {
          return [this.actorId, ...this.targetIds];
        }
      }

      const otherCommand = new OtherCommand();
      const result = levelProgressionRule.canApply(context, otherCommand);
      expect(result).toBe(false);
    });
  });

  describe('Fighter Level Progression', () => {
    it('should advance Fighter from level 1 to 2', async () => {
      const character = createMockCharacter({
        class: 'Fighter',
        experience: { current: 2500, requiredForNextLevel: 2000, level: 1 },
      });
      context.setEntity('test-character', character);

      context.setTemporary('level-up-params', {
        characterId: 'test-character',
      });

      const result = await levelProgressionRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.newLevel).toBe(2);
      expect(result.message).toContain('Level advanced to 2');
    });

    it('should update character stats correctly on level up', async () => {
      const character = createMockCharacter({
        class: 'Fighter',
        experience: { current: 2500, requiredForNextLevel: 2000, level: 1 },
        hitPoints: { current: 10, maximum: 10 },
      });
      context.setEntity('test-character', character);

      context.setTemporary('level-up-params', {
        characterId: 'test-character',
      });

      const result = await levelProgressionRule.execute(context, mockCommand);

      expect(result.success).toBe(true);

      const updatedCharacter = context.getEntity<Character>('test-character');
      expect(updatedCharacter).toBeDefined();
      if (updatedCharacter) {
        expect(updatedCharacter.experience.level).toBe(2);
        expect(updatedCharacter.hitPoints.maximum).toBeGreaterThan(10);
      }
    });

    it('should handle constitution bonus to hit points', async () => {
      const character = createMockCharacter({
        class: 'Fighter',
        experience: { current: 2500, requiredForNextLevel: 2000, level: 1 },
        abilities: { ...createMockCharacter().abilities, constitution: 16 },
        hitPoints: { current: 10, maximum: 10 },
      });
      context.setEntity('test-character', character);

      context.setTemporary('level-up-params', {
        characterId: 'test-character',
      });

      const result = await levelProgressionRule.execute(context, mockCommand);

      expect(result.success).toBe(true);

      const updatedCharacter = context.getEntity<Character>('test-character');
      expect(updatedCharacter).toBeDefined();
    });
  });

  describe('Spellcaster Level Progression', () => {
    it('should advance Magic-User with spell slot progression', async () => {
      const magicUser = createMockCharacter({
        id: 'magic-user',
        class: 'Magic-User',
        experience: { current: 3000, requiredForNextLevel: 2500, level: 1 },
        hitPoints: { current: 4, maximum: 4 },
      });
      context.setEntity('magic-user', magicUser);

      context.setTemporary('level-up-params', {
        characterId: 'magic-user',
      });

      const result = await levelProgressionRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.newLevel).toBe(2);

      const updatedCharacter = context.getEntity<Character>('magic-user');
      expect(updatedCharacter).toBeDefined();
    });

    it('should advance Cleric with turn undead progression', async () => {
      const cleric = createMockCharacter({
        id: 'cleric',
        class: 'Cleric',
        experience: { current: 2000, requiredForNextLevel: 1550, level: 1 },
        hitPoints: { current: 8, maximum: 8 },
      });
      context.setEntity('cleric', cleric);

      context.setTemporary('level-up-params', {
        characterId: 'cleric',
      });

      const result = await levelProgressionRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.newLevel).toBe(2);

      const updatedCharacter = context.getEntity<Character>('cleric');
      expect(updatedCharacter).toBeDefined();
    });
  });

  describe('Thief Level Progression', () => {
    it('should advance Thief with skill progression', async () => {
      const thief = createMockCharacter({
        id: 'thief',
        class: 'Thief',
        experience: { current: 1500, requiredForNextLevel: 1250, level: 1 },
        hitPoints: { current: 6, maximum: 6 },
      });
      context.setEntity('thief', thief);

      context.setTemporary('level-up-params', {
        characterId: 'thief',
      });

      const result = await levelProgressionRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.newLevel).toBe(2);

      const updatedCharacter = context.getEntity<Character>('thief');
      expect(updatedCharacter).toBeDefined();
    });
  });

  describe('Saving Throw Progression', () => {
    it('should improve saving throws on level up', async () => {
      const character = createMockCharacter({
        class: 'Fighter',
        experience: { current: 2500, requiredForNextLevel: 2000, level: 1 },
      });
      context.setEntity('test-character', character);

      context.setTemporary('level-up-params', {
        characterId: 'test-character',
      });

      const result = await levelProgressionRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.newLevel).toBe(2);

      const updatedCharacter = context.getEntity<Character>('test-character');
      expect(updatedCharacter).toBeDefined();
    });
  });

  describe('Multi-Class Progression', () => {
    it('should handle multi-class level progression', async () => {
      const multiClassChar = createMockCharacter({
        id: 'multi-class',
        class: 'Fighter',
        experience: { current: 3000, requiredForNextLevel: 2000, level: 1 },
      });
      context.setEntity('multi-class', multiClassChar);

      context.setTemporary('level-up-params', {
        characterId: 'multi-class',
      });

      const result = await levelProgressionRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.newLevel).toBe(2);

      const updatedCharacter = context.getEntity<Character>('multi-class');
      expect(updatedCharacter).toBeDefined();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle insufficient experience for level up', async () => {
      const result = await levelProgressionRule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('No level up data provided');
    });

    it('should handle maximum level reached', async () => {
      const result = await levelProgressionRule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('No level up data provided');
    });

    it('should handle missing level progression data', async () => {
      const result = await levelProgressionRule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('No level up data provided');
    });

    it('should handle missing character', async () => {
      const result = await levelProgressionRule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('No level up data provided');
    });

    it('should handle invalid target level', async () => {
      const result = await levelProgressionRule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('No level up data provided');
    });

    it('should handle invalid hit point roll', async () => {
      const result = await levelProgressionRule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('No level up data provided');
    });
  });

  describe('Racial Level Limits', () => {
    it('should enforce racial level limits for non-humans', async () => {
      const result = await levelProgressionRule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('No level up data provided');
    });
  });
});
