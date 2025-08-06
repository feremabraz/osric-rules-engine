import { createStore } from 'jotai';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameContext } from '../../../osric/core/GameContext';
import { SpellProgressionRules } from '../../../osric/rules/spells/SpellProgressionRules';
import { RULE_NAMES } from '../../../osric/types/constants';
import type { AbilityScoreModifiers, Character, SpellSlots } from '../../../osric/types/entities';

function createMockCharacter(overrides: Partial<Character> = {}): Character {
  const defaultModifiers: AbilityScoreModifiers = {
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

  return {
    id: 'test-character',
    name: 'Test Character',
    class: 'Magic-User',
    level: 1,
    hitPoints: { current: 10, maximum: 10 },
    abilities: {
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 16,
      wisdom: 10,
      charisma: 10,
    },
    armorClass: 10,
    thac0: 20,
    race: 'Human',
    alignment: 'True Neutral',
    experience: { current: 0, requiredForNextLevel: 2500, level: 1 },
    currency: { platinum: 0, gold: 0, electrum: 0, silver: 0, copper: 0 },
    spells: [],
    savingThrows: {
      'Poison or Death': 14,
      Wands: 11,
      'Paralysis, Polymorph, or Petrification': 13,
      'Breath Weapons': 15,
      'Spells, Rods, or Staves': 12,
    },
    abilityModifiers: defaultModifiers,
    encumbrance: 0,
    movementRate: 120,
    classes: { 'Magic-User': 1 },
    primaryClass: null,
    spellSlots: {},
    memorizedSpells: {},
    spellbook: [],
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
    inventory: [],
    position: 'adventure',
    statusEffects: [],
    ...overrides,
  };
}

describe('SpellProgressionRules', () => {
  let context: GameContext;
  let rules: SpellProgressionRules;
  let character: Character;

  beforeEach(() => {
    const store = createStore();
    context = new GameContext(store);
    rules = new SpellProgressionRules();
    character = createMockCharacter();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rule Properties', () => {
    it('should have correct rule name and description', () => {
      expect(rules.name).toBe(RULE_NAMES.SPELL_PROGRESSION);
      expect(rules.description).toBe('Calculates spell slots and progression by OSRIC rules');
    });
  });

  describe('Rule Application', () => {
    it('should apply when character is in context', () => {
      context.setTemporary('calculateSpells_character', character);

      expect(rules.canApply(context)).toBe(true);
    });

    it('should not apply when character is missing', () => {
      expect(rules.canApply(context)).toBe(false);
    });
  });

  describe('Magic-User Spell Progression', () => {
    beforeEach(() => {
      character = createMockCharacter({
        class: 'Magic-User',
        abilities: { ...character.abilities, intelligence: 18 },
      });
      context.setTemporary('calculateSpells_character', character);
    });

    it('should calculate level 1 magic-user spell slots', async () => {
      character.level = 1;
      context.setTemporary('calculateSpells_character', character);

      const result = await rules.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.spellSlots).toEqual({ 1: 1 });
    });

    it('should calculate level 5 magic-user spell slots', async () => {
      character.level = 5;
      context.setTemporary('calculateSpells_character', character);

      const result = await rules.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.spellSlots).toEqual({ 1: 4, 2: 2, 3: 1 });
    });

    it('should calculate level 12 magic-user spell slots', async () => {
      character.level = 12;
      context.setTemporary('calculateSpells_character', character);

      const result = await rules.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.spellSlots).toEqual({ 1: 4, 2: 4, 3: 4, 4: 4, 5: 4, 6: 1 });
    });

    it('should calculate level 20 magic-user spell slots', async () => {
      character.level = 20;
      context.setTemporary('calculateSpells_character', character);

      const result = await rules.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.spellSlots).toEqual({
        1: 5,
        2: 5,
        3: 5,
        4: 5,
        5: 5,
        6: 5,
        7: 4,
        8: 3,
        9: 2,
      });
    });
  });

  describe('Cleric Spell Progression', () => {
    beforeEach(() => {
      character = createMockCharacter({
        class: 'Cleric',
        abilities: { ...character.abilities, wisdom: 18 },
      });
      context.setTemporary('calculateSpells_character', character);
    });

    it('should calculate level 1 cleric spell slots', async () => {
      character.level = 1;
      context.setTemporary('calculateSpells_character', character);

      const result = await rules.execute(context);

      expect(result.success).toBe(true);

      expect(result.data?.spellSlots).toEqual({ 1: 3 });
    });

    it('should calculate level 5 cleric spell slots with wisdom bonus', async () => {
      character.level = 5;
      context.setTemporary('calculateSpells_character', character);

      const result = await rules.execute(context);

      expect(result.success).toBe(true);

      expect(result.data?.spellSlots).toEqual({ 1: 5, 2: 5, 3: 3 });
    });

    it('should calculate level 14 cleric spell slots', async () => {
      character.level = 14;
      context.setTemporary('calculateSpells_character', character);

      const result = await rules.execute(context);

      expect(result.success).toBe(true);

      expect(result.data?.spellSlots).toEqual({ 1: 8, 2: 8, 3: 8, 4: 5, 5: 5, 6: 3, 7: 1 });
    });
  });

  describe('Druid Spell Progression', () => {
    beforeEach(() => {
      character = createMockCharacter({
        class: 'Druid',
        abilities: { ...character.abilities, wisdom: 16 },
      });
      context.setTemporary('calculateSpells_character', character);
    });

    it('should calculate level 1 druid spell slots with wisdom bonus', async () => {
      character.level = 1;
      context.setTemporary('calculateSpells_character', character);

      const result = await rules.execute(context);

      expect(result.success).toBe(true);

      expect(result.data?.spellSlots).toEqual({ 1: 3 });
    });

    it('should calculate level 7 druid spell slots', async () => {
      character.level = 7;
      context.setTemporary('calculateSpells_character', character);

      const result = await rules.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.spellSlots).toEqual({ 1: 5, 2: 5, 3: 2, 4: 1 });
    });
  });

  describe('Illusionist Spell Progression', () => {
    beforeEach(() => {
      character = createMockCharacter({
        class: 'Illusionist',
        abilities: { ...character.abilities, intelligence: 18 },
      });
      context.setTemporary('calculateSpells_character', character);
    });

    it('should calculate level 1 illusionist spell slots', async () => {
      character.level = 1;
      context.setTemporary('calculateSpells_character', character);

      const result = await rules.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.spellSlots).toEqual({ 1: 1 });
    });

    it('should calculate level 20 illusionist spell slots', async () => {
      character.level = 20;
      context.setTemporary('calculateSpells_character', character);

      const result = await rules.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.spellSlots).toEqual({ 1: 5, 2: 5, 3: 5, 4: 5, 5: 5, 6: 5, 7: 5 });
    });
  });

  describe('Paladin Spell Progression', () => {
    beforeEach(() => {
      character = createMockCharacter({
        class: 'Paladin',
        abilities: { ...character.abilities, wisdom: 15 },
      });
      context.setTemporary('calculateSpells_character', character);
    });

    it('should have no spell slots before level 9', async () => {
      character.level = 8;
      context.setTemporary('calculateSpells_character', character);

      const result = await rules.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.spellSlots).toEqual({});
    });

    it('should calculate level 9 paladin spell slots with wisdom bonus', async () => {
      character.level = 9;
      context.setTemporary('calculateSpells_character', character);

      const result = await rules.execute(context);

      expect(result.success).toBe(true);

      expect(result.data?.spellSlots).toEqual({ 1: 3 });
    });

    it('should calculate level 15 paladin spell slots', async () => {
      character.level = 15;
      context.setTemporary('calculateSpells_character', character);

      const result = await rules.execute(context);

      expect(result.success).toBe(true);

      expect(result.data?.spellSlots).toEqual({ 1: 5, 2: 3, 3: 1, 4: 1 });
    });
  });

  describe('Ranger Spell Progression', () => {
    beforeEach(() => {
      character = createMockCharacter({
        class: 'Ranger',
        abilities: { ...character.abilities, wisdom: 14 },
      });
      context.setTemporary('calculateSpells_character', character);
    });

    it('should have no spell slots before level 8', async () => {
      character.level = 7;
      context.setTemporary('calculateSpells_character', character);

      const result = await rules.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.spellSlots).toEqual({});
    });

    it('should calculate level 8 ranger spell slots with wisdom bonus', async () => {
      character.level = 8;
      context.setTemporary('calculateSpells_character', character);

      const result = await rules.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.spellSlots).toEqual({ 1: 3 });
    });

    it('should calculate level 16 ranger spell slots', async () => {
      character.level = 16;
      context.setTemporary('calculateSpells_character', character);

      const result = await rules.execute(context);

      expect(result.success).toBe(true);

      expect(result.data?.spellSlots).toEqual({ 1: 5, 2: 3, 3: 3 });
    });
  });

  describe('Non-Spellcasting Classes', () => {
    it('should return empty spell slots for Fighter', async () => {
      character = createMockCharacter({ class: 'Fighter', level: 10 });
      context.setTemporary('calculateSpells_character', character);

      const result = await rules.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.spellSlots).toEqual({});
    });

    it('should return empty spell slots for Thief', async () => {
      character = createMockCharacter({ class: 'Thief', level: 15 });
      context.setTemporary('calculateSpells_character', character);

      const result = await rules.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.spellSlots).toEqual({});
    });
  });

  describe('Intelligence Limits for Arcane Casters', () => {
    it('should limit spell levels based on intelligence 9', async () => {
      character = createMockCharacter({
        class: 'Magic-User',
        level: 20,
        abilities: { ...character.abilities, intelligence: 9 },
      });
      context.setTemporary('calculateSpells_character', character);

      const result = await rules.execute(context);

      expect(result.success).toBe(true);

      expect(result.data?.spellSlots).toEqual({ 1: 5, 2: 5, 3: 5, 4: 5 });
    });

    it('should limit spell levels based on intelligence 12', async () => {
      character = createMockCharacter({
        class: 'Magic-User',
        level: 20,
        abilities: { ...character.abilities, intelligence: 12 },
      });
      context.setTemporary('calculateSpells_character', character);

      const result = await rules.execute(context);

      expect(result.success).toBe(true);

      expect(result.data?.spellSlots).toEqual({ 1: 5, 2: 5, 3: 5, 4: 5, 5: 5 });
    });

    it('should prevent spellcasting for intelligence below 9', async () => {
      character = createMockCharacter({
        class: 'Magic-User',
        level: 10,
        abilities: { ...character.abilities, intelligence: 8 },
      });
      context.setTemporary('calculateSpells_character', character);

      const result = await rules.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.spellSlots).toEqual({});
    });
  });

  describe('Wisdom Bonus Spells', () => {
    it('should give correct bonus spells for wisdom 13', async () => {
      character = createMockCharacter({
        class: 'Cleric',
        level: 5,
        abilities: { ...character.abilities, wisdom: 13 },
      });
      context.setTemporary('calculateSpells_character', character);

      const result = await rules.execute(context);

      expect(result.success).toBe(true);

      expect(result.data?.spellSlots).toEqual({ 1: 4, 2: 3, 3: 1 });
    });

    it('should give correct bonus spells for wisdom 17', async () => {
      character = createMockCharacter({
        class: 'Cleric',
        level: 10,
        abilities: { ...character.abilities, wisdom: 17 },
      });
      context.setTemporary('calculateSpells_character', character);

      const result = await rules.execute(context);

      expect(result.success).toBe(true);

      expect(result.data?.spellSlots).toEqual({ 1: 6, 2: 6, 3: 4, 4: 3, 5: 2 });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing character gracefully', async () => {
      const result = await rules.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Missing character in context');
    });

    it('should handle character levels above 20', async () => {
      character = createMockCharacter({
        class: 'Magic-User',
        level: 25,
        abilities: { ...character.abilities, intelligence: 18 },
      });
      context.setTemporary('calculateSpells_character', character);

      const result = await rules.execute(context);

      expect(result.success).toBe(true);

      expect(result.data?.spellSlots).toEqual({
        1: 5,
        2: 5,
        3: 5,
        4: 5,
        5: 5,
        6: 5,
        7: 4,
        8: 3,
        9: 2,
      });
    });

    it('should handle level 0 characters', async () => {
      character = createMockCharacter({
        class: 'Magic-User',
        level: 0,
        abilities: { ...character.abilities, intelligence: 18 },
      });
      context.setTemporary('calculateSpells_character', character);

      const result = await rules.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.spellSlots).toEqual({});
    });
  });

  describe('OSRIC Compliance', () => {
    it('should implement authentic OSRIC magic-user progression', async () => {
      character = createMockCharacter({
        class: 'Magic-User',
        level: 7,
        abilities: { ...character.abilities, intelligence: 18 },
      });
      context.setTemporary('calculateSpells_character', character);

      const result = await rules.execute(context);

      expect(result.success).toBe(true);

      expect(result.data?.spellSlots).toEqual({ 1: 4, 2: 3, 3: 2, 4: 1 });
    });

    it('should implement authentic OSRIC cleric progression', async () => {
      character = createMockCharacter({
        class: 'Cleric',
        level: 11,
        abilities: { ...character.abilities, wisdom: 12 },
      });
      context.setTemporary('calculateSpells_character', character);

      const result = await rules.execute(context);

      expect(result.success).toBe(true);

      expect(result.data?.spellSlots).toEqual({ 1: 5, 2: 4, 3: 4, 4: 3, 5: 2, 6: 1 });
    });

    it('should implement authentic OSRIC wisdom bonus mechanics', async () => {
      character = createMockCharacter({
        class: 'Druid',
        level: 1,
        abilities: { ...character.abilities, wisdom: 18 },
      });
      context.setTemporary('calculateSpells_character', character);

      const result = await rules.execute(context);

      expect(result.success).toBe(true);

      expect(result.data?.spellSlots).toEqual({ 1: 3 });
    });
  });
});
