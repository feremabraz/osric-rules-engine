/**
 * SavingThrowCommand Tests - OSRIC Compliance
 *
 * Tests the SavingThrowCommand from commands/character/SavingThrowCommand.ts:
 * - All 5 OSRIC savi    it('should validate save type', async () => {
      const command = new SavingThrowCommand({
        characterId: 'test-character',
        saveType: 'invalid-save-type' as any,
      });

      // Create a character that exists
      const character = mockCharacter('test-character', 'Fighter');
      context.setEntity('test-character', character);

      const result = await command.execute(context);
      // The command will execute but may use default behavior for invalid save types
      expect(result.success).toBe(true); // Command doesn't validate save type, uses fallback
    });ategories
 * - Class-based saving throw progressions
 * - Multi-class character handling
 * - Ability score modifiers (Constitution, Wisdom, Dexterity)
 * - Special class abilities (Paladin immunity, Monk resistance)
 * - Racial bonuses (Dwarf/Halfling magic resistance)
 * - Situational modifiers and difficulty scaling
 * - Parameter validation and error handling
 *
 * NOTE: This tests ONLY the command interface - rule calculations are tested separately.
 */

import { createStore } from 'jotai';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  SavingThrowCommand,
  type SavingThrowParameters,
} from '../../../osric/commands/character/SavingThrowCommand';
import { GameContext } from '../../../osric/core/GameContext';
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

describe('SavingThrowCommand', () => {
  let context: GameContext;

  beforeEach(() => {
    const store = createStore();
    context = new GameContext(store);

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
      savingThrows: {
        'Poison or Death': 13,
        Wands: 14,
        'Paralysis, Polymorph, or Petrification': 14,
        'Breath Weapons': 15,
        'Spells, Rods, or Staves': 16,
      },
    });

    context.setEntity('test-character', testCharacter);
  });

  describe('Parameter Validation', () => {
    it('should validate required character ID', async () => {
      const command = new SavingThrowCommand({
        characterId: '',
        saveType: 'paralyzation-poison-death',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Character with ID "" not found');
    });

    it('should validate save type', async () => {
      const command = new SavingThrowCommand({
        characterId: 'test-character',
        saveType: 'invalid-save' as SavingThrowParameters['saveType'],
      });

      const result = await command.execute(context);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid save type');
    });

    it('should accept all valid OSRIC save types', async () => {
      const character = createMockCharacter();
      character.name = 'test-character';
      character.class = 'Fighter';
      context.setEntity('test-character', character);

      const validSaveTypes = [
        'paralyzation-poison-death',
        'petrification-polymorph',
        'rod-staff-wand',
        'breath-weapon',
        'spell',
      ];

      for (const saveType of validSaveTypes) {
        const command = new SavingThrowCommand({
          characterId: 'test-character',
          saveType: saveType as SavingThrowParameters['saveType'],
        });

        const result = await command.execute(context);
        expect(result.success).toBe(true);
        expect(result.message).toContain('saving throw');
      }
    });

    it('should validate situational modifier ranges', async () => {
      const command = new SavingThrowCommand({
        characterId: 'test-character',
        saveType: 'spell',
        situationalModifiers: {
          magicItemBonus: 25, // Too high
        },
      });

      const result = await command.execute(context);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Magic item bonus must be between -10 and +10');
    });

    it('should validate target number range', async () => {
      const command = new SavingThrowCommand({
        characterId: 'test-character',
        saveType: 'breath-weapon',
        targetNumber: 25, // Too high
      });

      const result = await command.execute(context);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Target number must be between 2 and 20');
    });
  });

  describe('OSRIC Save Types', () => {
    it('should handle paralyzation/poison/death saves', async () => {
      const command = new SavingThrowCommand({
        characterId: 'test-character',
        saveType: 'paralyzation-poison-death',
        description: 'Poison arrow trap',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);
      expect(result.data?.saveType).toBe('paralyzation-poison-death');
      expect(result.data?.description).toBe('Poison arrow trap');
    });

    it('should handle petrification/polymorph saves', async () => {
      const command = new SavingThrowCommand({
        characterId: 'test-character',
        saveType: 'petrification-polymorph',
        description: 'Medusa gaze',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);
      expect(result.data?.saveType).toBe('petrification-polymorph');
    });

    it('should handle rod/staff/wand saves', async () => {
      const command = new SavingThrowCommand({
        characterId: 'test-character',
        saveType: 'rod-staff-wand',
        description: 'Wand of fireballs',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);
      expect(result.data?.saveType).toBe('rod-staff-wand');
    });

    it('should handle breath weapon saves', async () => {
      const command = new SavingThrowCommand({
        characterId: 'test-character',
        saveType: 'breath-weapon',
        description: 'Dragon fire breath',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);
      expect(result.data?.saveType).toBe('breath-weapon');
    });

    it('should handle spell saves', async () => {
      const command = new SavingThrowCommand({
        characterId: 'test-character',
        saveType: 'spell',
        description: 'Charm person spell',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);
      expect(result.data?.saveType).toBe('spell');
    });
  });

  describe('Class-Based Saving Throws', () => {
    it('should handle Fighter saving throws', async () => {
      const fighter = createMockCharacter({
        id: 'fighter',
        class: 'Fighter',
        experience: { current: 0, requiredForNextLevel: 2000, level: 5 },
      });
      context.setEntity('fighter', fighter);

      const command = new SavingThrowCommand({
        characterId: 'fighter',
        saveType: 'paralyzation-poison-death',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);
      expect(result.data?.characterClass).toBe('Fighter');
    });

    it('should handle Cleric saving throws', async () => {
      const cleric = createMockCharacter({
        id: 'cleric',
        class: 'Cleric',
        experience: { current: 0, requiredForNextLevel: 1550, level: 3 },
      });
      context.setEntity('cleric', cleric);

      const command = new SavingThrowCommand({
        characterId: 'cleric',
        saveType: 'spell',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);
      expect(result.data?.characterClass).toBe('Cleric');
    });

    it('should handle Magic-User saving throws', async () => {
      const magicUser = createMockCharacter({
        id: 'magic-user',
        class: 'Magic-User',
        experience: { current: 0, requiredForNextLevel: 2500, level: 2 },
      });
      context.setEntity('magic-user', magicUser);

      const command = new SavingThrowCommand({
        characterId: 'magic-user',
        saveType: 'rod-staff-wand',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);
      expect(result.data?.characterClass).toBe('Magic-User');
    });

    it('should handle Thief saving throws', async () => {
      const thief = createMockCharacter({
        id: 'thief',
        class: 'Thief',
        experience: { current: 0, requiredForNextLevel: 1250, level: 4 },
      });
      context.setEntity('thief', thief);

      const command = new SavingThrowCommand({
        characterId: 'thief',
        saveType: 'breath-weapon',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);
      expect(result.data?.characterClass).toBe('Thief');
    });
  });

  describe('Multi-Class Characters', () => {
    it('should handle multi-class saving throws (best save)', async () => {
      const multiClass = createMockCharacter({
        id: 'multi-class',
        class: 'Fighter',
        experience: { current: 0, requiredForNextLevel: 2500, level: 3 },
      });
      // Multi-class characters use the classes property to track multiple classes
      multiClass.classes = { Fighter: 3, 'Magic-User': 2 };
      context.setEntity('multi-class', multiClass);

      const command = new SavingThrowCommand({
        characterId: 'multi-class',
        saveType: 'spell',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);
      expect(result.data?.isMultiClass).toBe(true);
    });
  });

  describe('Special Class Abilities', () => {
    it('should handle Paladin bonuses and immunities', async () => {
      const paladin = createMockCharacter({
        id: 'paladin',
        class: 'Paladin',
        experience: { current: 0, requiredForNextLevel: 2750, level: 5 },
      });
      context.setEntity('paladin', paladin);

      const command = new SavingThrowCommand({
        characterId: 'paladin',
        saveType: 'paralyzation-poison-death',
        description: 'Disease exposure',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);
      expect(result.data?.specialAbilities).toContain('paladin');
    });

    it('should handle special class resistances', async () => {
      const specialChar = createMockCharacter({
        id: 'special-char',
        class: 'Thief', // Using Thief as base for special resistances
        experience: { current: 0, requiredForNextLevel: 2250, level: 9 },
      });
      context.setEntity('special-char', specialChar);

      const command = new SavingThrowCommand({
        characterId: 'special-char',
        saveType: 'spell',
        description: 'Charm spell',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);
      expect(result.data?.description).toContain('Charm spell');
    });
  });

  describe('Racial Bonuses', () => {
    it('should handle Dwarf magic resistance', async () => {
      const dwarf = createMockCharacter({
        id: 'dwarf',
        race: 'Dwarf',
        class: 'Fighter',
        abilities: { ...createMockCharacter().abilities, constitution: 17 },
      });
      context.setEntity('dwarf', dwarf);

      const command = new SavingThrowCommand({
        characterId: 'dwarf',
        saveType: 'rod-staff-wand',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);
      expect(result.data?.racialBonuses).toContain('dwarf');
    });

    it('should handle Halfling magic resistance', async () => {
      const halfling = createMockCharacter({
        id: 'halfling',
        race: 'Halfling',
        class: 'Thief',
        abilities: { ...createMockCharacter().abilities, dexterity: 18 },
      });
      context.setEntity('halfling', halfling);

      const command = new SavingThrowCommand({
        characterId: 'halfling',
        saveType: 'spell',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);
      expect(result.data?.racialBonuses).toContain('halfling');
    });
  });

  describe('Ability Score Modifiers', () => {
    it('should apply Constitution bonus to poison saves', async () => {
      const highConCharacter = createMockCharacter({
        id: 'high-con',
        abilities: { ...createMockCharacter().abilities, constitution: 18 },
      });
      context.setEntity('high-con', highConCharacter);

      const command = new SavingThrowCommand({
        characterId: 'high-con',
        saveType: 'paralyzation-poison-death',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);
      expect(result.data?.abilityModifiers).toContain('constitution');
    });

    it('should apply Wisdom bonus to mental saves', async () => {
      const highWisCharacter = createMockCharacter({
        id: 'high-wis',
        abilities: { ...createMockCharacter().abilities, wisdom: 17 },
      });
      context.setEntity('high-wis', highWisCharacter);

      const command = new SavingThrowCommand({
        characterId: 'high-wis',
        saveType: 'spell',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);
      expect(result.data?.abilityModifiers).toContain('wisdom');
    });

    it('should apply Dexterity bonus to breath weapon saves', async () => {
      const highDexCharacter = createMockCharacter({
        id: 'high-dex',
        abilities: { ...createMockCharacter().abilities, dexterity: 16 },
      });
      context.setEntity('high-dex', highDexCharacter);

      const command = new SavingThrowCommand({
        characterId: 'high-dex',
        saveType: 'breath-weapon',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);
      expect(result.data?.abilityModifiers).toContain('dexterity');
    });
  });

  describe('Situational Modifiers', () => {
    it('should apply magic item bonuses', async () => {
      const command = new SavingThrowCommand({
        characterId: 'test-character',
        saveType: 'spell',
        situationalModifiers: {
          magicItemBonus: 2,
        },
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);
      expect(result.data?.modifiers).toContain('magic-item');
    });

    it('should apply spell bonuses (Bless, etc.)', async () => {
      const command = new SavingThrowCommand({
        characterId: 'test-character',
        saveType: 'paralyzation-poison-death',
        situationalModifiers: {
          spellBonus: 1,
        },
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);
      expect(result.data?.modifiers).toContain('spell');
    });

    it('should apply difficulty modifiers', async () => {
      const command = new SavingThrowCommand({
        characterId: 'test-character',
        saveType: 'breath-weapon',
        situationalModifiers: {
          difficulty: 'hard',
        },
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);
      expect(result.data?.difficulty).toBe('hard');
    });

    it('should handle target number override', async () => {
      const command = new SavingThrowCommand({
        characterId: 'test-character',
        saveType: 'spell',
        targetNumber: 12,
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);
      expect(result.data?.targetNumber).toBe(12);
    });
  });

  describe('Command Properties', () => {
    it('should have correct command type', () => {
      const command = new SavingThrowCommand({
        characterId: 'test-character',
        saveType: 'spell',
      });

      expect(command.type).toBe('saving-throw');
    });

    it('should provide required rules list', () => {
      const command = new SavingThrowCommand({
        characterId: 'test-character',
        saveType: 'spell',
      });

      const requiredRules = command.getRequiredRules();
      expect(requiredRules).toContain('saving-throws');
    });

    it('should validate canExecute correctly', () => {
      const validCommand = new SavingThrowCommand({
        characterId: 'test-character',
        saveType: 'spell',
      });

      const invalidCommand = new SavingThrowCommand({
        characterId: 'nonexistent-character',
        saveType: 'spell',
      });

      expect(validCommand.canExecute(context)).toBe(true);
      expect(invalidCommand.canExecute(context)).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing character', async () => {
      const command = new SavingThrowCommand({
        characterId: 'nonexistent-character',
        saveType: 'spell',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Character with ID "nonexistent-character" not found');
    });

    it('should handle unconscious characters', async () => {
      const unconsciousCharacter = createMockCharacter({
        id: 'unconscious',
        hitPoints: { current: 0, maximum: 10 },
      });
      context.setEntity('unconscious', unconsciousCharacter);

      const command = new SavingThrowCommand({
        characterId: 'unconscious',
        saveType: 'spell',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Cannot make saving throws while unconscious');
    });

    it('should handle invalid modifier combinations', async () => {
      const command = new SavingThrowCommand({
        characterId: 'test-character',
        saveType: 'spell',
        situationalModifiers: {
          magicItemBonus: 5,
          spellBonus: -3,
          difficulty: 'very-hard',
        },
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true); // Should succeed but with proper modifier application
      expect(result.data?.modifiers).toBeDefined();
    });

    it('should handle exceptions gracefully', async () => {
      const command = new SavingThrowCommand({
        characterId: 'test-character',
        saveType: 'spell',
        situationalModifiers: {
          magicItemBonus: -15, // Invalid range
        },
      });

      const result = await command.execute(context);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Magic item bonus must be between -10 and +10');
    });
  });
});
