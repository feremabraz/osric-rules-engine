import { findSpellByName } from '@rules/spells/spellList';
import {
  canMemorizeSpell,
  countMemorizedSpellsByLevel,
  forgetSpell,
  getTotalSpellSlots,
  memorizeSpell,
  resetSpellSlots,
} from '@rules/spells/spellMemorization';
import type { AbilityScoreModifiers, Character, Spell } from '@rules/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the spell progression module
vi.mock('../../../rules/spells/spellProgression', () => {
  return {
    getSpellSlots: vi.fn().mockImplementation((_spellClass, level) => {
      if (level >= 5) {
        return { 1: 4, 2: 2, 3: 1 };
      }
      if (level >= 3) {
        return { 1: 2, 2: 1 };
      }
      return { 1: 1 };
    }),
    getBonusSpellsFromWisdom: vi.fn().mockImplementation((wisdom) => {
      if (wisdom >= 16) {
        return { 1: 2, 2: 1 };
      }
      if (wisdom >= 13) {
        return { 1: 1 };
      }
      return {};
    }),
  };
});

describe('Spell Memorization', () => {
  // Test character setup
  let clericCharacter: Character;
  let mageCharacter: Character;

  // Mock spells
  const cureLightWounds = findSpellByName('Cure Light Wounds') as Spell;
  const magicMissile = findSpellByName('Magic Missile') as Spell;

  // Mock ability modifiers
  const mockAbilityModifiers: AbilityScoreModifiers = {
    strengthHitAdj: 0,
    strengthDamageAdj: 0,
    strengthEncumbrance: 0,
    strengthOpenDoors: 0,
    strengthBendBars: 0,
    dexterityReaction: 0,
    dexterityMissile: 0,
    dexterityDefense: 0,
    dexterityPickPockets: 0,
    dexterityOpenLocks: 0,
    dexterityFindTraps: 0,
    dexterityMoveSilently: 0,
    dexterityHideInShadows: 0,
    constitutionHitPoints: 0,
    constitutionSystemShock: 0,
    constitutionResurrectionSurvival: 0,
    constitutionPoisonSave: 0,
    intelligenceLanguages: 0,
    intelligenceLearnSpells: 0,
    intelligenceMaxSpellLevel: 0,
    intelligenceIllusionImmunity: false,
    wisdomMentalSave: 0,
    wisdomBonusSpells: null,
    wisdomSpellFailure: 0,
    charismaReactionAdj: 0,
    charismaLoyaltyBase: 0,
    charismaMaxHenchmen: 0,
  };

  beforeEach(() => {
    // Setup a mock cleric character
    clericCharacter = {
      id: 'test-cleric',
      name: 'Test Cleric',
      race: 'Human',
      class: 'Cleric',
      level: 3,
      abilities: {
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 10,
        wisdom: 16, // High wisdom for bonus spells
        charisma: 10,
      },
      abilityModifiers: mockAbilityModifiers,
      hitPoints: { current: 15, maximum: 15 },
      armorClass: 5,
      thac0: 20,
      savingThrows: {
        'Poison or Death': 10,
        Wands: 11,
        'Paralysis, Polymorph, or Petrification': 12,
        'Breath Weapons': 13,
        'Spells, Rods, or Staves': 14,
      },
      experience: { current: 5000, requiredForNextLevel: 10000, level: 3 },
      alignment: 'Lawful Good',
      inventory: [],
      position: 'standing',
      statusEffects: [],
      memorizedSpells: {},
      spellbook: [],
      spells: [],
      currency: { platinum: 0, gold: 10, electrum: 0, silver: 0, copper: 0 },
      encumbrance: 0,
      movementRate: 12,
      classes: {},
      primaryClass: null,
      spellSlots: { 1: 2, 2: 1 },
      thiefSkills: null,
      turnUndead: null,
      languages: ['Common'],
      age: 25,
      ageCategory: 'Adult',
      henchmen: [],
      racialAbilities: [],
      classAbilities: [],
      proficiencies: [],
      secondarySkills: [],
    };

    // Setup a mock mage character
    mageCharacter = {
      ...clericCharacter,
      id: 'test-mage',
      name: 'Test Mage',
      class: 'Magic-User',
      spellbook: [magicMissile], // Mage has the spell in spellbook
      spellSlots: { 1: 1 },
    };
  });

  describe('canMemorizeSpell', () => {
    it('should return true if character can memorize the spell', () => {
      expect(canMemorizeSpell(clericCharacter, cureLightWounds)).toBe(true);
      expect(canMemorizeSpell(mageCharacter, magicMissile)).toBe(true);
    });

    it('should return false if spell is not available to character class', () => {
      expect(canMemorizeSpell(clericCharacter, magicMissile)).toBe(false);
    });

    it('should return false if mage does not have spell in spellbook', () => {
      const web = findSpellByName('Web') as Spell;
      // Mage doesn't have Web in spellbook
      expect(canMemorizeSpell(mageCharacter, web)).toBe(false);

      // Add Web to spellbook and test again
      mageCharacter.spellbook = [...mageCharacter.spellbook, web];
      expect(canMemorizeSpell(mageCharacter, web)).toBe(true);
    });
  });

  describe('memorizeSpell', () => {
    it('should successfully memorize a spell', () => {
      const result = memorizeSpell(clericCharacter, 'Cure Light Wounds');

      expect(result.success).toBe(true);
      expect(result.memorizedSpells).toBeDefined();
      expect(result.memorizedSpells?.[1]).toHaveLength(1);
      expect(result.memorizedSpells?.[1][0].name).toBe('Cure Light Wounds');
    });

    it('should fail for non-existent spells', () => {
      const result = memorizeSpell(clericCharacter, 'NonExistentSpell');

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });

    it('should respect slot limits when enforced', () => {
      // Create a character with already full spell slots
      // First fill up all the slots by directly setting the memorizedSpells property
      clericCharacter.memorizedSpells = {
        1: [cureLightWounds, cureLightWounds, cureLightWounds, cureLightWounds],
      };

      // Try to memorize another spell
      const result = memorizeSpell(clericCharacter, 'Bless');

      // Verify the error message matches exactly what's in the implementation
      expect(result.success).toBe(false);
      expect(result.message).toBe(
        `${clericCharacter.name} has no available spell slots for level 1 spells.`
      );
    });
  });

  describe('forgetSpell', () => {
    it('should forget a memorized spell', () => {
      // First memorize the spell
      const memResult = memorizeSpell(clericCharacter, 'Cure Light Wounds');
      clericCharacter.memorizedSpells = memResult.memorizedSpells || {};

      // Then forget it
      const forgetResult = forgetSpell(clericCharacter, 'Cure Light Wounds');

      expect(forgetResult.success).toBe(true);
      expect(forgetResult.memorizedSpells?.[1]).toBeUndefined();
    });

    it('should fail to forget a spell not memorized', () => {
      const result = forgetSpell(clericCharacter, 'NonExistentSpell');

      expect(result.success).toBe(false);
      expect(result.message).toContain('does not have');
    });
  });

  describe('countMemorizedSpellsByLevel', () => {
    it('should count spells correctly by level', () => {
      // Memorize level 1 and level 2 spells
      const memResult1 = memorizeSpell(clericCharacter, 'Cure Light Wounds');
      clericCharacter.memorizedSpells = memResult1.memorizedSpells || {};

      const memResult2 = memorizeSpell(clericCharacter, 'Bless');
      clericCharacter.memorizedSpells = memResult2.memorizedSpells || {};

      const counts = countMemorizedSpellsByLevel(clericCharacter);

      expect(counts[1]).toBe(2); // Two level 1 spells
      expect(counts[2]).toBe(0); // No level 2 spells
    });
  });

  describe('getTotalSpellSlots', () => {
    it('should combine base slots with bonus slots from wisdom', () => {
      const slots = getTotalSpellSlots(clericCharacter);

      // Base slots from our mock: { 1: 2, 2: 1 }
      // Bonus from Wisdom 16: { 1: 2, 2: 1 }
      // Combined should be: { 1: 4, 2: 2 }
      expect(slots[1]).toBe(4);
      expect(slots[2]).toBe(2);
    });

    it('should not add bonus slots to spell levels not available', () => {
      // Change character level to 1, so only level 1 spells are available
      clericCharacter.level = 1;

      const slots = getTotalSpellSlots(clericCharacter);

      // Base slots from our mock for level 1: { 1: 1 }
      // Bonus from Wisdom 16: { 1: 2, 2: 1 }
      // But level 2 slots aren't available yet, so only level 1 bonus applies
      expect(slots[1]).toBe(3);
      expect(slots[2]).toBeUndefined();
    });
  });

  describe('resetSpellSlots', () => {
    it('should clear all memorized spells', () => {
      // Memorize some spells first
      const memResult = memorizeSpell(clericCharacter, 'Cure Light Wounds');
      clericCharacter.memorizedSpells = memResult.memorizedSpells || {};

      // Reset spell slots
      const resetChar = resetSpellSlots(clericCharacter);

      expect(Object.keys(resetChar.memorizedSpells).length).toBe(0);
    });
  });
});
