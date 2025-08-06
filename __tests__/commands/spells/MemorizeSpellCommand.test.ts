import { createStore } from 'jotai';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemorizeSpellCommand } from '../../../osric/commands/spells/MemorizeSpellCommand';
import { GameContext } from '../../../osric/core/GameContext';
import type { Character, Spell } from '../../../osric/types/entities';

function createMockWizard(overrides: Partial<Character> = {}): Character {
  const baseCharacter: Character = {
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
          statusEffects: [
            {
              name: 'Shield',
              duration: 25,
              effect: '+4 AC vs missiles',
              savingThrow: null,
              endCondition: null,
            },
          ],
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
          statusEffects: [
            {
              name: 'Entangled',
              duration: 20,
              effect: 'Cannot move or act',
              savingThrow: null,
              endCondition: 'strength check',
            },
          ],
          narrative: 'Sticky webs entangle target',
        }),
      },
      {
        name: 'Fireball',
        level: 3,
        class: 'Magic-User',
        castingTime: '3 segments',
        range: '160 yards',
        duration: 'Instantaneous',
        areaOfEffect: '20-foot radius sphere',
        description: 'Creates an explosive fireball dealing damage',
        components: ['V', 'S', 'M'],
        savingThrow: 'Spells, Rods, or Staves',
        reversible: false,
        materialComponents: ['bat guano and sulfur'],
        effect: () => ({
          damage: [6, 6, 6, 6, 6],
          healing: null,
          statusEffects: null,
          narrative: 'Fireball explodes',
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
  } as Character;

  return { ...baseCharacter, ...overrides };
}

describe('MemorizeSpellCommand', () => {
  let context: GameContext;
  let wizard: Character;

  beforeEach(() => {
    vi.clearAllMocks();
    const store = createStore();
    context = new GameContext(store);

    wizard = createMockWizard();
    context.setEntity(wizard.id, wizard);
  });

  describe('Basic Spell Memorization', () => {
    it('should successfully memorize Magic Missile', async () => {
      const command = new MemorizeSpellCommand('wizard1', 'Magic Missile', 1);
      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Test Wizard memorizes Magic Missile');

      expect(context.getTemporary('memorizeSpell_caster')).toBeDefined();
      expect(context.getTemporary('memorizeSpell_spell')).toBeDefined();
      expect(context.getTemporary('memorizeSpell_level')).toBe(1);
    });

    it('should successfully memorize a 2nd level spell', async () => {
      const command = new MemorizeSpellCommand('wizard1', 'Web', 2);
      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Test Wizard memorizes Web');

      const spell = context.getTemporary('memorizeSpell_spell') as Spell;
      expect(spell.name).toBe('Web');
      expect(spell.level).toBe(2);
    });

    it('should successfully memorize a 3rd level spell', async () => {
      const command = new MemorizeSpellCommand('wizard1', 'Fireball', 3);
      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Test Wizard memorizes Fireball');
    });
  });

  describe('Spell Validation', () => {
    it('should fail if caster is not found', async () => {
      const command = new MemorizeSpellCommand('nonexistent', 'Magic Missile', 1);
      const result = await command.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Caster with ID nonexistent not found');
    });

    it('should fail if caster is not a spellcaster', async () => {
      const fighter: Character = createMockWizard({
        id: 'fighter1',
        class: 'Fighter',
        classes: { Fighter: 3 },
        spellbook: [],
      });
      context.setEntity(fighter.id, fighter);

      const command = new MemorizeSpellCommand('fighter1', 'Magic Missile', 1);
      const result = await command.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('is not a spellcasting class');
    });

    it('should fail if spell is not in spellbook', async () => {
      const command = new MemorizeSpellCommand('wizard1', 'Lightning Bolt', 3);
      const result = await command.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('does not have access to Lightning Bolt');
    });

    it('should fail if spell level is too high for caster', async () => {
      const lowLevelWizard = createMockWizard({
        level: 1,
        spellSlots: { 1: 1 },
      });
      context.setEntity(lowLevelWizard.id, lowLevelWizard);

      const command = new MemorizeSpellCommand('wizard1', 'Fireball', 3);
      const result = await command.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('has no spell slots for level 3');
    });

    it('should handle canExecute validation correctly', async () => {
      const command = new MemorizeSpellCommand('wizard1', 'Magic Missile', 1);
      expect(command.canExecute(context)).toBe(true);

      const invalidCommand = new MemorizeSpellCommand('wizard1', 'NonExistentSpell', 1);
      expect(invalidCommand.canExecute(context)).toBe(false);
    });
  });

  describe('Spell Slots and Prerequisites', () => {
    it('should handle intelligence-based spell learning limits', async () => {
      const wizardLowInt = createMockWizard({
        abilities: { ...wizard.abilities, intelligence: 10 },
        abilityModifiers: {
          ...wizard.abilityModifiers,
          intelligenceLearnSpells: 35,
          intelligenceMaxSpellLevel: 4,
        },
      });
      context.setEntity(wizardLowInt.id, wizardLowInt);

      const command = new MemorizeSpellCommand('wizard1', 'Magic Missile', 1);
      const result = await command.execute(context);

      expect(result.success).toBe(true);

      const caster = context.getTemporary('memorizeSpell_caster') as Character;
      expect(caster.abilityModifiers.intelligenceLearnSpells).toBe(35);
    });

    it('should set up data for spell slot validation', async () => {
      const command = new MemorizeSpellCommand('wizard1', 'Magic Missile', 1);
      const result = await command.execute(context);

      expect(result.success).toBe(true);

      const caster = context.getTemporary('memorizeSpell_caster') as Character;
      expect(caster.spellSlots).toBeDefined();
      expect(caster.spellSlots[1]).toBe(4);
      expect(caster.memorizedSpells[1]).toHaveLength(0);
    });

    it('should specify required rules correctly', async () => {
      const command = new MemorizeSpellCommand('wizard1', 'Magic Missile', 1);
      const requiredRules = command.getRequiredRules();

      expect(requiredRules).toEqual([
        'SpellMemorizationValidation',
        'SpellSlotAllocation',
        'RestRequirements',
      ]);
    });
  });

  describe('Time and Location Requirements', () => {
    it('should handle memorization in appropriate locations', async () => {
      const wizardInTown = createMockWizard({ position: 'town' });
      context.setEntity(wizardInTown.id, wizardInTown);

      const command = new MemorizeSpellCommand('wizard1', 'Magic Missile', 1);
      const result = await command.execute(context);

      expect(result.success).toBe(true);

      const caster = context.getTemporary('memorizeSpell_caster') as Character;
      expect(caster.position).toBe('town');
    });

    it('should set up rest requirement data', async () => {
      const tiredWizard = createMockWizard({
        statusEffects: [
          {
            name: 'Fatigued',
            duration: 8,
            effect: 'Needs rest before memorizing spells',
            savingThrow: null,
            endCondition: 'rest',
          },
        ],
      });
      context.setEntity(tiredWizard.id, tiredWizard);

      const command = new MemorizeSpellCommand('wizard1', 'Shield', 1);
      const result = await command.execute(context);

      expect(result.success).toBe(true);

      const caster = context.getTemporary('memorizeSpell_caster') as Character;
      expect(caster.statusEffects).toHaveLength(1);
      expect(caster.statusEffects[0].name).toBe('Fatigued');
    });
  });

  describe('Command Data Setup', () => {
    it('should set up memorization data correctly', async () => {
      const command = new MemorizeSpellCommand('wizard1', 'Web', 2);
      const result = await command.execute(context);

      expect(result.success).toBe(true);

      const caster = context.getTemporary('memorizeSpell_caster') as Character;
      const spell = context.getTemporary('memorizeSpell_spell') as Spell;
      const level = context.getTemporary('memorizeSpell_level');

      expect(caster.name).toBe('Test Wizard');
      expect(spell.name).toBe('Web');
      expect(spell.level).toBe(2);
      expect(level).toBe(2);
    });

    it('should handle different spell levels correctly', async () => {
      const commands = [
        new MemorizeSpellCommand('wizard1', 'Magic Missile', 1),
        new MemorizeSpellCommand('wizard1', 'Web', 2),
        new MemorizeSpellCommand('wizard1', 'Fireball', 3),
      ];

      for (const command of commands) {
        const result = await command.execute(context);
        expect(result.success).toBe(true);
      }
    });
  });
});
