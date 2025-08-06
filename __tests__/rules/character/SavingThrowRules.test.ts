/**
 * SavingThrowRules Tests - OSRIC Compliance
 *
 * Tests the SavingThrowRule for proper OSRIC saving throw mechanics:
 * - OSRIC saving throw table progressions for all classes
 * - Ability score modifiers (Con/Wis/Dex) application
 * - Multi-class best save calculation
 * - Special class abilities and immunities
 * - Racial bonuses and resistances
 * - Situational modifier stacking
 * - Validation of save attempts and restrictions
 * - Edge cases and error scenarios
 */

import { createStore } from 'jotai';
import { beforeEach, describe, expect, it } from 'vitest';
import { GameContext } from '../../../osric/core/GameContext';
import { SavingThrowRule } from '../../../osric/rules/character/SavingThrowRules';
import type { Character } from '../../../osric/types/entities';

// Mock helper function to create test characters
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

// Mock command for testing
class MockSavingThrowCommand {
  readonly type = 'saving-throw';
  readonly actorId = 'test-character';
  readonly targetIds: string[] = [];

  async execute(_context: GameContext) {
    return { success: true, message: 'Mock saving throw command executed' };
  }

  canExecute(_context: GameContext): boolean {
    return true;
  }

  getRequiredRules(): string[] {
    return ['saving-throws'];
  }

  getInvolvedEntities(): string[] {
    return [this.actorId, ...this.targetIds];
  }
}

describe('SavingThrowRules', () => {
  let context: GameContext;
  let savingThrowRule: SavingThrowRule;
  let mockCommand: MockSavingThrowCommand;

  beforeEach(() => {
    const store = createStore();
    context = new GameContext(store);
    savingThrowRule = new SavingThrowRule();
    mockCommand = new MockSavingThrowCommand();

    // Setup test character
    const testCharacter = createMockCharacter({
      id: 'test-character',
      name: 'Test Hero',
      class: 'Fighter',
      experience: { current: 0, requiredForNextLevel: 2000, level: 3 },
      abilities: {
        strength: 14,
        dexterity: 12,
        constitution: 16, // High constitution for poison save bonus
        intelligence: 10,
        wisdom: 15, // High wisdom for mental save bonus
        charisma: 11,
      },
    });

    context.setEntity('test-character', testCharacter);
  });

  describe('Rule Application', () => {
    it('should apply to saving-throw commands', () => {
      const result = savingThrowRule.canApply(context, mockCommand);
      expect(result).toBe(true);
    });

    it('should not apply to other command types', () => {
      class OtherCommand {
        readonly type = 'attack';
        readonly actorId = 'test-character';
        readonly targetIds: string[] = [];

        async execute(_context: GameContext) {
          return { success: true, message: 'Mock other command executed' };
        }

        canExecute(_context: GameContext): boolean {
          return true;
        }

        getRequiredRules(): string[] {
          return ['attack'];
        }

        getInvolvedEntities(): string[] {
          return [this.actorId, ...this.targetIds];
        }
      }

      const otherCommand = new OtherCommand();
      const result = savingThrowRule.canApply(context, otherCommand);
      expect(result).toBe(false);
    });
  });

  describe('OSRIC Saving Throw Tables', () => {
    it('should calculate Fighter saving throws correctly', async () => {
      const fighter = createMockCharacter({
        class: 'Fighter',
        experience: { current: 0, requiredForNextLevel: 2000, level: 1 },
      });
      context.setEntity('test-character', fighter);

      context.setTemporary('saving-throw-params', {
        characterId: 'test-character',
        saveType: 'paralyzation-poison-death',
      });

      const result = await savingThrowRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.baseSave).toBe(16); // Fighter level 1 poison save
      expect(result.data?.characterId).toBe('test-character');
    });

    it('should calculate Cleric saving throws correctly', async () => {
      const cleric = createMockCharacter({
        class: 'Cleric',
        experience: { current: 0, requiredForNextLevel: 1550, level: 2 },
      });
      context.setEntity('test-character', cleric);

      context.setTemporary('saving-throw-params', {
        characterId: 'test-character',
        saveType: 'spell',
      });

      const result = await savingThrowRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.baseSave).toBe(14); // Cleric level 2 spell save
    });

    it('should calculate Magic-User saving throws correctly', async () => {
      const magicUser = createMockCharacter({
        class: 'Magic-User',
        experience: { current: 0, requiredForNextLevel: 2500, level: 3 },
      });
      context.setEntity('test-character', magicUser);

      context.setTemporary('saving-throw-params', {
        characterId: 'test-character',
        saveType: 'rod-staff-wand',
      });

      const result = await savingThrowRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.baseSave).toBe(10); // Magic-User level 3 rod/staff/wand save
    });

    it('should calculate Thief saving throws correctly', async () => {
      const thief = createMockCharacter({
        class: 'Thief',
        experience: { current: 0, requiredForNextLevel: 1250, level: 4 },
      });
      context.setEntity('test-character', thief);

      context.setTemporary('saving-throw-params', {
        characterId: 'test-character',
        saveType: 'breath-weapon',
      });

      const result = await savingThrowRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.baseSave).toBe(14); // Thief level 4 breath weapon save
    });
  });

  describe('Multi-Class Saving Throws', () => {
    it('should use best save for multi-class characters', async () => {
      const multiClass = createMockCharacter({
        class: 'Fighter', // Primary class
        experience: { current: 0, requiredForNextLevel: 2500, level: 3 },
      });
      // Multi-class characters use the classes property to track multiple classes
      multiClass.classes = { Fighter: 3, Thief: 2 };
      context.setEntity('test-character', multiClass);

      context.setTemporary('saving-throw-params', {
        characterId: 'test-character',
        saveType: 'rod-staff-wand',
      });

      const result = await savingThrowRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.modifiers).toContainEqual(
        expect.objectContaining({ source: 'multi-class' })
      );
    });
  });

  describe('Ability Score Modifiers', () => {
    it('should apply Constitution modifier to poison saves', async () => {
      const character = createMockCharacter({
        abilities: { ...createMockCharacter().abilities, constitution: 17 },
      });
      context.setEntity('test-character', character);

      context.setTemporary('saving-throw-params', {
        characterId: 'test-character',
        saveType: 'paralyzation-poison-death',
      });

      const result = await savingThrowRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.modifiers).toContainEqual(
        expect.objectContaining({ source: 'abilities' })
      );
    });

    it('should apply Wisdom modifier to mental saves', async () => {
      const character = createMockCharacter({
        abilities: { ...createMockCharacter().abilities, wisdom: 16 },
      });
      context.setEntity('test-character', character);

      context.setTemporary('saving-throw-params', {
        characterId: 'test-character',
        saveType: 'spell',
      });

      const result = await savingThrowRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.modifiers).toContainEqual(
        expect.objectContaining({ source: 'abilities' })
      );
    });

    it('should apply Dexterity modifier to breath weapon saves', async () => {
      const character = createMockCharacter({
        abilities: { ...createMockCharacter().abilities, dexterity: 17 },
      });
      context.setEntity('test-character', character);

      context.setTemporary('saving-throw-params', {
        characterId: 'test-character',
        saveType: 'breath-weapon',
      });

      const result = await savingThrowRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.modifiers).toContainEqual(
        expect.objectContaining({ source: 'abilities' })
      );
    });

    it('should handle low ability scores with penalties', async () => {
      const character = createMockCharacter({
        abilities: { ...createMockCharacter().abilities, constitution: 6 },
      });
      context.setEntity('test-character', character);

      context.setTemporary('saving-throw-params', {
        characterId: 'test-character',
        saveType: 'paralyzation-poison-death',
      });

      const result = await savingThrowRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.modifiers).toContainEqual(
        expect.objectContaining({ source: 'abilities' })
      );
    });
  });

  describe('Special Class Abilities', () => {
    it('should handle Paladin bonuses', async () => {
      const paladin = createMockCharacter({
        class: 'Paladin',
        experience: { current: 0, requiredForNextLevel: 2750, level: 3 },
      });
      context.setEntity('test-character', paladin);

      context.setTemporary('saving-throw-params', {
        characterId: 'test-character',
        saveType: 'spell',
      });

      const result = await savingThrowRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.specialRules).toContain('+2 bonus to all saving throws');
    });

    it('should handle Paladin disease immunity', async () => {
      const paladin = createMockCharacter({
        class: 'Paladin',
        experience: { current: 0, requiredForNextLevel: 2750, level: 5 },
      });
      context.setEntity('test-character', paladin);

      context.setTemporary('saving-throw-params', {
        characterId: 'test-character',
        saveType: 'paralyzation-poison-death',
      });

      const result = await savingThrowRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.specialRules).toContain('Immune to disease');
    });

    it('should handle Monk immunities', async () => {
      const monk = createMockCharacter({
        class: 'Monk',
        experience: { current: 0, requiredForNextLevel: 2250, level: 9 },
      });
      context.setEntity('test-character', monk);

      context.setTemporary('saving-throw-params', {
        characterId: 'test-character',
        saveType: 'paralyzation-poison-death',
      });

      const result = await savingThrowRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.specialRules).toContain('Immune to poison');
    });
  });

  describe('Racial Bonuses', () => {
    it('should handle Dwarf magic resistance', async () => {
      const dwarf = createMockCharacter({
        race: 'Dwarf',
        class: 'Fighter',
        abilities: { ...createMockCharacter().abilities, constitution: 17 },
      });
      context.setEntity('test-character', dwarf);

      context.setTemporary('saving-throw-params', {
        characterId: 'test-character',
        saveType: 'rod-staff-wand',
      });

      const result = await savingThrowRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.specialRules).toContain('Dwarven resistance to magic');
    });

    it('should handle Halfling magic resistance', async () => {
      const halfling = createMockCharacter({
        race: 'Halfling',
        class: 'Thief',
        abilities: { ...createMockCharacter().abilities, dexterity: 18 },
      });
      context.setEntity('test-character', halfling);

      context.setTemporary('saving-throw-params', {
        characterId: 'test-character',
        saveType: 'spell',
      });

      const result = await savingThrowRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.specialRules).toContain('Halfling resistance to magic');
    });
  });

  describe('Situational Modifiers', () => {
    it('should apply magic item bonuses', async () => {
      context.setTemporary('saving-throw-params', {
        characterId: 'test-character',
        saveType: 'spell',
        situationalModifiers: {
          magicItemBonus: 2,
        },
      });

      const result = await savingThrowRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.modifiers).toContainEqual(
        expect.objectContaining({ source: 'magic-items' })
      );
    });

    it('should apply spell bonuses', async () => {
      context.setTemporary('saving-throw-params', {
        characterId: 'test-character',
        saveType: 'paralyzation-poison-death',
        situationalModifiers: {
          spellBonus: 1,
        },
      });

      const result = await savingThrowRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.modifiers).toContainEqual(expect.objectContaining({ source: 'spells' }));
    });

    it('should apply racial bonuses', async () => {
      context.setTemporary('saving-throw-params', {
        characterId: 'test-character',
        saveType: 'rod-staff-wand',
        situationalModifiers: {
          racialBonus: 4, // Dwarf vs magic
        },
      });

      const result = await savingThrowRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.modifiers).toContainEqual(expect.objectContaining({ source: 'racial' }));
    });

    it('should apply difficulty modifiers', async () => {
      context.setTemporary('saving-throw-params', {
        characterId: 'test-character',
        saveType: 'breath-weapon',
        situationalModifiers: {
          difficulty: 'hard',
        },
      });

      const result = await savingThrowRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.modifiers).toContainEqual(
        expect.objectContaining({ source: 'difficulty' })
      );
    });

    it('should handle target number override', async () => {
      context.setTemporary('saving-throw-params', {
        characterId: 'test-character',
        saveType: 'spell',
        targetNumber: 12,
      });

      const result = await savingThrowRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.modifiers).toContainEqual(
        expect.objectContaining({ source: 'override' })
      );
    });
  });

  describe('OSRIC Compliance Features', () => {
    it('should enforce saving throw range limits (2-20)', async () => {
      context.setTemporary('saving-throw-params', {
        characterId: 'test-character',
        saveType: 'spell',
        situationalModifiers: {
          magicItemBonus: -20, // Extreme bonus that would push below 2
        },
      });

      const result = await savingThrowRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.finalSave).toBeGreaterThanOrEqual(2);
      expect(result.data?.finalSave).toBeLessThanOrEqual(20);
    });

    it('should include natural 1/20 rule reminder', async () => {
      context.setTemporary('saving-throw-params', {
        characterId: 'test-character',
        saveType: 'spell',
      });

      const result = await savingThrowRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.specialRules).toContain(
        'Natural 1 always fails, natural 20 always succeeds'
      );
    });

    it('should handle class variants (Paladin as Fighter, etc.)', async () => {
      const ranger = createMockCharacter({
        class: 'Ranger',
        experience: { current: 0, requiredForNextLevel: 2250, level: 3 },
      });
      context.setEntity('test-character', ranger);

      context.setTemporary('saving-throw-params', {
        characterId: 'test-character',
        saveType: 'paralyzation-poison-death',
      });

      const result = await savingThrowRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.baseSave).toBeDefined(); // Should use Fighter table
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing saving throw data', async () => {
      const result = await savingThrowRule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('No saving throw data provided');
    });

    it('should handle missing character', async () => {
      context.setTemporary('saving-throw-params', {
        characterId: 'nonexistent-character',
        saveType: 'spell',
      });

      const result = await savingThrowRule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Character nonexistent-character not found');
    });

    it('should handle unconscious characters', async () => {
      const unconsciousCharacter = createMockCharacter({
        hitPoints: { current: 0, maximum: 10 },
      });
      context.setEntity('test-character', unconsciousCharacter);

      context.setTemporary('saving-throw-params', {
        characterId: 'test-character',
        saveType: 'spell',
      });

      const result = await savingThrowRule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Cannot make saving throws while unconscious or dead');
    });

    it('should handle invalid save types gracefully', async () => {
      context.setTemporary('saving-throw-params', {
        characterId: 'test-character',
        saveType: 'invalid-save-type',
      });

      const result = await savingThrowRule.execute(context, mockCommand);

      expect(result.success).toBe(true); // Rule should handle invalid types gracefully
      expect(result.data?.baseSave).toBe(20); // Default high save
    });

    it('should handle extreme ability scores', async () => {
      const extremeCharacter = createMockCharacter({
        abilities: {
          ...createMockCharacter().abilities,
          constitution: 25, // Beyond normal range
          wisdom: 3, // Very low wisdom
        },
      });
      context.setEntity('test-character', extremeCharacter);

      context.setTemporary('saving-throw-params', {
        characterId: 'test-character',
        saveType: 'paralyzation-poison-death',
      });

      const result = await savingThrowRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.modifiers).toBeDefined();
    });

    it('should handle high level characters', async () => {
      const highLevelCharacter = createMockCharacter({
        class: 'Fighter',
        experience: { current: 250000, requiredForNextLevel: 500000, level: 25 },
      });
      context.setEntity('test-character', highLevelCharacter);

      context.setTemporary('saving-throw-params', {
        characterId: 'test-character',
        saveType: 'paralyzation-poison-death',
      });

      const result = await savingThrowRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.baseSave).toBeDefined(); // Should cap at level 20 tables
    });

    it('should handle exceptions gracefully', async () => {
      // Trigger an exception by providing malformed data
      context.setTemporary('saving-throw-params', {
        characterId: 'test-character',
        saveType: null, // Will cause an error
      });

      const result = await savingThrowRule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid save type');
    });
  });
});
