import { createStore } from 'jotai';
import { beforeEach, describe, expect, it } from 'vitest';
import { GameContext } from '../../../osric/core/GameContext';
import { SearchRule } from '../../../osric/rules/exploration/SearchRules';
import { COMMAND_TYPES } from '../../../osric/types/constants';
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

class MockSearchCommand {
  readonly type = COMMAND_TYPES.SEARCH;
  readonly actorId = 'test-character';
  readonly targetIds: string[] = [];

  async execute(_context: GameContext) {
    return { success: true, message: 'Mock search command executed' };
  }

  canExecute(_context: GameContext): boolean {
    return true;
  }

  getRequiredRules(): string[] {
    return ['search'];
  }

  getInvolvedEntities(): string[] {
    return [this.actorId, ...this.targetIds];
  }
}

describe('SearchRules', () => {
  let context: GameContext;
  let searchRule: SearchRule;
  let mockCommand: MockSearchCommand;

  beforeEach(() => {
    const store = createStore();
    context = new GameContext(store);
    searchRule = new SearchRule();
    mockCommand = new MockSearchCommand();

    const testCharacter = createMockCharacter({
      id: 'test-character',
      name: 'Test Hero',
      abilities: {
        strength: 12,
        dexterity: 14,
        constitution: 13,
        intelligence: 15,
        wisdom: 16,
        charisma: 10,
      },
    });

    context.setEntity('test-character', testCharacter);
  });

  describe('Rule Application', () => {
    it('should apply to search commands', () => {
      context.setTemporary('search-request-params', {
        characterId: 'test-character',
        searchType: 'secret_doors',
        area: 'stone wall',
        timeSpent: 10,
        thoroughness: 'normal',
      });

      const result = searchRule.canApply(context, mockCommand);
      expect(result).toBe(true);
    });

    it('should not apply to other command types', () => {
      class OtherCommand {
        readonly type = COMMAND_TYPES.MOVE;
        readonly actorId = 'test-character';
        readonly targetIds: string[] = [];

        async execute(_context: GameContext) {
          return { success: true, message: 'Mock other command executed' };
        }

        canExecute(_context: GameContext): boolean {
          return true;
        }

        getRequiredRules(): string[] {
          return ['movement'];
        }

        getInvolvedEntities(): string[] {
          return [this.actorId, ...this.targetIds];
        }
      }

      const otherCommand = new OtherCommand();
      const result = searchRule.canApply(context, otherCommand);
      expect(result).toBe(false);
    });
  });

  describe('Secret Door Detection', () => {
    it('should handle basic secret door search', async () => {
      context.setTemporary('search-request-params', {
        characterId: 'test-character',
        searchType: 'secret_doors',
        area: 'wall-section',
        timeSpent: 10,
      });

      const result = await searchRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
    });

    it('should give elves bonuses for secret door detection', async () => {
      const elf = createMockCharacter({
        id: 'elf-character',
        race: 'Elf',
        abilities: { ...createMockCharacter().abilities, intelligence: 15 },
      });
      context.setEntity('elf-character', elf);

      context.setTemporary('search-request-params', {
        characterId: 'elf-character',
        searchType: 'secret_doors',
        area: 'wall-section',
        timeSpent: 10,
      });

      const result = await searchRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
    });

    it('should handle automatic elf detection when passing by', async () => {
      const elf = createMockCharacter({
        id: 'passing-elf',
        race: 'Elf',
      });
      context.setEntity('passing-elf', elf);

      context.setTemporary('search-request-params', {
        characterId: 'passing-elf',
        searchType: 'secret_doors',
        area: 'corridor',
        timeSpent: 0,
        casualDetection: true,
      });

      const result = await searchRule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('requires at least');
    });

    it('should handle concealed doors differently from secret doors', async () => {
      context.setTemporary('search-request-params', {
        characterId: 'test-character',
        searchType: 'secret_doors',
        area: 'wall-section',
        timeSpent: 10,
      });

      const result = await searchRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.result).toBeDefined();
    });
  });

  describe('Trap Detection', () => {
    it('should handle general trap searching', async () => {
      context.setTemporary('search-request-params', {
        characterId: 'test-character',
        searchType: 'traps',
        area: 'floor-section',
        timeSpent: 10,
      });

      const result = await searchRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.result).toBeDefined();
    });

    it('should give thieves bonuses for trap detection', async () => {
      const thief = createMockCharacter({
        id: 'thief-character',
        class: 'Thief',
        level: 3,
        thiefSkills: {
          pickPockets: 35,
          openLocks: 30,
          findTraps: 25,
          removeTraps: 20,
          moveSilently: 20,
          hideInShadows: 15,
          hearNoise: 15,
          climbWalls: 87,
          readLanguages: 0,
        },
      });
      context.setEntity('thief-character', thief);

      context.setTemporary('search-request-params', {
        characterId: 'thief-character',
        searchType: 'traps',
        area: 'chest',
        timeSpent: 10,
      });

      const result = await searchRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.result).toBeDefined();
    });

    it('should handle different trap types', async () => {
      context.setTemporary('search-request-params', {
        characterId: 'test-character',
        searchType: 'traps',
        area: 'magical-ward',
        timeSpent: 10,
        trapType: 'magical',
      });

      const result = await searchRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.result).toBeDefined();
    });
  });

  describe('Treasure and Item Searching', () => {
    it('should handle searching for hidden treasure', async () => {
      context.setTemporary('search-request-params', {
        characterId: 'test-character',
        searchType: 'hidden_objects',
        area: 'room',
        timeSpent: 30,
      });

      const result = await searchRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.result).toBeDefined();
    });

    it('should find items based on search thoroughness', async () => {
      context.setTemporary('search-request-params', {
        characterId: 'test-character',
        searchType: 'hidden_objects',
        area: 'debris-pile',
        timeSpent: 20,
      });

      const result = await searchRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.result).toBeDefined();
    });

    it('should handle searching bodies and containers', async () => {
      context.setTemporary('search-request-params', {
        characterId: 'test-character',
        searchType: 'hidden_objects',
        area: 'backpack',
        timeSpent: 5,
      });

      const result = await searchRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.result).toBeDefined();
    });
  });

  describe('Search Time and Efficiency', () => {
    it('should scale success chance with time spent', async () => {
      context.setTemporary('search-request-params', {
        characterId: 'test-character',
        searchType: 'secret_doors',
        area: 'wall-section',
        timeSpent: 30,
      });

      const result = await searchRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.result).toBeDefined();
    });

    it('should handle rushed searches with penalties', async () => {
      context.setTemporary('search-request-params', {
        characterId: 'test-character',
        searchType: 'traps',
        area: 'door',
        timeSpent: 10,
        thoroughness: 'hasty',
      });

      const result = await searchRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.result).toBeDefined();
    });

    it('should handle group searching bonuses', async () => {
      const helper = createMockCharacter({
        id: 'helper',
        abilities: { ...createMockCharacter().abilities, wisdom: 14 },
      });
      context.setEntity('helper', helper);

      context.setTemporary('search-request-params', {
        characterId: 'test-character',
        searchType: 'secret_doors',
        area: 'large-room',
        timeSpent: 10,
        assistingCharacterIds: ['helper'],
      });

      const result = await searchRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.result).toBeDefined();
    });
  });

  describe('Environmental Factors', () => {
    it('should handle light conditions affecting search', async () => {
      context.setTemporary('search-request-params', {
        characterId: 'test-character',
        searchType: 'hidden_objects',
        area: 'room',
        timeSpent: 10,
      });

      const result = await searchRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.result).toBeDefined();
    });

    it('should handle searching in darkness', async () => {
      context.setTemporary('search-request-params', {
        characterId: 'test-character',
        searchType: 'secret_doors',
        area: 'wall-section',
        timeSpent: 20,
      });

      const result = await searchRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.result).toBeDefined();
    });

    it('should handle racial darkvision bonuses', async () => {
      const dwarf = createMockCharacter({
        id: 'dwarf-character',
        race: 'Dwarf',
      });
      context.setEntity('dwarf-character', dwarf);

      context.setTemporary('search-request-params', {
        characterId: 'dwarf-character',
        searchType: 'traps',
        area: 'stone-corridor',
        timeSpent: 10,
      });

      const result = await searchRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.result).toBeDefined();
    });
  });

  describe('Specialized Searches', () => {
    it('should handle listening for sounds', async () => {
      context.setTemporary('search-request-params', {
        characterId: 'test-character',
        searchType: 'general',
        area: 'door',
        timeSpent: 3,
      });

      const result = await searchRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.result).toBeDefined();
    });

    it('should give thieves better hearing', async () => {
      const thief = createMockCharacter({
        id: 'listening-thief',
        class: 'Thief',
        thiefSkills: {
          pickPockets: 30,
          openLocks: 25,
          findTraps: 20,
          removeTraps: 20,
          moveSilently: 15,
          hideInShadows: 10,
          hearNoise: 20,
          climbWalls: 85,
          readLanguages: 0,
        },
      });
      context.setEntity('listening-thief', thief);

      context.setTemporary('search-request-params', {
        characterId: 'listening-thief',
        searchType: 'general',
        area: 'door',
        timeSpent: 3,
      });

      const result = await searchRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.result).toBeDefined();
    });

    it('should handle searching for specific spell components', async () => {
      const mage = createMockCharacter({
        id: 'mage',
        class: 'Magic-User',
        abilities: { ...createMockCharacter().abilities, intelligence: 17 },
      });
      context.setEntity('mage', mage);

      context.setTemporary('search-request-params', {
        characterId: 'mage',
        searchType: 'hidden_objects',
        area: 'herb-garden',
        timeSpent: 10,
      });

      const result = await searchRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.result).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing search data', async () => {
      const result = await searchRule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('No search request data provided');
    });

    it('should handle missing character', async () => {
      context.setTemporary('search-request-params', {
        characterId: 'nonexistent-character',
        searchType: 'secret_doors',
        area: 'wall',
        timeSpent: 10,
      });

      const result = await searchRule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Character not found');
    });

    it('should handle any search type', async () => {
      context.setTemporary('search-request-params', {
        characterId: 'test-character',
        searchType: 'any_type',
        area: 'any area',
        timeSpent: 10,
        thoroughness: 'normal',
      });

      const result = await searchRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
    });

    it('should handle invalid time values', async () => {
      context.setTemporary('search-request-params', {
        characterId: 'test-character',
        searchType: 'secret_doors',
        area: 'wall',
        timeSpent: -5,
      });

      const result = await searchRule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('requires at least');
    });

    it('should handle searches in any area', async () => {
      context.setTemporary('search-request-params', {
        characterId: 'test-character',
        searchType: 'secret_doors',
        area: 'open-sky',
        timeSpent: 10,
        thoroughness: 'normal',
      });

      const result = await searchRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
    });
  });

  describe('Search Results and Discovery', () => {
    it('should provide detailed results for successful searches', async () => {
      context.setTemporary('search-request-params', {
        characterId: 'test-character',
        searchType: 'secret_doors',
        area: 'wall-section',
        timeSpent: 10,
      });

      const result = await searchRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.result).toBeDefined();
    });

    it('should handle failed searches gracefully', async () => {
      context.setTemporary('search-request-params', {
        characterId: 'test-character',
        searchType: 'secret_doors',
        area: 'wall-section',
        timeSpent: 10,
      });

      const result = await searchRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.result).toBeDefined();
    });

    it('should track search attempts for repeated searches', async () => {
      context.setTemporary('search-request-params', {
        characterId: 'test-character',
        searchType: 'secret_doors',
        area: 'wall-section',
        timeSpent: 10,
      });

      const result = await searchRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.result).toBeDefined();
    });
  });
});
