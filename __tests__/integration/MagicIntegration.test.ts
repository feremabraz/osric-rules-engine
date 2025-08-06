import { createStore } from 'jotai';
import { beforeEach, describe, expect, it } from 'vitest';
import { CastSpellCommand } from '../../osric/commands/spells/CastSpellCommand';
import { MemorizeSpellCommand } from '../../osric/commands/spells/MemorizeSpellCommand';
import { GameContext } from '../../osric/core/GameContext';
import { SpellCastingRules } from '../../osric/rules/spells/SpellCastingRules';
import type { Character, Spell } from '../../osric/types/entities';

function createMockWizard(): Character {
  return {
    id: 'wizard1',
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
    },
    spellbook: [
      {
        name: 'Detect Magic',
        level: 1,
        class: 'Magic-User',
        castingTime: '1 segment',
        range: '60 feet',
        duration: '2 rounds',
        areaOfEffect: 'Self',
        description: 'Detects magical auras',
        components: ['V', 'S'],
        savingThrow: 'None',
        reversible: false,
        materialComponents: null,
        effect: () => ({
          damage: null,
          healing: null,
          statusEffects: null,
          narrative: 'Magical auras become visible',
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
    statusEffects: [],
    position: 'Room 1',
  };
}

describe('Phase 4 Magic System Integration', () => {
  let context: GameContext;
  let wizard: Character;

  beforeEach(() => {
    const store = createStore();
    context = new GameContext(store);
    wizard = createMockWizard();

    context.setEntity(wizard.id, wizard);
  });

  describe('Command Integration', () => {
    it('should successfully create and execute CastSpellCommand', async () => {
      const spell = wizard.memorizedSpells[1][0];
      const command = new CastSpellCommand(wizard.id, spell.name);

      expect(command.canExecute(context)).toBe(true);

      const result = await command.execute(context);
      expect(result.success).toBe(true);
      expect(result.message).toContain('Test Wizard casts Magic Missile');
    });

    it('should successfully create and execute MemorizeSpellCommand', async () => {
      const command = new MemorizeSpellCommand(wizard.id, 'Detect Magic', 1);

      expect(command.canExecute(context)).toBe(true);

      const result = await command.execute(context);
      expect(result.success).toBe(true);
      expect(result.message).toContain('Test Wizard memorizes Detect Magic');
    });
  });

  describe('Rule Integration', () => {
    it('should successfully execute SpellCastingRules with proper context', async () => {
      const spell = wizard.memorizedSpells[1][0];
      const rule = new SpellCastingRules();
      const target = createMockWizard();
      target.id = 'target1';
      context.setEntity(target.id, target);

      context.setTemporary('castSpell_caster', wizard);
      context.setTemporary('castSpell_spell', spell);
      context.setTemporary('castSpell_targets', [target]);

      expect(rule.canApply(context)).toBe(true);

      const result = await rule.execute(context);
      expect(result.success).toBe(true);
    });
  });

  describe('Command-Rule Integration', () => {
    it('should have commands specify correct rule requirements', () => {
      const castCommand = new CastSpellCommand(wizard.id, 'Magic Missile');
      const memorizeCommand = new MemorizeSpellCommand(wizard.id, 'Detect Magic', 1);

      expect(castCommand.getRequiredRules()).toContain('SpellCastingValidation');
      expect(memorizeCommand.getRequiredRules()).toContain('SpellMemorizationValidation');
    });
  });

  describe('Data Validation', () => {
    it('should have correctly structured character data', () => {
      expect(wizard.spellSlots).toBeDefined();
      expect(wizard.memorizedSpells).toBeDefined();
      expect(wizard.spellbook).toBeDefined();
      expect(wizard.class).toBe('Magic-User');
    });

    it('should have correctly structured spell data', () => {
      const memorizedSpell = wizard.memorizedSpells[1][0];
      const spellbookSpell = wizard.spellbook[0];

      expect(memorizedSpell.name).toBeDefined();
      expect(memorizedSpell.level).toBeDefined();
      expect(memorizedSpell.components).toBeDefined();
      expect(Array.isArray(memorizedSpell.components)).toBe(true);

      expect(spellbookSpell.name).toBeDefined();
      expect(spellbookSpell.level).toBeDefined();
      expect(spellbookSpell.components).toBeDefined();
      expect(Array.isArray(spellbookSpell.components)).toBe(true);
    });
  });
});
