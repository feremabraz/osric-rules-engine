import { GameContext } from '@osric/core/GameContext';
import { SpellCastingRules } from '@osric/rules/spells/SpellCastingRules';
import type { Character, Spell } from '@osric/types/entities';
import { createStore } from 'jotai';
import { beforeEach, describe, expect, it } from 'vitest';

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
    memorizedSpells: {
      1: [
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
      ],
      2: [
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
    },
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
    position: 'dungeon',
    statusEffects: [],
    ...overrides,
  } as Character;
}

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

describe('SpellCastingRules', () => {
  let rule: SpellCastingRules;
  let context: GameContext;

  beforeEach(() => {
    const store = createStore();
    context = new GameContext(store);
    rule = new SpellCastingRules();

    const character = createMockCharacter();
    const spell = createMockSpell();
    const target = createMockCharacter({ id: 'target-1', name: 'Target' });

    context.setEntity('test-character', character);
    context.setEntity('target-1', target);

    context.setTemporary('castSpell_caster', character);
    context.setTemporary('castSpell_spell', spell);
    context.setTemporary('castSpell_targets', [target]);
    context.setTemporary('castSpell_overrideComponents', false);
  });

  describe('canApply', () => {
    it('should apply when caster and spell data exist', () => {
      expect(rule.canApply(context)).toBe(true);
    });

    it('should not apply when caster data is missing', () => {
      context.setTemporary('castSpell_caster', null);
      expect(rule.canApply(context)).toBe(false);
    });

    it('should not apply when spell data is missing', () => {
      context.setTemporary('castSpell_spell', null);
      expect(rule.canApply(context)).toBe(false);
    });

    it('should not apply when both caster and spell data are missing', () => {
      context.setTemporary('castSpell_caster', null);
      context.setTemporary('castSpell_spell', null);
      expect(rule.canApply(context)).toBe(false);
    });
  });

  describe('execute - successful spell casting', () => {
    it('should successfully cast Magic Missile', async () => {
      const result = await rule.execute(context);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Test Wizard successfully casts Magic Missile');
      expect(result.data).toBeDefined();
      expect(result.data?.spellCast).toBe('Magic Missile');
      expect(result.data?.targets).toEqual(['Target']);
    });

    it('should consume spell slot when casting', async () => {
      const result = await rule.execute(context);

      expect(result.success).toBe(true);

      const updatedCaster = context.getEntity<Character>('test-character');
      expect(updatedCaster?.memorizedSpells[1]).toHaveLength(0);
    });

    it('should set spell result data for command use', async () => {
      const result = await rule.execute(context);

      expect(result.success).toBe(true);
      expect(context.getTemporary('castSpell_spellResult')).toBeDefined();
      expect(context.getTemporary('castSpell_effectResults')).toBeDefined();
    });

    it('should handle spells with saving throws', async () => {
      const webSpell = createMockSpell({
        name: 'Web',
        level: 2,
        savingThrow: 'Paralysis, Polymorph, or Petrification',
        components: ['V', 'S', 'M'],
      });

      const caster = createMockCharacter({
        memorizedSpells: {
          2: [webSpell],
        },
      });

      context.setTemporary('castSpell_caster', caster);
      context.setTemporary('castSpell_spell', webSpell);
      context.setEntity('test-character', caster);

      const result = await rule.execute(context);

      expect(result.success).toBe(true);
      expect(result.message).toContain('successfully casts Web');

      const effectResults = context.getTemporary('castSpell_effectResults') as Array<{
        damage: number[] | null;
        healing: number | null;
        statusEffects: unknown;
        narrative: string;
        savingThrow?: unknown;
      }>;
      expect(effectResults).toBeDefined();
      expect(effectResults[0]?.savingThrow).toBeDefined();
    });
  });

  describe('execute - spell validation failures', () => {
    it('should fail if caster is unconscious', async () => {
      const unconsciousCaster = createMockCharacter({
        hitPoints: { current: 0, maximum: 25 },
      });

      context.setTemporary('castSpell_caster', unconsciousCaster);
      context.setEntity('test-character', unconsciousCaster);

      const result = await rule.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('is unconscious and cannot cast spells');
    });

    it('should fail if caster is silenced and spell requires verbal components', async () => {
      const silencedCaster = createMockCharacter({
        statusEffects: [
          {
            name: 'Silenced',
            duration: 10,
            effect: 'Cannot speak',
            savingThrow: null,
            endCondition: null,
          },
        ],
      });

      context.setTemporary('castSpell_caster', silencedCaster);
      context.setEntity('test-character', silencedCaster);

      const result = await rule.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('cannot speak and thus cannot cast');
    });

    it('should fail if spell not memorized', async () => {
      const casterNoSpells = createMockCharacter({
        memorizedSpells: { 1: [], 2: [], 3: [] },
      });

      context.setTemporary('castSpell_caster', casterNoSpells);
      context.setEntity('test-character', casterNoSpells);

      const result = await rule.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('does not have Magic Missile memorized');
    });

    it('should fail if targets required but none provided', async () => {
      const targetSpell = createMockSpell({
        range: '60 yards',
        areaOfEffect: '1 target',
      });

      context.setTemporary('castSpell_spell', targetSpell);
      context.setTemporary('castSpell_targets', []);

      const result = await rule.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('requires targets but none were provided');
    });
  });

  describe('execute - missing context data', () => {
    it('should handle missing caster data', async () => {
      context.setTemporary('castSpell_caster', null);

      const result = await rule.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Missing caster or spell in context');
    });

    it('should handle missing spell data', async () => {
      context.setTemporary('castSpell_spell', null);

      const result = await rule.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Missing caster or spell in context');
    });
  });

  describe('spell effect resolution', () => {
    it('should calculate Magic Missile damage based on caster level', async () => {
      const result = await rule.execute(context);

      expect(result.success).toBe(true);

      const spellResult = context.getTemporary('castSpell_spellResult') as {
        damage?: number[] | null;
        healing?: number | null;
        statusEffects?: unknown;
        narrative?: string;
      };
      expect(spellResult).toBeDefined();
      expect(spellResult.damage).toBeDefined();
      expect(Array.isArray(spellResult.damage)).toBe(true);
      expect(spellResult.damage?.length).toBeGreaterThan(0);
    });

    it('should handle healing spells', async () => {
      const healingSpell = createMockSpell({
        name: 'Cure Light Wounds',
        class: 'Cleric',
        effect: () => ({
          damage: null,
          healing: [6],
          statusEffects: null,
          narrative: 'Divine energy heals wounds',
        }),
      });

      const cleric = createMockCharacter({
        class: 'Cleric',
        memorizedSpells: { 1: [healingSpell] },
      });

      context.setTemporary('castSpell_caster', cleric);
      context.setTemporary('castSpell_spell', healingSpell);
      context.setEntity('test-character', cleric);

      const result = await rule.execute(context);

      expect(result.success).toBe(true);

      const spellResult = context.getTemporary('castSpell_spellResult') as {
        damage?: number[] | null;
        healing?: number | null;
        statusEffects?: unknown;
        narrative?: string;
      };
      expect(spellResult.healing).toBeDefined();
      expect(spellResult.damage).toBeNull();
    });
  });

  describe('OSRIC compliance - spell mechanics', () => {
    it('should use OSRIC saving throw mechanics', async () => {
      const saveSpell = createMockSpell({
        savingThrow: 'Spells, Rods, or Staves',
      });

      context.setTemporary('castSpell_spell', saveSpell);

      const result = await rule.execute(context);

      expect(result.success).toBe(true);

      const effectResults = context.getTemporary('castSpell_effectResults') as Array<{
        damage: number[] | null;
        healing: number | null;
        statusEffects: unknown;
        narrative: string;
        savingThrow?: unknown;
      }>;
      expect(effectResults[0]?.savingThrow).toBeGreaterThanOrEqual(1);
      expect(effectResults[0]?.savingThrow).toBeLessThanOrEqual(20);
    });

    it('should respect component requirements', async () => {
      const materialSpell = createMockSpell({
        components: ['V', 'S', 'M'],
        materialComponents: ['bat guano and sulfur'],
      });

      context.setTemporary('castSpell_spell', materialSpell);

      const result = await rule.execute(context);

      expect(result.success).toBe(true);
    });
  });
});
