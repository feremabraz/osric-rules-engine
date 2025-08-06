import { GameContext } from '@osric/core/GameContext';
import { SpellMemorizationRules } from '@osric/rules/spells/SpellMemorizationRules';
import type { Character, Spell } from '@osric/types/entities';
import { createStore } from 'jotai';
import { beforeEach, describe, expect, it } from 'vitest';

// Helper function for mock character creation
function createMockCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'test-character',
    name: 'Test Wizard',
    race: 'Human',
    class: 'Magic-User',
    level: 5,
    abilities: {
      strength: 10,
      dexterity: 14,
      constitution: 16,
      intelligence: 18,
      wisdom: 12,
      charisma: 13,
    },
    abilityModifiers: {
      strengthHitAdj: null,
      strengthDamageAdj: null,
      strengthEncumbrance: null,
      strengthOpenDoors: null,
      strengthBendBars: null,
      dexterityReaction: null,
      dexterityMissile: 1,
      dexterityDefense: -2,
      dexterityPickPockets: null,
      dexterityOpenLocks: null,
      dexterityFindTraps: null,
      dexterityMoveSilently: null,
      dexterityHideInShadows: null,
      constitutionHitPoints: 2,
      constitutionSystemShock: null,
      constitutionResurrectionSurvival: null,
      constitutionPoisonSave: null,
      intelligenceLanguages: 4,
      intelligenceLearnSpells: 85,
      intelligenceMaxSpellLevel: 9,
      intelligenceIllusionImmunity: false,
      wisdomMentalSave: null,
      wisdomBonusSpells: null,
      wisdomSpellFailure: null,
      charismaReactionAdj: 1,
      charismaLoyaltyBase: null,
      charismaMaxHenchmen: 5,
    },
    hitPoints: { current: 25, maximum: 25 },
    armorClass: 8,
    thac0: 18,
    alignment: 'True Neutral',
    experience: { current: 10000, requiredForNextLevel: 20000, level: 5 },
    savingThrows: {
      'Poison or Death': 13,
      Wands: 11,
      'Paralysis, Polymorph, or Petrification': 13,
      'Breath Weapons': 15,
      'Spells, Rods, or Staves': 12,
    },
    spells: [],
    currency: { platinum: 0, gold: 100, electrum: 0, silver: 0, copper: 0 },
    encumbrance: 0,
    movementRate: 120,
    classes: { 'Magic-User': 5 },
    primaryClass: null,
    spellSlots: { 1: 4, 2: 2, 3: 1 },
    memorizedSpells: { 1: [], 2: [], 3: [] },
    spellbook: [
      {
        name: 'Magic Missile',
        level: 1,
        class: 'Magic-User',
        castingTime: '1 segment',
        range: '60 yards',
        duration: 'Instantaneous',
        areaOfEffect: '1 target',
        description: 'Creates 1-5 magical darts that strike unerringly',
        components: ['V', 'S'],
        savingThrow: 'None',
        reversible: false,
        materialComponents: null,
        effect: () => ({
          damage: [4],
          healing: null,
          statusEffects: null,
          narrative: 'Magic missile strikes target',
        }),
      },
      {
        name: 'Shield',
        level: 1,
        class: 'Magic-User',
        castingTime: '1 segment',
        range: '0',
        duration: '5 rounds/level',
        areaOfEffect: 'Caster',
        description: 'Creates a magical shield providing protection',
        components: ['V', 'S'],
        savingThrow: 'None',
        reversible: false,
        materialComponents: null,
        effect: () => ({
          damage: null,
          healing: null,
          statusEffects: null,
          narrative: 'Magical shield appears',
        }),
      },
      {
        name: 'Web',
        level: 2,
        class: 'Magic-User',
        castingTime: '2 segments',
        range: '5 yards/level',
        duration: '2 turns/level',
        areaOfEffect: '8000 cubic feet',
        description: 'Creates sticky webs that entangle creatures',
        components: ['V', 'S', 'M'],
        savingThrow: 'Paralysis, Polymorph, or Petrification',
        reversible: false,
        materialComponents: ['spider web'],
        effect: () => ({
          damage: null,
          healing: null,
          statusEffects: null,
          narrative: 'Sticky webs entangle target',
        }),
      },
    ],
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
    position: 'study',
    statusEffects: [],
    ...overrides,
  } as Character;
}

// Helper function for mock spells
function createMockSpell(overrides: Partial<Spell> = {}): Spell {
  return {
    name: 'Magic Missile',
    level: 1,
    class: 'Magic-User',
    castingTime: '1 segment',
    range: '60 yards',
    duration: 'Instantaneous',
    areaOfEffect: '1 target',
    description: 'Creates 1-5 magical darts that strike unerringly',
    components: ['V', 'S'],
    savingThrow: 'None',
    reversible: false,
    materialComponents: null,
    effect: () => ({
      damage: [4],
      healing: null,
      statusEffects: null,
      narrative: 'Magic missile strikes target',
    }),
    ...overrides,
  } as Spell;
}

describe('SpellMemorizationRules', () => {
  let rule: SpellMemorizationRules;
  let context: GameContext;

  beforeEach(() => {
    const store = createStore();
    context = new GameContext(store);
    rule = new SpellMemorizationRules();

    // Setup default test data
    const character = createMockCharacter();
    const spell = createMockSpell();

    context.setEntity('test-character', character);

    // Setup memorization context data
    context.setTemporary('memorizeSpell_caster', character);
    context.setTemporary('memorizeSpell_spell', spell);
    context.setTemporary('memorizeSpell_level', 1);
  });

  describe('canApply', () => {
    it('should apply when caster and spell data exist', () => {
      expect(rule.canApply(context)).toBe(true);
    });

    it('should not apply when caster data is missing', () => {
      context.setTemporary('memorizeSpell_caster', null);
      expect(rule.canApply(context)).toBe(false);
    });

    it('should not apply when spell data is missing', () => {
      context.setTemporary('memorizeSpell_spell', null);
      expect(rule.canApply(context)).toBe(false);
    });

    it('should not apply when both caster and spell data are missing', () => {
      context.setTemporary('memorizeSpell_caster', null);
      context.setTemporary('memorizeSpell_spell', null);
      expect(rule.canApply(context)).toBe(false);
    });
  });

  describe('execute - successful memorization', () => {
    it('should successfully memorize Magic Missile', async () => {
      const result = await rule.execute(context);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Test Wizard memorized Magic Missile');
      expect(result.data).toBeDefined();
      expect(result.data?.spellMemorized).toBe('Magic Missile');
      expect(result.data?.level).toBe(1);
    });

    it('should add spell to memorized spells list', async () => {
      const result = await rule.execute(context);

      expect(result.success).toBe(true);

      // Check that caster was updated with memorized spell
      const updatedCaster = context.getEntity<Character>('test-character');
      expect(updatedCaster?.memorizedSpells[1]).toHaveLength(1);
      expect(updatedCaster?.memorizedSpells[1][0].name).toBe('Magic Missile');
    });

    it('should memorize multiple spells in same level', async () => {
      // First spell
      await rule.execute(context);

      // Update context with current character state for second spell
      let updatedCaster = context.getEntity<Character>('test-character');
      expect(updatedCaster?.memorizedSpells[1]).toHaveLength(1);

      // Second spell - create new character with updated state
      const shieldSpell = createMockSpell({ name: 'Shield' });
      context.setTemporary('memorizeSpell_caster', updatedCaster);
      context.setTemporary('memorizeSpell_spell', shieldSpell);

      const result = await rule.execute(context);

      expect(result.success).toBe(true);

      updatedCaster = context.getEntity<Character>('test-character');
      expect(updatedCaster?.memorizedSpells[1]).toHaveLength(2);
      expect(updatedCaster?.memorizedSpells[1][1].name).toBe('Shield');
    });

    it('should handle different spell levels', async () => {
      // Memorize 2nd level spell
      const webSpell = createMockSpell({ name: 'Web', level: 2, class: 'Magic-User' });
      context.setTemporary('memorizeSpell_spell', webSpell);
      context.setTemporary('memorizeSpell_level', 2);

      const result = await rule.execute(context);

      expect(result.success).toBe(true);

      const updatedCaster = context.getEntity<Character>('test-character');
      expect(updatedCaster?.memorizedSpells[2]).toHaveLength(1);
      expect(updatedCaster?.memorizedSpells[2][0].name).toBe('Web');
    });

    it('should replace existing spell when specified', async () => {
      // First memorize a spell
      await rule.execute(context);

      // Get current state
      let updatedCaster = context.getEntity<Character>('test-character');
      expect(updatedCaster?.memorizedSpells[1]).toHaveLength(1);
      expect(updatedCaster?.memorizedSpells[1][0].name).toBe('Magic Missile');

      // Replace it with another spell
      const shieldSpell = createMockSpell({ name: 'Shield' });
      context.setTemporary('memorizeSpell_caster', updatedCaster);
      context.setTemporary('memorizeSpell_spell', shieldSpell);
      context.setTemporary('memorizeSpell_replaceSpell', 'Magic Missile');

      const result = await rule.execute(context);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Test Wizard replaced Shield');
      expect(result.data?.replacedSpell).toBe('Magic Missile');

      updatedCaster = context.getEntity<Character>('test-character');
      expect(updatedCaster?.memorizedSpells[1]).toHaveLength(1);
      expect(updatedCaster?.memorizedSpells[1][0].name).toBe('Shield');
    });
  });

  describe('execute - validation failures', () => {
    it('should fail if caster cannot cast spells of that level', async () => {
      const lowLevelCaster = createMockCharacter({
        level: 1,
        spellSlots: { 1: 1 }, // No higher level slots
      });

      context.setTemporary('memorizeSpell_caster', lowLevelCaster);
      context.setTemporary('memorizeSpell_level', 3);
      context.setEntity('test-character', lowLevelCaster);

      const result = await rule.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('cannot cast spells of level 3');
    });

    it('should fail if spell is not valid for character class', async () => {
      const clericSpell = createMockSpell({ class: 'Cleric', name: 'Cure Light Wounds' });
      context.setTemporary('memorizeSpell_spell', clericSpell);

      const result = await rule.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('is not available to Magic-Users');
    });

    it('should fail if arcane spell not in spellbook', async () => {
      const unknownSpell = createMockSpell({ name: 'Lightning Bolt', level: 3 });
      context.setTemporary('memorizeSpell_spell', unknownSpell);
      context.setTemporary('memorizeSpell_level', 3);

      const result = await rule.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain("is not in Test Wizard's spellbook");
    });

    it('should fail if intelligence too low for spell level', async () => {
      const lowIntCaster = createMockCharacter({
        abilities: { ...createMockCharacter().abilities, intelligence: 9 },
        spellSlots: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 }, // Has slots but not intelligence
        spellbook: [
          {
            name: 'Fireball',
            level: 5,
            class: 'Magic-User',
            castingTime: '3 segments',
            range: '60 yards',
            duration: 'Instantaneous',
            areaOfEffect: '20-foot radius',
            description: 'Creates a fiery explosion',
            components: ['V', 'S', 'M'],
            savingThrow: 'Breath Weapons',
            reversible: false,
            materialComponents: ['bat guano'],
            effect: () => ({
              damage: [6, 6, 6, 6, 6],
              healing: null,
              statusEffects: null,
              narrative: 'Fiery explosion engulfs target',
            }),
          },
        ],
      });

      const highLevelSpell = createMockSpell({ name: 'Fireball', level: 5 });
      context.setTemporary('memorizeSpell_caster', lowIntCaster);
      context.setTemporary('memorizeSpell_spell', highLevelSpell);
      context.setTemporary('memorizeSpell_level', 5);
      context.setEntity('test-character', lowIntCaster);

      const result = await rule.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('intelligence is too low to memorize level 5 spells');
    });
  });

  describe('execute - missing context data', () => {
    it('should handle missing caster data', async () => {
      context.setTemporary('memorizeSpell_caster', null);

      const result = await rule.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Missing memorization data in context');
    });

    it('should handle missing spell data', async () => {
      context.setTemporary('memorizeSpell_spell', null);

      const result = await rule.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Missing memorization data in context');
    });

    it('should handle missing spell level', async () => {
      context.setTemporary('memorizeSpell_level', null);

      const result = await rule.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Missing memorization data in context');
    });
  });

  describe('class-specific spell validation', () => {
    it('should allow Magic-User spells for Magic-User', async () => {
      const result = await rule.execute(context);

      expect(result.success).toBe(true);
    });

    it('should allow Cleric spells for Cleric', async () => {
      const cleric = createMockCharacter({
        class: 'Cleric',
        spellbook: [], // Clerics don't use spellbooks
      });
      const clericSpell = createMockSpell({
        name: 'Cure Light Wounds',
        class: 'Cleric',
      });

      context.setTemporary('memorizeSpell_caster', cleric);
      context.setTemporary('memorizeSpell_spell', clericSpell);
      context.setEntity('test-character', cleric);

      const result = await rule.execute(context);

      expect(result.success).toBe(true);
    });

    it('should allow Cleric spells for Paladin', async () => {
      const paladin = createMockCharacter({
        class: 'Paladin',
        spellbook: [], // Paladins don't use spellbooks
      });
      const clericSpell = createMockSpell({
        name: 'Cure Light Wounds',
        class: 'Cleric',
      });

      context.setTemporary('memorizeSpell_caster', paladin);
      context.setTemporary('memorizeSpell_spell', clericSpell);
      context.setEntity('test-character', paladin);

      const result = await rule.execute(context);

      expect(result.success).toBe(true);
    });

    it('should allow Druid spells for Ranger', async () => {
      const ranger = createMockCharacter({
        class: 'Ranger',
        spellbook: [], // Rangers don't use spellbooks
      });
      const druidSpell = createMockSpell({
        name: 'Entangle',
        class: 'Druid',
      });

      context.setTemporary('memorizeSpell_caster', ranger);
      context.setTemporary('memorizeSpell_spell', druidSpell);
      context.setEntity('test-character', ranger);

      const result = await rule.execute(context);

      expect(result.success).toBe(true);
    });
  });

  describe('OSRIC compliance - intelligence requirements', () => {
    it('should enforce intelligence-based spell level limits', async () => {
      const testCases = [
        { intelligence: 9, maxLevel: 4 },
        { intelligence: 12, maxLevel: 5 },
        { intelligence: 14, maxLevel: 6 },
        { intelligence: 16, maxLevel: 7 },
        { intelligence: 17, maxLevel: 8 },
        { intelligence: 18, maxLevel: 9 },
      ];

      for (const testCase of testCases) {
        const caster = createMockCharacter({
          abilities: { ...createMockCharacter().abilities, intelligence: testCase.intelligence },
          spellSlots: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1, 9: 1 },
          spellbook: [
            // Add spells for each level to spellbook
            {
              name: 'Spell Level 1',
              level: 1,
              class: 'Magic-User',
              castingTime: '1 segment',
              range: '0',
              duration: 'Permanent',
              areaOfEffect: 'Caster',
              description: 'Test spell',
              components: ['V'],
              savingThrow: 'None',
              reversible: false,
              materialComponents: null,
              effect: () => ({
                damage: null,
                healing: null,
                statusEffects: null,
                narrative: 'Test',
              }),
            },
            {
              name: 'Spell Level 2',
              level: 2,
              class: 'Magic-User',
              castingTime: '1 segment',
              range: '0',
              duration: 'Permanent',
              areaOfEffect: 'Caster',
              description: 'Test spell',
              components: ['V'],
              savingThrow: 'None',
              reversible: false,
              materialComponents: null,
              effect: () => ({
                damage: null,
                healing: null,
                statusEffects: null,
                narrative: 'Test',
              }),
            },
            {
              name: 'Spell Level 3',
              level: 3,
              class: 'Magic-User',
              castingTime: '1 segment',
              range: '0',
              duration: 'Permanent',
              areaOfEffect: 'Caster',
              description: 'Test spell',
              components: ['V'],
              savingThrow: 'None',
              reversible: false,
              materialComponents: null,
              effect: () => ({
                damage: null,
                healing: null,
                statusEffects: null,
                narrative: 'Test',
              }),
            },
            {
              name: 'Spell Level 4',
              level: 4,
              class: 'Magic-User',
              castingTime: '1 segment',
              range: '0',
              duration: 'Permanent',
              areaOfEffect: 'Caster',
              description: 'Test spell',
              components: ['V'],
              savingThrow: 'None',
              reversible: false,
              materialComponents: null,
              effect: () => ({
                damage: null,
                healing: null,
                statusEffects: null,
                narrative: 'Test',
              }),
            },
            {
              name: 'Spell Level 5',
              level: 5,
              class: 'Magic-User',
              castingTime: '1 segment',
              range: '0',
              duration: 'Permanent',
              areaOfEffect: 'Caster',
              description: 'Test spell',
              components: ['V'],
              savingThrow: 'None',
              reversible: false,
              materialComponents: null,
              effect: () => ({
                damage: null,
                healing: null,
                statusEffects: null,
                narrative: 'Test',
              }),
            },
            {
              name: 'Spell Level 6',
              level: 6,
              class: 'Magic-User',
              castingTime: '1 segment',
              range: '0',
              duration: 'Permanent',
              areaOfEffect: 'Caster',
              description: 'Test spell',
              components: ['V'],
              savingThrow: 'None',
              reversible: false,
              materialComponents: null,
              effect: () => ({
                damage: null,
                healing: null,
                statusEffects: null,
                narrative: 'Test',
              }),
            },
            {
              name: 'Spell Level 7',
              level: 7,
              class: 'Magic-User',
              castingTime: '1 segment',
              range: '0',
              duration: 'Permanent',
              areaOfEffect: 'Caster',
              description: 'Test spell',
              components: ['V'],
              savingThrow: 'None',
              reversible: false,
              materialComponents: null,
              effect: () => ({
                damage: null,
                healing: null,
                statusEffects: null,
                narrative: 'Test',
              }),
            },
            {
              name: 'Spell Level 8',
              level: 8,
              class: 'Magic-User',
              castingTime: '1 segment',
              range: '0',
              duration: 'Permanent',
              areaOfEffect: 'Caster',
              description: 'Test spell',
              components: ['V'],
              savingThrow: 'None',
              reversible: false,
              materialComponents: null,
              effect: () => ({
                damage: null,
                healing: null,
                statusEffects: null,
                narrative: 'Test',
              }),
            },
            {
              name: 'Spell Level 9',
              level: 9,
              class: 'Magic-User',
              castingTime: '1 segment',
              range: '0',
              duration: 'Permanent',
              areaOfEffect: 'Caster',
              description: 'Test spell',
              components: ['V'],
              savingThrow: 'None',
              reversible: false,
              materialComponents: null,
              effect: () => ({
                damage: null,
                healing: null,
                statusEffects: null,
                narrative: 'Test',
              }),
            },
          ],
        });

        const validSpell = createMockSpell({
          name: `Spell Level ${testCase.maxLevel}`,
          level: testCase.maxLevel,
        });
        const invalidSpell = createMockSpell({
          name: `Spell Level ${testCase.maxLevel + 1}`,
          level: testCase.maxLevel + 1,
        });

        // Test valid spell level
        context.setTemporary('memorizeSpell_caster', caster);
        context.setTemporary('memorizeSpell_spell', validSpell);
        context.setTemporary('memorizeSpell_level', testCase.maxLevel);
        context.setEntity('test-character', caster);

        const validResult = await rule.execute(context);
        expect(validResult.success).toBe(true);

        // Test invalid spell level (if it would be higher than 9)
        if (testCase.maxLevel < 9) {
          context.setTemporary('memorizeSpell_spell', invalidSpell);
          context.setTemporary('memorizeSpell_level', testCase.maxLevel + 1);

          const invalidResult = await rule.execute(context);
          expect(invalidResult.success).toBe(false);
          expect(invalidResult.message).toContain('intelligence is too low');
        }
      }
    });

    it('should prevent spell memorization for intelligence below 9', async () => {
      const lowIntCaster = createMockCharacter({
        abilities: { ...createMockCharacter().abilities, intelligence: 8 },
        spellSlots: { 1: 1 },
      });

      context.setTemporary('memorizeSpell_caster', lowIntCaster);
      context.setEntity('test-character', lowIntCaster);

      const result = await rule.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('intelligence is too low');
    });
  });

  describe('utility methods', () => {
    it('should calculate bonus spells from wisdom for divine casters', () => {
      const wisdomTestCases = [
        { wisdom: 12, expected: {} },
        { wisdom: 13, expected: { 1: 1 } },
        { wisdom: 14, expected: { 1: 2 } },
        { wisdom: 15, expected: { 1: 2, 2: 1 } },
        { wisdom: 16, expected: { 1: 2, 2: 2 } },
        { wisdom: 17, expected: { 1: 2, 2: 2, 3: 1 } },
        { wisdom: 18, expected: { 1: 2, 2: 2, 3: 2 } },
      ];

      for (const testCase of wisdomTestCases) {
        const cleric = createMockCharacter({
          class: 'Cleric',
          abilities: { ...createMockCharacter().abilities, wisdom: testCase.wisdom },
          spellSlots: { 1: 1, 2: 1, 3: 1 },
        });

        const totalSlots = SpellMemorizationRules.calculateTotalSpellSlots(cleric);

        for (const [levelStr, expectedBonus] of Object.entries(testCase.expected)) {
          const level = Number.parseInt(levelStr, 10);
          expect(totalSlots[level]).toBe(1 + expectedBonus); // Base 1 + bonus
        }
      }
    });

    it('should require rest for spell memorization', () => {
      const caster = createMockCharacter();
      expect(SpellMemorizationRules.requiresRest(caster)).toBe(true);
    });

    it('should clear all memorized spells', () => {
      const caster = createMockCharacter({
        memorizedSpells: {
          1: [createMockSpell()],
          2: [createMockSpell({ level: 2 })],
        },
      });

      const clearedCaster = SpellMemorizationRules.clearMemorizedSpells(caster);

      expect(clearedCaster.memorizedSpells).toEqual({});
      expect(clearedCaster.id).toBe(caster.id); // Ensure it's the same character
    });
  });
});
