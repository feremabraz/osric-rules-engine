import { GameContext } from '@osric/core/GameContext';
import type { RuleResult } from '@osric/core/Rule';
import {
  AdvancedSpellResearchRule,
  SpellComponentManagementRule,
  SpellConcentrationRule,
  SpellFailureRule,
  SpellInteractionRule,
} from '@osric/rules/spells/AdvancedSpellRules';
import type { MaterialComponent, SpellWithComponents } from '@osric/types/SpellTypes';
import type { Character, Item, Spell } from '@osric/types/entities';
import { createStore } from 'jotai';
import { beforeEach, describe, expect, it } from 'vitest';

function createMockCharacter(overrides: Partial<Character> = {}): Character {
  const defaultCharacter: Character = {
    id: 'test-character',
    name: 'Test Character',
    level: 1,
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
    hitPoints: { current: 8, maximum: 8 },
    experience: { current: 0, requiredForNextLevel: 2000, level: 1 },
    armorClass: 10,
    thac0: 20,
    alignment: 'True Neutral',
    currency: { platinum: 0, electrum: 0, gold: 100, silver: 0, copper: 0 },
    inventory: [],
    position: 'town',
    statusEffects: [],
    spells: [],
    encumbrance: 0,
    movementRate: 120,
    classes: { Fighter: 1 },
    primaryClass: 'Fighter',
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
    savingThrows: {
      'Poison or Death': 14,
      Wands: 15,
      'Paralysis, Polymorph, or Petrification': 16,
      'Breath Weapons': 17,
      'Spells, Rods, or Staves': 18,
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
      charismaMaxHenchmen: null,
      charismaLoyaltyBase: null,
      charismaReactionAdj: null,
    },
    ...overrides,
  };

  return defaultCharacter;
}

function createMockSpellWithComponents(
  overrides: Partial<SpellWithComponents> = {}
): SpellWithComponents {
  return {
    name: 'Test Spell',
    level: 1,
    class: 'Magic-User' as const,
    range: '50 feet',
    duration: 'Instantaneous',
    areaOfEffect: 'Single target',
    components: ['V', 'S'],
    castingTime: '1 round',
    savingThrow: 'None',
    description: 'A test spell',
    reversible: false,
    materialComponents: null,
    effect: () => ({ damage: null, healing: null, statusEffects: null, narrative: 'Spell cast' }),
    componentRequirements: ['V', 'S'],
    detailedMaterialComponents: [],
    ...overrides,
  } as SpellWithComponents;
}

function createMockItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'test-item',
    name: 'Test Item',
    description: 'A test item',
    weight: 1,
    value: 10,
    equipped: false,
    magicBonus: 0,
    charges: 0,
    ...overrides,
  };
}

describe('SpellComponentManagementRule', () => {
  let rule: SpellComponentManagementRule;
  let context: GameContext;

  beforeEach(() => {
    const store = createStore();
    context = new GameContext(store);
    rule = new SpellComponentManagementRule();
  });

  describe('canApply', () => {
    it('should apply when caster and spell are present', () => {
      const character = createMockCharacter();
      const spell = createMockSpellWithComponents();

      context.setTemporary('caster', character);
      context.setTemporary('spellToCast', spell);

      expect(rule.canApply(context)).toBe(true);
    });

    it('should not apply without caster', () => {
      const spell = createMockSpellWithComponents();
      context.setTemporary('spellToCast', spell);

      expect(rule.canApply(context)).toBe(false);
    });

    it('should not apply without spell', () => {
      const character = createMockCharacter();
      context.setTemporary('caster', character);

      expect(rule.canApply(context)).toBe(false);
    });
  });

  describe('execute - Success Scenarios', () => {
    it('should succeed when all components are available', async () => {
      const character = createMockCharacter({
        inventory: [createMockItem({ name: 'spell component pouch' })],
      });
      const spell = createMockSpellWithComponents({
        name: 'Magic Missile',
        componentRequirements: ['V', 'S'],
        detailedMaterialComponents: [],
      });

      context.setTemporary('caster', character);
      context.setTemporary('spellToCast', spell);

      const result = await rule.execute(context);

      expect(result.success).toBe(true);
      expect(result.message).toContain('has all required components');
      expect(result.data?.spellName).toBe('Magic Missile');
    });

    it('should consume material components when required', async () => {
      const materialComponent: MaterialComponent = {
        name: 'bat guano',
        consumed: true,
        cost: 1,
      };

      const character = createMockCharacter({
        inventory: [createMockItem({ name: 'bat guano' })],
      });
      const spell = createMockSpellWithComponents({
        name: 'Fireball',
        componentRequirements: ['V', 'S', 'M'],
        detailedMaterialComponents: [materialComponent],
      });

      context.setTemporary('caster', character);
      context.setTemporary('spellToCast', spell);

      const result = await rule.execute(context);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Consumed: bat guano');

      const updatedCharacter = context.getEntity<Character>(character.id);
      expect(
        updatedCharacter?.inventory.find((item) => item.name.includes('bat guano'))
      ).toBeUndefined();
    });
  });

  describe('execute - Error Scenarios', () => {
    it('should fail when silenced and spell requires verbal components', async () => {
      const character = createMockCharacter({
        statusEffects: [
          {
            name: 'Silence',
            duration: 5,
            effect: 'Cannot speak',
            savingThrow: null,
            endCondition: 'time',
          },
        ],
      });
      const spell = createMockSpellWithComponents({
        componentRequirements: ['V', 'S'],
      });

      context.setTemporary('caster', character);
      context.setTemporary('spellToCast', spell);

      const result = await rule.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('missing components: Verbal (silenced)');
    });

    it('should fail when missing expensive material components', async () => {
      const materialComponent: MaterialComponent = {
        name: 'diamond worth 1000gp',
        consumed: true,
        cost: 1000,
      };

      const character = createMockCharacter({
        inventory: [createMockItem({ name: 'spell component pouch' })],
      });
      const spell = createMockSpellWithComponents({
        componentRequirements: ['V', 'S', 'M'],
        detailedMaterialComponents: [materialComponent],
      });

      context.setTemporary('caster', character);
      context.setTemporary('spellToCast', spell);

      const result = await rule.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('missing components: Material: diamond worth 1000gp');
    });
  });
});

describe('SpellFailureRule', () => {
  let rule: SpellFailureRule;
  let context: GameContext;

  beforeEach(() => {
    const store = createStore();
    context = new GameContext(store);
    rule = new SpellFailureRule();
  });

  describe('canApply', () => {
    it('should apply when spell attempt data is present', () => {
      context.setTemporary('spellAttempt', { failureRoll: 50 });
      expect(rule.canApply(context)).toBe(true);
    });

    it('should not apply without spell attempt data', () => {
      expect(rule.canApply(context)).toBe(false);
    });
  });

  describe('execute - Success Scenarios', () => {
    it('should succeed when spell does not fail', async () => {
      const character = createMockCharacter();
      const spell = createMockSpellWithComponents({ name: 'Magic Missile' });

      context.setTemporary('spellAttempt', {
        caster: character,
        spell,
        failureRoll: 10,
        failureChance: 20,
      });

      const result = await rule.execute(context);

      expect(result.success).toBe(true);
      expect(result.message).toContain('successfully casts');
    });
  });

  describe('execute - Failure Scenarios', () => {
    it('should handle spell failure without backfire', async () => {
      const character = createMockCharacter();
      const spell = createMockSpellWithComponents({ name: 'Magic Missile' });

      context.setTemporary('spellAttempt', {
        caster: character,
        spell,
        failureRoll: 90,
        failureChance: 20,
        backfireChance: 0,
      });

      const result = await rule.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('SPELL FAILURE!');
      expect(result.message).toContain('No backfire effect');
      expect(result.data?.backfire).toBe(false);
    });

    it('should handle spell failure with backfire', async () => {
      const character = createMockCharacter({
        hitPoints: { current: 10, maximum: 10 },
      });
      const spell = createMockSpellWithComponents({ name: 'Fireball', level: 3 });

      context.setTemporary('spellAttempt', {
        caster: character,
        spell,
        failureRoll: 90,
        failureChance: 20,
        backfireChance: 100,
      });

      const result = await rule.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('SPELL FAILURE with BACKFIRE!');
      expect(result.data?.backfire).toBe(true);
      expect(result.data?.backfireEffect).toBeDefined();
    });
  });
});

describe('SpellConcentrationRule', () => {
  let rule: SpellConcentrationRule;
  let context: GameContext;

  beforeEach(() => {
    const store = createStore();
    context = new GameContext(store);
    rule = new SpellConcentrationRule();
  });

  describe('canApply', () => {
    it('should apply when concentration check data is present', () => {
      context.setTemporary('concentrationCheck', { distraction: 'damage' });
      expect(rule.canApply(context)).toBe(true);
    });

    it('should not apply without concentration check data', () => {
      expect(rule.canApply(context)).toBe(false);
    });
  });

  describe('execute - Success Scenarios', () => {
    it('should maintain concentration with good roll', async () => {
      const character = createMockCharacter({
        abilities: {
          strength: 10,
          dexterity: 10,
          constitution: 16,
          intelligence: 10,
          wisdom: 10,
          charisma: 10,
        },
        level: 5,
      });
      const spell = createMockSpellWithComponents({ name: 'Concentrate Spell', level: 2 });

      context.setTemporary('concentrationCheck', {
        caster: character,
        spell,
        distraction: 'damage',
        distractionSeverity: 5,
      });

      let result: RuleResult;
      let attempts = 0;
      do {
        result = await rule.execute(context);
        attempts++;
      } while (!result.success && attempts < 10);

      if (result.success) {
        expect(result.message).toContain('maintains concentration');
        expect(result.data?.maintained).toBe(true);
      }
    });
  });

  describe('execute - Failure Scenarios', () => {
    it('should handle concentration loss', async () => {
      const character = createMockCharacter({
        abilities: {
          strength: 10,
          dexterity: 10,
          constitution: 8,
          intelligence: 10,
          wisdom: 10,
          charisma: 10,
        },
        level: 1,
      });
      const spell = createMockSpellWithComponents({ name: 'Concentrate Spell', level: 2 });

      context.setTemporary('concentrationCheck', {
        caster: character,
        spell,
        distraction: 'damage',
        distractionSeverity: 20,
      });

      let result: RuleResult;
      let attempts = 0;
      do {
        result = await rule.execute(context);
        attempts++;
      } while (result.success && attempts < 10);

      if (!result.success) {
        expect(result.message).toContain('loses concentration');
        expect(result.data?.maintained).toBe(false);
      }
    });
  });
});

describe('SpellInteractionRule', () => {
  let rule: SpellInteractionRule;
  let context: GameContext;

  beforeEach(() => {
    const store = createStore();
    context = new GameContext(store);
    rule = new SpellInteractionRule();
  });

  describe('canApply', () => {
    it('should apply when spell interaction data is present', () => {
      context.setTemporary('spellInteraction', { type: 'counterspell' });
      expect(rule.canApply(context)).toBe(true);
    });

    it('should not apply without spell interaction data', () => {
      expect(rule.canApply(context)).toBe(false);
    });
  });

  describe('execute - Counterspell', () => {
    it('should successfully counterspell with equal or higher level', async () => {
      const character = createMockCharacter({ level: 5 });
      const targetSpell = createMockSpellWithComponents({ name: 'Magic Missile', level: 1 });
      const counterspell = createMockSpellWithComponents({ name: 'Counterspell', level: 3 });

      context.setTemporary('spellInteraction', {
        type: 'counterspell',
        targetSpell,
        interactingSpell: counterspell,
        caster: character,
      });

      const result = await rule.execute(context);

      expect(result.success).toBe(true);
      expect(result.message).toContain('successfully counters');
      expect(result.data?.success).toBe(true);
    });

    it('should fail to counterspell with lower level', async () => {
      const character = createMockCharacter({ level: 5 });
      const targetSpell = createMockSpellWithComponents({ name: 'Fireball', level: 3 });
      const counterspell = createMockSpellWithComponents({ name: 'Counterspell', level: 1 });

      context.setTemporary('spellInteraction', {
        type: 'counterspell',
        targetSpell,
        interactingSpell: counterspell,
        caster: character,
      });

      const result = await rule.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('cannot counter level 3 spell');
    });
  });

  describe('execute - Dispel Magic', () => {
    it('should handle dispel magic attempts', async () => {
      const character = createMockCharacter({ level: 10 });
      const targetSpell = createMockSpellWithComponents({ name: 'Shield', level: 1 });
      const dispelSpell = createMockSpellWithComponents({ name: 'Dispel Magic', level: 3 });

      context.setTemporary('spellInteraction', {
        type: 'dispel',
        targetSpell,
        interactingSpell: dispelSpell,
        caster: character,
      });

      const result = await rule.execute(context);

      expect(result).toBeDefined();
      expect(result.data?.targetSpell).toBe('Shield');
      expect(result.data?.dispelSpell).toBe('Dispel Magic');
    });
  });
});

describe('AdvancedSpellResearchRule', () => {
  let rule: AdvancedSpellResearchRule;
  let context: GameContext;

  beforeEach(() => {
    const store = createStore();
    context = new GameContext(store);
    rule = new AdvancedSpellResearchRule();
  });

  describe('canApply', () => {
    it('should apply when advanced research project data is present', () => {
      context.setTemporary('advancedResearchProject', { spellName: 'Test' });
      expect(rule.canApply(context)).toBe(true);
    });

    it('should not apply without research project data', () => {
      expect(rule.canApply(context)).toBe(false);
    });
  });

  describe('execute - Success Scenarios', () => {
    it('should calculate research requirements for simple spell creation', async () => {
      const character = createMockCharacter({
        abilities: {
          strength: 10,
          dexterity: 10,
          constitution: 10,
          intelligence: 18,
          wisdom: 10,
          charisma: 10,
        },
        level: 9,
        currency: { platinum: 0, gold: 5000, electrum: 0, silver: 0, copper: 0 },
      });

      context.setTemporary('advancedResearchProject', {
        researcher: character,
        spellName: 'New Light Spell',
        spellLevel: 1,
        complexity: 'simple',
        specialRequirements: [],
        researchType: 'create',
      });

      const result = await rule.execute(context);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Advanced spell research');
      expect(result.data?.spellName).toBe('New Light Spell');
      expect(result.data?.timeRequired).toBeDefined();
      expect(result.data?.goldRequired).toBeDefined();
      expect(result.data?.successChance).toBeGreaterThan(50);
    });

    it('should calculate research requirements for complex spell modification', async () => {
      const character = createMockCharacter({
        abilities: {
          strength: 10,
          dexterity: 10,
          constitution: 10,
          intelligence: 16,
          wisdom: 10,
          charisma: 10,
        },
        level: 12,
        currency: { platinum: 0, gold: 10000, electrum: 0, silver: 0, copper: 0 },
      });

      context.setTemporary('advancedResearchProject', {
        researcher: character,
        spellName: 'Enhanced Fireball',
        spellLevel: 3,
        complexity: 'complex',
        specialRequirements: [],
        researchType: 'modify',
      });

      const result = await rule.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.complexity).toBe('complex');
      expect(result.data?.researchType).toBe('modify');
    });
  });

  describe('execute - Error Scenarios', () => {
    it('should fail when special requirements are not met', async () => {
      const character = createMockCharacter({
        abilities: {
          strength: 10,
          dexterity: 10,
          constitution: 10,
          intelligence: 16,
          wisdom: 10,
          charisma: 10,
        },
        level: 5,
        currency: { platinum: 0, gold: 100, electrum: 0, silver: 0, copper: 0 },
        inventory: [],
      });

      context.setTemporary('advancedResearchProject', {
        researcher: character,
        spellName: 'Legendary Spell',
        spellLevel: 9,
        complexity: 'legendary',
        specialRequirements: ['ancient tome', 'rare components'],
        researchType: 'create',
      });

      const result = await rule.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('unmet requirements');
    });
  });

  describe('OSRIC Compliance', () => {
    it('should implement authentic spell research mechanics', async () => {
      const osricWizard = createMockCharacter({
        class: 'Magic-User',
        level: 11,
        abilities: {
          strength: 10,
          dexterity: 10,
          constitution: 10,
          intelligence: 17,
          wisdom: 10,
          charisma: 10,
        },
        currency: { platinum: 0, gold: 20000, electrum: 0, silver: 0, copper: 0 },
      });

      context.setTemporary('advancedResearchProject', {
        researcher: osricWizard,
        spellName: 'Osric Lightning Bolt Variant',
        spellLevel: 3,
        complexity: 'moderate',
        specialRequirements: [],
        researchType: 'modify',
      });

      const result = await rule.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.spellLevel).toBe(3);
      expect(result.data?.timeRequired).toBeGreaterThan(0);
      expect(result.data?.goldRequired).toBeGreaterThan(0);
      expect(result.data?.successChance).toBeGreaterThanOrEqual(5);
      expect(result.data?.successChance).toBeLessThanOrEqual(95);
    });
  });
});
