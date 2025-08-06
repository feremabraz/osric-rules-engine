import { createStore } from 'jotai';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameContext } from '../../../osric/core/GameContext';
import { ComponentTrackingRules } from '../../../osric/rules/spells/ComponentTrackingRules';
import { COMMAND_TYPES, RULE_NAMES } from '../../../osric/types/constants';
import type { AbilityScoreModifiers, Character, Item, Spell } from '../../../osric/types/entities';

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
    id: 'test-caster',
    name: 'Test Wizard',
    class: 'Magic-User',
    level: 5,
    hitPoints: { current: 30, maximum: 30 },
    abilities: {
      strength: 14,
      dexterity: 16,
      constitution: 13,
      intelligence: 18,
      wisdom: 12,
      charisma: 11,
    },
    armorClass: 9,
    thac0: 18,
    race: 'Human',
    alignment: 'True Neutral',
    experience: { current: 10000, requiredForNextLevel: 20000, level: 5 },
    currency: { platinum: 0, gold: 500, electrum: 0, silver: 50, copper: 25 },
    spells: [],
    savingThrows: {
      'Poison or Death': 12,
      Wands: 9,
      'Paralysis, Polymorph, or Petrification': 11,
      'Breath Weapons': 15,
      'Spells, Rods, or Staves': 8,
    },
    abilityModifiers: defaultModifiers,
    encumbrance: 0,
    movementRate: 120,
    classes: { 'Magic-User': 5 },
    primaryClass: null,
    spellSlots: { 1: 4, 2: 2, 3: 1 },
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
    inventory: [
      {
        id: 'component-pouch',
        name: 'Spell Component Pouch',
        weight: 2,
        description: 'Pouch containing basic spell components',
        value: 5,
        equipped: true,
        magicBonus: null,
        charges: null,
      },
    ],
    position: 'adventure',
    statusEffects: [],
    ...overrides,
  };
}

function createMockSpell(overrides: Partial<Spell> = {}): Spell {
  return {
    name: 'Magic Missile',
    level: 1,
    class: 'Magic-User',
    components: ['V', 'S'],
    castingTime: '1 segment',
    range: '60 + 10/level yards',
    duration: 'Instantaneous',
    areaOfEffect: 'One creature',
    savingThrow: 'None',
    description: 'Creates magical darts that automatically hit target',
    reversible: false,
    materialComponents: null,
    effect: () => ({ damage: null, healing: null, statusEffects: null, narrative: 'Test effect' }),
    ...overrides,
  };
}

function createMockItem(name: string, equipped = false): Item {
  return {
    id: `item-${name.toLowerCase().replace(/\s+/g, '-')}`,
    name,
    weight: 1,
    description: `A ${name.toLowerCase()}`,
    value: 10,
    equipped,
    magicBonus: null,
    charges: null,
  };
}

describe('ComponentTrackingRules', () => {
  let context: GameContext;
  let rules: ComponentTrackingRules;
  let caster: Character;
  let spell: Spell;

  beforeEach(() => {
    const store = createStore();
    context = new GameContext(store);
    rules = new ComponentTrackingRules();
    caster = createMockCharacter();
    spell = createMockSpell();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rule Properties', () => {
    it('should have correct rule name and description', () => {
      expect(rules.name).toBe(RULE_NAMES.COMPONENT_TRACKING);
      expect(rules.description).toBe('Validates and tracks spell component requirements');
    });
  });

  describe('Rule Application', () => {
    it('should apply when caster and spell are in context', () => {
      context.setTemporary('castSpell_caster', caster);
      context.setTemporary('castSpell_spell', spell);

      expect(rules.canApply(context)).toBe(true);
    });

    it('should not apply when caster is missing', () => {
      context.setTemporary('castSpell_spell', spell);

      expect(rules.canApply(context)).toBe(false);
    });

    it('should not apply when spell is missing', () => {
      context.setTemporary('castSpell_caster', caster);

      expect(rules.canApply(context)).toBe(false);
    });

    it('should not apply when both caster and spell are missing', () => {
      expect(rules.canApply(context)).toBe(false);
    });
  });

  describe('Component Override', () => {
    it('should skip component checking when overridden', async () => {
      context.setTemporary('castSpell_caster', caster);
      context.setTemporary('castSpell_spell', spell);
      context.setTemporary('castSpell_overrideComponents', true);

      const result = await rules.execute(context);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Component requirements overridden');
    });

    it('should check components when not overridden', async () => {
      context.setTemporary('castSpell_caster', caster);
      context.setTemporary('castSpell_spell', spell);
      context.setTemporary('castSpell_overrideComponents', false);

      const result = await rules.execute(context);

      expect(result.success).toBe(true);
      expect(result.message).toContain('All components available');
    });
  });

  describe('Verbal Components', () => {
    beforeEach(() => {
      spell = createMockSpell({ components: ['V'] });
      context.setTemporary('castSpell_caster', caster);
      context.setTemporary('castSpell_spell', spell);
    });

    it('should allow verbal components for normal caster', async () => {
      const result = await rules.execute(context);

      expect(result.success).toBe(true);
      expect(result.message).toContain('All components available');
    });

    it('should prevent verbal components when silenced', async () => {
      caster.statusEffects.push({
        name: 'Silenced',
        duration: 10,
        effect: 'Cannot speak or cast spells with verbal components',
        savingThrow: null,
        endCondition: 'Duration expires',
      });
      context.setTemporary('castSpell_caster', caster);

      const result = await rules.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('missing components');
      expect(result.message).toContain('Verbal (cannot speak)');
    });

    it('should prevent verbal components when gagged', async () => {
      caster.statusEffects.push({
        name: 'Gagged',
        duration: 0,
        effect: 'Cannot speak due to physical restraint',
        savingThrow: null,
        endCondition: 'Restraint removed',
      });
      context.setTemporary('castSpell_caster', caster);

      const result = await rules.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Verbal (cannot speak)');
    });

    it('should prevent verbal components when muted', async () => {
      caster.statusEffects.push({
        name: 'Muted',
        duration: 5,
        effect: 'Cannot speak due to curse',
        savingThrow: null,
        endCondition: 'Curse broken',
      });
      context.setTemporary('castSpell_caster', caster);

      const result = await rules.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Verbal (cannot speak)');
    });
  });

  describe('Somatic Components', () => {
    beforeEach(() => {
      spell = createMockSpell({ components: ['S'] });
      context.setTemporary('castSpell_caster', caster);
      context.setTemporary('castSpell_spell', spell);
    });

    it('should allow somatic components with free hands', async () => {
      const result = await rules.execute(context);

      expect(result.success).toBe(true);
      expect(result.message).toContain('All components available');
    });

    it('should prevent somatic components when paralyzed', async () => {
      caster.statusEffects.push({
        name: 'Paralyzed',
        duration: 10,
        effect: 'Cannot move or perform actions',
        savingThrow: null,
        endCondition: 'Hold Person spell ends',
      });
      context.setTemporary('castSpell_caster', caster);

      const result = await rules.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Somatic (need one free hand)');
    });

    it('should prevent somatic components when restrained', async () => {
      caster.statusEffects.push({
        name: 'Restrained',
        duration: 5,
        effect: 'Cannot move freely due to physical restraints',
        savingThrow: null,
        endCondition: 'Bonds broken or removed',
      });
      context.setTemporary('castSpell_caster', caster);

      const result = await rules.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Somatic (need one free hand)');
    });

    it('should allow somatic with one-handed weapon', async () => {
      caster.inventory.push(createMockItem('Long Sword', true));
      context.setTemporary('castSpell_caster', caster);

      const result = await rules.execute(context);

      expect(result.success).toBe(true);
    });

    it('should prevent somatic with shield and one-handed weapon', async () => {
      caster.inventory.push(createMockItem('Long Sword', true));
      caster.inventory.push(createMockItem('Shield', true));
      context.setTemporary('castSpell_caster', caster);

      const result = await rules.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Somatic (need one free hand)');
    });

    it('should prevent somatic with two-handed weapon', async () => {
      caster.inventory.push(createMockItem('Two-handed Sword', true));
      context.setTemporary('castSpell_caster', caster);

      const result = await rules.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Somatic (need one free hand)');
    });
  });

  describe('Material Components', () => {
    beforeEach(() => {
      spell = createMockSpell({ components: ['M'] });
      context.setTemporary('castSpell_caster', caster);
      context.setTemporary('castSpell_spell', spell);
    });

    it('should allow material components with component pouch', async () => {
      const result = await rules.execute(context);

      expect(result.success).toBe(true);
      expect(result.message).toContain('All components available');
    });

    it('should allow material components with spell focus', async () => {
      caster.inventory = [createMockItem('Crystal Spell Focus', true)];
      context.setTemporary('castSpell_caster', caster);

      const result = await rules.execute(context);

      expect(result.success).toBe(true);
    });

    it('should prevent material components without focus', async () => {
      caster.inventory = [];
      context.setTemporary('castSpell_caster', caster);

      const result = await rules.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Material (missing: spell component pouch or focus)');
    });

    it('should validate specific material components', async () => {
      spell.materialComponents = ['Pearl worth 100gp'];
      context.setTemporary('castSpell_spell', spell);

      const result = await rules.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Material (missing: Pearl worth 100gp)');
    });

    it('should find specific material components in inventory', async () => {
      spell.materialComponents = ['Pearl worth 100gp'];
      caster.inventory.push({
        id: 'pearl-100',
        name: 'Pearl',
        weight: 0.1,
        description: 'A valuable pearl',
        value: 100,
        equipped: false,
        magicBonus: null,
        charges: null,
      });
      context.setTemporary('castSpell_caster', caster);
      context.setTemporary('castSpell_spell', spell);

      const result = await rules.execute(context);

      expect(result.success).toBe(true);
    });
  });

  describe('Multiple Components', () => {
    it('should validate all component types', async () => {
      spell = createMockSpell({ components: ['V', 'S', 'M'] });
      context.setTemporary('castSpell_caster', caster);
      context.setTemporary('castSpell_spell', spell);

      const result = await rules.execute(context);

      expect(result.success).toBe(true);
      expect(result.message).toContain('All components available');
    });

    it('should report all missing components', async () => {
      spell = createMockSpell({ components: ['V', 'S', 'M'] });
      caster.statusEffects.push({
        name: 'Silenced',
        duration: 10,
        effect: 'Cannot speak or cast spells with verbal components',
        savingThrow: null,
        endCondition: 'Duration expires',
      });
      caster.statusEffects.push({
        name: 'Paralyzed',
        duration: 10,
        effect: 'Cannot move or perform actions',
        savingThrow: null,
        endCondition: 'Duration expires',
      });
      caster.inventory = [];
      context.setTemporary('castSpell_caster', caster);
      context.setTemporary('castSpell_spell', spell);

      const result = await rules.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Verbal (cannot speak)');
      expect(result.message).toContain('Somatic (need one free hand)');
      expect(result.message).toContain('Material (missing:');
    });

    it('should succeed when only some components are required', async () => {
      spell = createMockSpell({ components: ['V', 'M'] });
      context.setTemporary('castSpell_caster', caster);
      context.setTemporary('castSpell_spell', spell);

      const result = await rules.execute(context);

      expect(result.success).toBe(true);
    });
  });

  describe('Component Consumption', () => {
    it('should not consume components for normal spells', () => {
      const originalInventory = [...caster.inventory];
      const result = rules.consumeComponents(caster, spell);

      expect(result.inventory).toEqual(originalInventory);
    });

    it('should consume pearl for identify spell', () => {
      spell = createMockSpell({
        name: 'Identify',
        components: ['M'],
        materialComponents: ['Pearl worth 100gp'],
      });
      caster.inventory.push({
        id: 'pearl',
        name: 'Pearl',
        weight: 0.1,
        description: 'A valuable pearl',
        value: 100,
        equipped: false,
        magicBonus: null,
        charges: null,
      });

      const result = rules.consumeComponents(caster, spell);

      expect(result.inventory.find((item) => item.name === 'Pearl')).toBeUndefined();
    });

    it('should consume gem for magic jar spell', () => {
      spell = createMockSpell({
        name: 'Magic Jar',
        components: ['M'],
        materialComponents: ['Gem worth 100gp'],
      });
      caster.inventory.push({
        id: 'gem',
        name: 'Ruby Gem',
        weight: 0.1,
        description: 'A valuable ruby gem',
        value: 150,
        equipped: false,
        magicBonus: null,
        charges: null,
      });

      const result = rules.consumeComponents(caster, spell);

      expect(result.inventory.find((item) => item.name === 'Ruby Gem')).toBeUndefined();
    });

    it('should not consume components for spells without material components', () => {
      spell = createMockSpell({ components: ['V', 'S'] });
      const originalInventory = [...caster.inventory];

      const result = rules.consumeComponents(caster, spell);

      expect(result.inventory).toEqual(originalInventory);
    });
  });

  describe('Precious Component Validation', () => {
    it('should validate precious gems by value', async () => {
      spell = createMockSpell({
        components: ['M'],
        materialComponents: ['Precious gem worth 500gp'],
      });
      caster.inventory.push({
        id: 'emerald',
        name: 'Emerald Gem',
        weight: 0.1,
        description: 'A precious emerald gem',
        value: 600,
        equipped: false,
        magicBonus: null,
        charges: null,
      });
      context.setTemporary('castSpell_caster', caster);
      context.setTemporary('castSpell_spell', spell);

      const result = await rules.execute(context);

      expect(result.success).toBe(true);
    });

    it('should reject gems that are not valuable enough', async () => {
      spell = createMockSpell({
        components: ['M'],
        materialComponents: ['Precious gem worth 500gp'],
      });
      caster.inventory.push({
        id: 'quartz',
        name: 'Quartz Gem',
        weight: 0.1,
        description: 'A common quartz gem',
        value: 50,
        equipped: false,
        magicBonus: null,
        charges: null,
      });
      context.setTemporary('castSpell_caster', caster);
      context.setTemporary('castSpell_spell', spell);

      const result = await rules.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Material (missing: Precious gem worth 500gp)');
    });
  });

  describe('Equipment Hand Calculation', () => {
    it('should correctly calculate hands with bow and arrows', async () => {
      spell = createMockSpell({ components: ['S'] });
      caster.inventory = [createMockItem('Longbow', true)];
      context.setTemporary('castSpell_caster', caster);
      context.setTemporary('castSpell_spell', spell);

      const result = await rules.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Somatic (need one free hand)');
    });

    it('should allow somatic with quarterstaff unequipped', async () => {
      spell = createMockSpell({ components: ['S'] });
      caster.inventory = [createMockItem('Quarterstaff', false)];
      context.setTemporary('castSpell_caster', caster);
      context.setTemporary('castSpell_spell', spell);

      const result = await rules.execute(context);

      expect(result.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing caster gracefully', async () => {
      context.setTemporary('castSpell_spell', spell);

      const result = await rules.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Missing caster or spell in context');
    });

    it('should handle missing spell gracefully', async () => {
      context.setTemporary('castSpell_caster', caster);

      const result = await rules.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Missing caster or spell in context');
    });

    it('should handle exceptions gracefully', async () => {
      context.setTemporary('castSpell_caster', caster);
      context.setTemporary('castSpell_spell', spell);

      const invalidSpell = { ...spell, components: null };
      context.setTemporary('castSpell_spell', invalidSpell);

      const result = await rules.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Error checking components');
    });
  });

  describe('OSRIC Compliance', () => {
    it('should implement authentic OSRIC verbal component rules', async () => {
      spell = createMockSpell({ components: ['V'] });
      context.setTemporary('castSpell_caster', caster);
      context.setTemporary('castSpell_spell', spell);

      let result = await rules.execute(context);
      expect(result.success).toBe(true);

      caster.statusEffects.push({
        name: 'Silenced',
        duration: 10,
        effect: 'Cannot speak or cast spells with verbal components',
        savingThrow: null,
        endCondition: "Silence 15' Radius effect",
      });
      context.setTemporary('castSpell_caster', caster);
      result = await rules.execute(context);
      expect(result.success).toBe(false);
    });

    it('should implement authentic OSRIC somatic component rules', async () => {
      spell = createMockSpell({ components: ['S'] });
      context.setTemporary('castSpell_spell', spell);

      caster.inventory = [createMockItem('Shield', true), createMockItem('Sword', true)];
      context.setTemporary('castSpell_caster', caster);

      const result = await rules.execute(context);
      expect(result.success).toBe(false);
      expect(result.message).toContain('need one free hand');
    });

    it('should implement authentic OSRIC material component rules', async () => {
      spell = createMockSpell({ components: ['M'] });

      caster.inventory = [createMockItem('Spell Component Pouch', true)];
      context.setTemporary('castSpell_caster', caster);
      context.setTemporary('castSpell_spell', spell);

      let result = await rules.execute(context);
      expect(result.success).toBe(true);

      caster.inventory = [];
      context.setTemporary('castSpell_caster', caster);
      result = await rules.execute(context);
      expect(result.success).toBe(false);
    });
  });
});
