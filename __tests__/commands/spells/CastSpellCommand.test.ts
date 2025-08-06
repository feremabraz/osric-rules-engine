import { createStore } from 'jotai';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CastSpellCommand } from '../../../osric/commands/spells/CastSpellCommand';
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
  } as Character;

  return { ...baseCharacter, ...overrides };
}

function createMockTarget(overrides: Partial<Character> = {}): Character {
  const baseTarget: Character = {
    id: 'target1',
    name: 'Test Target',
    race: 'Human',
    class: 'Fighter',
    level: 3,
    abilities: {
      strength: 16,
      dexterity: 12,
      constitution: 14,
      intelligence: 10,
      wisdom: 11,
      charisma: 10,
    },
    abilityModifiers: {
      strengthHitAdj: 1,
      strengthDamageAdj: 1,
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
      constitutionHitPoints: 1,
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
    hitPoints: { current: 25, maximum: 25 },
    armorClass: 5,
    thac0: 18,
    alignment: 'True Neutral',
    experience: { current: 5000, requiredForNextLevel: 8000, level: 3 },
    savingThrows: {
      'Poison or Death': 14,
      Wands: 16,
      'Paralysis, Polymorph, or Petrification': 15,
      'Breath Weapons': 17,
      'Spells, Rods, or Staves': 17,
    },
    spells: [],
    currency: { platinum: 0, gold: 50, electrum: 0, silver: 0, copper: 0 },
    encumbrance: 0,
    movementRate: 120,
    classes: { Fighter: 3 },
    primaryClass: null,
    spellSlots: {},
    memorizedSpells: {},
    spellbook: [],
    thiefSkills: null,
    turnUndead: null,
    languages: ['Common'],
    age: 22,
    ageCategory: 'Adult',
    henchmen: [],
    racialAbilities: [],
    classAbilities: [],
    proficiencies: [],
    secondarySkills: [],
    inventory: [],
    position: 'dungeon',
    statusEffects: [],
  } as Character;

  return { ...baseTarget, ...overrides };
}

describe('CastSpellCommand', () => {
  let context: GameContext;
  let wizard: Character;
  let target: Character;

  beforeEach(() => {
    vi.clearAllMocks();
    const store = createStore();
    context = new GameContext(store);

    wizard = createMockWizard();
    target = createMockTarget();

    context.setEntity(wizard.id, wizard);
    context.setEntity(target.id, target);
  });

  describe('Basic Spell Casting', () => {
    it('should successfully cast Magic Missile', async () => {
      const command = new CastSpellCommand('wizard1', 'Magic Missile', ['target1']);
      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Test Wizard casts Magic Missile');

      expect(context.getTemporary('castSpell_caster')).toBeDefined();
      expect(context.getTemporary('castSpell_spell')).toBeDefined();
      expect(context.getTemporary('castSpell_targets')).toBeDefined();
    });

    it('should successfully cast Shield on self', async () => {
      const command = new CastSpellCommand('wizard1', 'Shield', ['wizard1']);
      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Test Wizard casts Shield');

      const spell = context.getTemporary('castSpell_spell') as Spell;
      expect(spell.name).toBe('Shield');
    });

    it('should successfully cast Web spell', async () => {
      const command = new CastSpellCommand('wizard1', 'Web', ['target1']);
      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Test Wizard casts Web');

      const targets = context.getTemporary('castSpell_targets') as Character[];
      expect(targets).toHaveLength(1);
      expect(targets[0].name).toBe('Test Target');
    });
  });

  describe('Spell Validation', () => {
    it('should fail if caster is not found', async () => {
      const command = new CastSpellCommand('nonexistent', 'Magic Missile', ['target1']);
      const result = await command.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Caster with ID nonexistent not found');
    });

    it('should fail if caster is not a spellcaster', async () => {
      const fighter = createMockTarget({ id: 'fighter1', class: 'Fighter' });
      context.setEntity(fighter.id, fighter);

      const command = new CastSpellCommand('fighter1', 'Magic Missile', ['target1']);
      const result = await command.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('is not a spellcasting class');
    });

    it('should fail if spell is not memorized', async () => {
      const command = new CastSpellCommand('wizard1', 'Fireball', ['target1']);
      const result = await command.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('does not have Fireball memorized or available');
    });

    it('should fail if no spell slots available', async () => {
      const wizardNoSlots = createMockWizard({
        memorizedSpells: { 1: [], 2: [], 3: [] },
      });
      context.setEntity(wizardNoSlots.id, wizardNoSlots);

      const command = new CastSpellCommand('wizard1', 'Magic Missile', ['target1']);
      const result = await command.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('does not have Magic Missile memorized or available');
    });

    it('should handle canExecute validation correctly', async () => {
      const command = new CastSpellCommand('wizard1', 'Magic Missile', ['target1']);
      expect(command.canExecute(context)).toBe(true);

      const invalidCommand = new CastSpellCommand('wizard1', 'NonExistentSpell', ['target1']);
      expect(invalidCommand.canExecute(context)).toBe(false);
    });
  });

  describe('Command Data Setup', () => {
    it('should set up spell casting data correctly', async () => {
      const command = new CastSpellCommand('wizard1', 'Magic Missile', ['target1']);
      const result = await command.execute(context);

      expect(result.success).toBe(true);

      const caster = context.getTemporary('castSpell_caster') as Character;
      const spell = context.getTemporary('castSpell_spell') as Spell;
      const targets = context.getTemporary('castSpell_targets') as Character[];

      expect(caster.name).toBe('Test Wizard');
      expect(spell.name).toBe('Magic Missile');
      expect(targets).toHaveLength(1);
      expect(targets[0].name).toBe('Test Target');
    });

    it('should handle overrideComponents flag correctly', async () => {
      const command = new CastSpellCommand('wizard1', 'Shield', ['wizard1'], 1, true);
      const result = await command.execute(context);

      expect(result.success).toBe(true);

      const overrideComponents = context.getTemporary('castSpell_overrideComponents');
      expect(overrideComponents).toBe(true);
    });

    it('should specify required rules correctly', async () => {
      const command = new CastSpellCommand('wizard1', 'Magic Missile', ['target1']);
      const requiredRules = command.getRequiredRules();

      expect(requiredRules).toEqual([
        'SpellCastingValidation',
        'ComponentTracking',
        'SpellSlotConsumption',
        'SpellEffectResolution',
      ]);
    });
  });
});
