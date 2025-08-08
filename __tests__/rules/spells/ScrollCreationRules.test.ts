// File: __tests__/rules/spells/ScrollCreationRules.test.ts
import type { Command } from '@osric/core/Command';
import { GameContext } from '@osric/core/GameContext';
import {
  type MagicScroll,
  ScrollCastingFailureRule,
  type ScrollCreation,
  ScrollCreationProgressRule,
  ScrollCreationRequirementsRule,
  ScrollCreationStartRule,
  ScrollSpellCastingRule,
  ScrollUsageValidationRule,
} from '@osric/rules/spells/ScrollCreationRules';
import { COMMAND_TYPES } from '@osric/types/constants';
import type { Character, Spell } from '@osric/types/entities';
import { createStore } from 'jotai';
import { beforeEach, describe, expect, it } from 'vitest';

// TEMPLATE: Mock Character Creation Helper
function createMockCharacter(overrides: Partial<Character> = {}): Character {
  const defaultCharacter: Character = {
    id: 'test-character',
    name: 'Test Character',
    level: 5,
    race: 'Human',
    class: 'Magic-User',
    classes: { 'Magic-User': 5 },
    primaryClass: 'Magic-User',
    abilities: {
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 16,
      wisdom: 13,
      charisma: 10,
    },
    hitPoints: { current: 18, maximum: 18 },
    experience: { current: 5000, requiredForNextLevel: 10000, level: 5 },
    armorClass: 10,
    thac0: 19,
    alignment: 'True Neutral',
    encumbrance: 0,
    movementRate: 120,
    inventory: [],
    position: 'town',
    statusEffects: [],
    currency: {
      copper: 0,
      silver: 0,
      electrum: 0,
      gold: 1000,
      platinum: 0,
    },
    savingThrows: {
      'Poison or Death': 13,
      Wands: 11,
      'Paralysis, Polymorph, or Petrification': 12,
      'Breath Weapons': 15,
      'Spells, Rods, or Staves': 12,
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
      intelligenceLearnSpells: 75,
      intelligenceMaxSpellLevel: null,
      intelligenceIllusionImmunity: false,
      wisdomMentalSave: null,
      wisdomBonusSpells: null,
      wisdomSpellFailure: null,
      charismaMaxHenchmen: null,
      charismaLoyaltyBase: null,
      charismaReactionAdj: null,
    },
    spells: [
      {
        name: 'Magic Missile',
        level: 1,
        class: 'Magic-User',
        range: '150 feet',
        duration: 'Instantaneous',
        areaOfEffect: '1 target',
        components: ['V', 'S'],
        castingTime: '1 segment',
        savingThrow: 'None',
        description: 'Creates darts of magical force',
        reversible: false,
        materialComponents: [],
        effect: () => ({
          damage: [4, 1],
          healing: null,
          statusEffects: null,
          narrative: 'Magic missile hits target',
        }),
      },
    ],
    spellbook: [
      {
        name: 'Magic Missile',
        level: 1,
        class: 'Magic-User',
        range: '150 feet',
        duration: 'Instantaneous',
        areaOfEffect: '1 target',
        components: ['V', 'S'],
        castingTime: '1 segment',
        savingThrow: 'None',
        description: 'Creates darts of magical force',
        reversible: false,
        materialComponents: [],
        effect: () => ({
          damage: [4, 1],
          healing: null,
          statusEffects: null,
          narrative: 'Magic missile hits target',
        }),
      },
    ],
    spellSlots: {
      1: 3,
      2: 1,
      3: 0,
      4: 0,
      5: 0,
      6: 0,
      7: 0,
      8: 0,
      9: 0,
    },
    memorizedSpells: {
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
      7: [],
      8: [],
      9: [],
    },
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
    // Add any component-specific overrides
    ...overrides,
  };

  return defaultCharacter;
}

// Helper function to create a mock scroll
function createMockScroll(overrides: Partial<MagicScroll> = {}): MagicScroll {
  const defaultSpell: Spell = {
    name: 'Magic Missile',
    level: 1,
    class: 'Magic-User',
    range: '150 feet',
    duration: 'Instantaneous',
    areaOfEffect: '1 target',
    components: ['V', 'S'],
    castingTime: '1 segment',
    savingThrow: 'None',
    description: 'Creates darts of magical force',
    reversible: false,
    materialComponents: [],
    effect: () => ({
      damage: [4, 1],
      healing: null,
      statusEffects: null,
      narrative: 'Magic missile hits target',
    }),
  };

  const defaultScroll: MagicScroll = {
    id: 'test-scroll',
    name: 'Scroll of Magic Missile',
    itemType: 'scroll',
    spell: defaultSpell,
    userClasses: ['Magic-User', 'Illusionist'],
    consumed: false,
    minCasterLevel: 1,
    failureEffect: 'The scroll crumbles to dust',
    weight: 0.1,
    value: 100,
    description: 'A scroll containing the Magic Missile spell',
    equipped: false,
    magicBonus: null,
    charges: null,
    ...overrides,
  };

  return defaultScroll;
}

describe('ScrollCreationRequirementsRule', () => {
  let rule: ScrollCreationRequirementsRule;
  let context: GameContext;

  beforeEach(() => {
    const store = createStore();
    context = new GameContext(store);
    rule = new ScrollCreationRequirementsRule();

    const character = createMockCharacter({ id: 'test-character' });
    context.setEntity('test-character', character);
  });

  describe('canApply', () => {
    it('should apply when all conditions are met', () => {
      context.setTemporary('scrollCreation_characterId', 'test-character');
      context.setTemporary('scrollCreation_spellLevel', 2);

      expect(rule.canApply(context)).toBe(true);
    });

    it('should not apply without character ID', () => {
      context.setTemporary('scrollCreation_spellLevel', 2);

      expect(rule.canApply(context)).toBe(false);
    });

    it('should not apply without spell level', () => {
      context.setTemporary('scrollCreation_characterId', 'test-character');

      expect(rule.canApply(context)).toBe(false);
    });
  });

  describe('execute - Success Scenarios', () => {
    it('should calculate requirements for valid spellcaster', async () => {
      context.setTemporary('scrollCreation_characterId', 'test-character');
      context.setTemporary('scrollCreation_spellLevel', 2);

      const result = await rule.execute(context);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Creating a level 2 scroll');
      expect(result.data).toMatchObject({
        canCreate: true,
        daysRequired: expect.any(Number),
        goldCost: 400,
        minimumCasterLevel: 3,
      });
    });

    it('should reduce days with high intelligence', async () => {
      const highIntCharacter = createMockCharacter({
        id: 'smart-character',
        abilities: {
          strength: 10,
          dexterity: 10,
          constitution: 10,
          intelligence: 18,
          wisdom: 13,
          charisma: 10,
        },
        abilityModifiers: {
          ...createMockCharacter().abilityModifiers,
          intelligenceLearnSpells: 85,
        },
      });
      context.setEntity('smart-character', highIntCharacter);

      context.setTemporary('scrollCreation_characterId', 'smart-character');
      context.setTemporary('scrollCreation_spellLevel', 3);

      const result = await rule.execute(context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      if (result.data) {
        expect(result.data.daysRequired).toBeLessThan(6); // Base would be 6 days for level 3
      }
    });
  });

  describe('execute - Error Scenarios', () => {
    it('should handle missing character ID', async () => {
      context.setTemporary('scrollCreation_spellLevel', 2);

      const result = await rule.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Missing character ID');
    });

    it('should handle missing spell level', async () => {
      context.setTemporary('scrollCreation_characterId', 'test-character');

      const result = await rule.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Missing character ID or spell level');
    });

    it('should handle character not found', async () => {
      context.setTemporary('scrollCreation_characterId', 'nonexistent');
      context.setTemporary('scrollCreation_spellLevel', 2);

      const result = await rule.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Character not found');
    });

    it('should reject non-spellcaster', async () => {
      const fighter = createMockCharacter({
        id: 'fighter-character',
        class: 'Fighter',
        classes: { Fighter: 5 },
        primaryClass: 'Fighter',
      });
      context.setEntity('fighter-character', fighter);

      context.setTemporary('scrollCreation_characterId', 'fighter-character');
      context.setTemporary('scrollCreation_spellLevel', 2);

      const result = await rule.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Only spellcasters can create scrolls');
    });

    it('should reject insufficient level', async () => {
      const lowLevelCharacter = createMockCharacter({
        id: 'low-level',
        level: 2,
        classes: { 'Magic-User': 2 },
      });
      context.setEntity('low-level', lowLevelCharacter);

      context.setTemporary('scrollCreation_characterId', 'low-level');
      context.setTemporary('scrollCreation_spellLevel', 4);

      const result = await rule.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('You must be at least level 7');
    });
  });

  describe('OSRIC Compliance', () => {
    it('should implement authentic OSRIC scroll creation costs', async () => {
      context.setTemporary('scrollCreation_characterId', 'test-character');
      context.setTemporary('scrollCreation_spellLevel', 3);

      const result = await rule.execute(context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      if (result.data) {
        expect(result.data.goldCost).toBe(900); // 100 * 3^2
        expect(result.data.minimumCasterLevel).toBe(5); // 3 * 2 - 1
      }
    });
  });
});

describe('ScrollCreationStartRule', () => {
  let rule: ScrollCreationStartRule;
  let context: GameContext;

  beforeEach(() => {
    const store = createStore();
    context = new GameContext(store);
    rule = new ScrollCreationStartRule();

    const character = createMockCharacter({ id: 'test-character' });
    context.setEntity('test-character', character);
  });

  describe('canApply', () => {
    it('should apply when all conditions are met', () => {
      context.setTemporary('scrollStart_characterId', 'test-character');
      context.setTemporary('scrollStart_spellName', 'Fireball');
      context.setTemporary('scrollStart_spellLevel', 3);

      expect(rule.canApply(context)).toBe(true);
    });

    it('should not apply with missing parameters', () => {
      context.setTemporary('scrollStart_characterId', 'test-character');
      context.setTemporary('scrollStart_spellName', 'Fireball');
      // Missing spell level

      expect(rule.canApply(context)).toBe(false);
    });
  });

  describe('execute - Success Scenarios', () => {
    it('should start scroll creation project', async () => {
      context.setTemporary('scrollStart_characterId', 'test-character');
      context.setTemporary('scrollStart_spellName', 'Fireball');
      context.setTemporary('scrollStart_spellLevel', 3);

      const result = await rule.execute(context);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Started creating scroll of Fireball');
      expect(result.data).toMatchObject({
        creatorId: 'test-character',
        spellName: 'Fireball',
        spellLevel: 3,
        progressPercentage: 0,
      });
    });
  });

  describe('execute - Error Scenarios', () => {
    it('should handle missing parameters', async () => {
      context.setTemporary('scrollStart_characterId', 'test-character');
      // Missing spell name and level

      const result = await rule.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Missing parameters');
    });

    it('should handle character not found', async () => {
      context.setTemporary('scrollStart_characterId', 'nonexistent');
      context.setTemporary('scrollStart_spellName', 'Fireball');
      context.setTemporary('scrollStart_spellLevel', 3);

      const result = await rule.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Character not found');
    });
  });
});

describe('ScrollUsageValidationRule', () => {
  let rule: ScrollUsageValidationRule;
  let context: GameContext;

  beforeEach(() => {
    const store = createStore();
    context = new GameContext(store);
    rule = new ScrollUsageValidationRule();

    const scroll = createMockScroll({ id: 'test-scroll' });
    const character = createMockCharacter({
      id: 'test-character',
      inventory: [scroll],
    });
    context.setEntity('test-character', character);
  });

  describe('canApply', () => {
    it('should apply when all conditions are met', () => {
      context.setTemporary('scrollUsage_characterId', 'test-character');
      context.setTemporary('scrollUsage_scrollId', 'test-scroll');

      expect(rule.canApply(context)).toBe(true);
    });
  });

  describe('execute - Success Scenarios', () => {
    it('should validate scroll usage for valid class', async () => {
      context.setTemporary('scrollUsage_characterId', 'test-character');
      context.setTemporary('scrollUsage_scrollId', 'test-scroll');

      const result = await rule.execute(context);

      expect(result.success).toBe(true);
      expect(result.message).toContain('can use the scroll');
      expect(result.data).toMatchObject({
        canUse: true,
        scroll: expect.any(Object),
        character: expect.any(Object),
      });
    });
  });

  describe('execute - Error Scenarios', () => {
    it('should handle scroll not found', async () => {
      context.setTemporary('scrollUsage_characterId', 'test-character');
      context.setTemporary('scrollUsage_scrollId', 'nonexistent-scroll');

      const result = await rule.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Scroll not found');
    });

    it('should handle consumed scroll', async () => {
      const consumedScroll = createMockScroll({ id: 'consumed-scroll', consumed: true });
      const character = createMockCharacter({
        id: 'test-character',
        inventory: [consumedScroll],
      });
      context.setEntity('test-character', character);

      context.setTemporary('scrollUsage_characterId', 'test-character');
      context.setTemporary('scrollUsage_scrollId', 'consumed-scroll');

      const result = await rule.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('already been used');
    });

    it('should handle wrong class', async () => {
      const clericScroll = createMockScroll({
        id: 'cleric-scroll',
        userClasses: ['Cleric'],
      });
      const character = createMockCharacter({
        id: 'test-character',
        inventory: [clericScroll],
      });
      context.setEntity('test-character', character);

      context.setTemporary('scrollUsage_characterId', 'test-character');
      context.setTemporary('scrollUsage_scrollId', 'cleric-scroll');

      const result = await rule.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('cannot use this scroll');
    });
  });
});

describe('ScrollSpellCastingRule', () => {
  let rule: ScrollSpellCastingRule;
  let context: GameContext;

  beforeEach(() => {
    const store = createStore();
    context = new GameContext(store);
    rule = new ScrollSpellCastingRule();

    const scroll = createMockScroll({ id: 'test-scroll' });
    const character = createMockCharacter({
      id: 'test-character',
      inventory: [scroll],
    });
    context.setEntity('test-character', character);
  });

  describe('canApply', () => {
    it('should apply when casting check is present', () => {
      const castingCheck = {
        scroll: createMockScroll(),
        caster: createMockCharacter(),
        failureChance: 0,
        backfireChance: 0,
      };
      context.setTemporary('scrollCast_check', castingCheck);

      expect(rule.canApply(context)).toBe(true);
    });
  });

  describe('execute - Success Scenarios', () => {
    it('should execute successful scroll casting', async () => {
      const scroll = createMockScroll({ id: 'test-scroll' });
      const character = createMockCharacter({
        id: 'test-character',
        inventory: [scroll],
      });

      const castingCheck = {
        scroll,
        caster: character,
        failureChance: 0, // Guaranteed success
        backfireChance: 0,
      };
      context.setTemporary('scrollCast_check', castingCheck);

      const result = await rule.execute(context);

      expect(result.success).toBe(true);
      expect(result.message).toContain('successfully casts');
      expect(result.data).toMatchObject({
        success: true,
        backfired: false,
        scrollConsumed: true,
      });
    });
  });

  describe('OSRIC Compliance', () => {
    it('should implement authentic OSRIC scroll failure mechanics', async () => {
      const highLevelScroll = createMockScroll({
        id: 'high-level-scroll',
        minCasterLevel: 10,
        spell: {
          ...createMockScroll().spell,
          level: 5,
          name: 'Fireball',
        },
      });

      const lowLevelCharacter = createMockCharacter({
        id: 'low-level',
        level: 3,
        inventory: [highLevelScroll],
      });

      const castingCheck = {
        scroll: highLevelScroll,
        caster: lowLevelCharacter,
        failureChance: 35, // 7 level difference * 5
        backfireChance: 17,
      };
      context.setTemporary('scrollCast_check', castingCheck);

      // Mock failure scenario by setting context result expectation
      const result = await rule.execute(context);

      expect(result.success).toBe(true); // Rule execution succeeds
      expect(result.data).toBeDefined();
      if (result.data) {
        expect(result.data.scrollConsumed).toBe(true);
      }
    });
  });
});
