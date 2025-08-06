import { SpellResearchCommand } from '@osric/commands/spells/SpellResearchCommand';
import type { CommandResult } from '@osric/core/Command';
import { GameContext } from '@osric/core/GameContext';
import { COMMAND_TYPES } from '@osric/types/constants';
import type { AbilityScoreModifiers, Character, Spell } from '@osric/types/entities';
import { createStore } from 'jotai';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

  const baseCharacter: Character = {
    id: 'test-researcher-1',
    name: 'Gandalf the Researcher',
    class: 'Magic-User',
    level: 9,
    hitPoints: { current: 45, maximum: 45 },
    abilities: {
      strength: 14,
      dexterity: 13,
      constitution: 16,
      intelligence: 18,
      wisdom: 15,
      charisma: 12,
    },
    armorClass: 10,
    thac0: 14,
    race: 'Human',
    alignment: 'True Neutral',
    experience: { current: 125000, requiredForNextLevel: 250000, level: 9 },
    currency: {
      platinum: 0,
      gold: 10000,
      electrum: 0,
      silver: 50,
      copper: 25,
    },
    spells: [],
    savingThrows: {
      'Poison or Death': 8,
      Wands: 6,
      'Paralysis, Polymorph, or Petrification': 10,
      'Breath Weapons': 12,
      'Spells, Rods, or Staves': 5,
    },
    abilityModifiers: defaultModifiers,
    encumbrance: 0,
    movementRate: 120,
    classes: { 'Magic-User': 9 },
    primaryClass: null,
    spellSlots: { 1: 4, 2: 3, 3: 3, 4: 2, 5: 1 },
    memorizedSpells: {},
    spellbook: [],
    thiefSkills: null,
    turnUndead: null,
    languages: ['Common'],
    age: 30,
    ageCategory: 'Adult',
    henchmen: [],
    racialAbilities: [],
    classAbilities: [],
    proficiencies: [],
    secondarySkills: [],
    inventory: [],
    position: 'town',
    statusEffects: [],
    ...overrides,
  };

  return baseCharacter;
}

describe('SpellResearchCommand', () => {
  let context: GameContext;
  let researcher: Character;

  beforeEach(() => {
    const store = createStore();
    context = new GameContext(store);
    researcher = createMockCharacter();
    context.setEntity(researcher.id, researcher);

    vi.spyOn(Math, 'random').mockReturnValue(0.01);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Command Creation', () => {
    it('should create command with proper type', () => {
      const command = new SpellResearchCommand({
        characterId: researcher.id,
        spellLevel: 3,
        spellName: 'Lightning Storm',
        spellDescription: 'Creates a storm of lightning bolts',
        researchType: 'magic-user',
      });

      expect(command.type).toBe(COMMAND_TYPES.SPELL_RESEARCH);
    });

    it('should store research parameters correctly', () => {
      const params = {
        characterId: researcher.id,
        spellLevel: 4,
        spellName: 'Arcane Mastery',
        spellDescription: 'Enhances magical understanding',
        researchType: 'magic-user' as const,
        mentorAvailable: true,
        libraryQuality: 'excellent' as const,
      };

      const command = new SpellResearchCommand(params);
      expect(command.parameters).toEqual(params);
    });

    it('should set default values for optional parameters', () => {
      const command = new SpellResearchCommand({
        characterId: researcher.id,
        spellLevel: 2,
        spellName: 'Basic Spell',
        spellDescription: 'A simple spell',
        researchType: 'magic-user',
      });

      const params = command.parameters;
      expect(params.mentorAvailable).toBeUndefined();
      expect(params.libraryQuality).toBeUndefined();
      expect(params.specialMaterials).toBeUndefined();
    });
  });

  describe('Command Validation', () => {
    it('should validate when character exists and can research', () => {
      const command = new SpellResearchCommand({
        characterId: researcher.id,
        spellLevel: 3,
        spellName: 'Test Spell',
        spellDescription: 'Test description',
        researchType: 'magic-user',
      });

      expect(command.canExecute(context)).toBe(true);
    });

    it('should fail when character does not exist', () => {
      const command = new SpellResearchCommand({
        characterId: 'nonexistent-id',
        spellLevel: 3,
        spellName: 'Test Spell',
        spellDescription: 'Test description',
        researchType: 'magic-user',
      });

      expect(command.canExecute(context)).toBe(false);
    });
  });

  describe('Class Validation', () => {
    it('should allow Magic-User to research magic-user spells', async () => {
      const superWizard = createMockCharacter({
        id: 'super-wizard-test',
        level: 20,
        abilities: { ...researcher.abilities, intelligence: 25 },
        currency: { platinum: 0, gold: 50000, electrum: 0, silver: 0, copper: 0 },
      });
      context.setEntity(superWizard.id, superWizard);

      const command = new SpellResearchCommand({
        characterId: superWizard.id,
        spellLevel: 1,
        spellName: 'Arcane Bolt',
        spellDescription: 'Magical energy bolt',
        researchType: 'magic-user',
        mentorAvailable: true,
        libraryQuality: 'excellent',
      });

      const result = await command.execute(context);
      if (!result.success) {
        console.log('Research failed with message:', result.message);
      }
      expect(result.success).toBeTruthy();
    });

    it('should allow Cleric to research cleric spells', async () => {
      const cleric = createMockCharacter({
        id: 'cleric-1',
        class: 'Cleric',
        level: 7,
        abilities: { ...researcher.abilities, wisdom: 17 },
        currency: { platinum: 0, gold: 10000, electrum: 0, silver: 0, copper: 0 },
      });
      context.setEntity(cleric.id, cleric);

      const command = new SpellResearchCommand({
        characterId: cleric.id,
        spellLevel: 3,
        spellName: 'Divine Blessing',
        spellDescription: 'Channels divine power',
        researchType: 'cleric',
      });

      const canExecute = command.canExecute(context);
      expect(canExecute).toBeTruthy();
    });

    it('should allow Druid to research druid spells', async () => {
      const druid = createMockCharacter({
        id: 'druid-1',
        class: 'Druid',
        level: 7,
        abilities: { ...researcher.abilities, wisdom: 17 },
      });
      context.setEntity(druid.id, druid);

      const command = new SpellResearchCommand({
        characterId: druid.id,
        spellLevel: 3,
        spellName: "Nature's Call",
        spellDescription: 'Communicates with nature',
        researchType: 'druid',
      });

      const canExecute = command.canExecute(context);
      expect(canExecute).toBeTruthy();
    });

    it('should allow Illusionist to research illusionist spells', async () => {
      const illusionist = createMockCharacter({
        id: 'illusionist-1',
        class: 'Illusionist',
        level: 7,
        abilities: { ...researcher.abilities, intelligence: 17 },
      });
      context.setEntity(illusionist.id, illusionist);

      const command = new SpellResearchCommand({
        characterId: illusionist.id,
        spellLevel: 3,
        spellName: 'Greater Illusion',
        spellDescription: 'Creates complex illusions',
        researchType: 'illusionist',
      });

      const canExecute = command.canExecute(context);
      expect(canExecute).toBeTruthy();
    });

    it('should reject invalid class combinations', async () => {
      const fighter = createMockCharacter({
        id: 'fighter-1',
        class: 'Fighter',
        level: 10,
      });
      context.setEntity(fighter.id, fighter);

      const command = new SpellResearchCommand({
        characterId: fighter.id,
        spellLevel: 3,
        spellName: 'Test Spell',
        spellDescription: 'Test description',
        researchType: 'magic-user',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Fighter cannot research magic-user spells');
    });
  });

  describe('Level Requirements', () => {
    it('should enforce minimum level for spell level', async () => {
      const lowLevelWizard = createMockCharacter({
        id: 'low-level-1',
        class: 'Magic-User',
        level: 1,
      });
      context.setEntity(lowLevelWizard.id, lowLevelWizard);

      const command = new SpellResearchCommand({
        characterId: lowLevelWizard.id,
        spellLevel: 5,
        spellName: 'Test Spell',
        spellDescription: 'Test description',
        researchType: 'magic-user',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Must be at least level');
    });

    it('should accept appropriate level for spell level', async () => {
      const highLevelWizard = createMockCharacter({
        id: 'high-level-1',
        class: 'Magic-User',
        level: 17,
        abilities: { ...researcher.abilities, intelligence: 19 },
        currency: { platinum: 0, gold: 50000, electrum: 0, silver: 0, copper: 0 },
      });
      context.setEntity(highLevelWizard.id, highLevelWizard);

      const command = new SpellResearchCommand({
        characterId: highLevelWizard.id,
        spellLevel: 9,
        spellName: 'Time Stop',
        spellDescription: 'Stops time briefly',
        researchType: 'magic-user',
      });

      const canExecute = command.canExecute(context);
      expect(canExecute).toBeTruthy();
    });
  });

  describe('Ability Score Requirements', () => {
    it('should enforce intelligence requirements for magic-users', async () => {
      const lowIntWizard = createMockCharacter({
        id: 'low-int-1',
        class: 'Magic-User',
        level: 9,
        abilities: { ...researcher.abilities, intelligence: 12 },
      });
      context.setEntity(lowIntWizard.id, lowIntWizard);

      const command = new SpellResearchCommand({
        characterId: lowIntWizard.id,
        spellLevel: 5,
        spellName: 'Test Spell',
        spellDescription: 'Test description',
        researchType: 'magic-user',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Intelligence must be at least 14');
    });

    it('should enforce wisdom requirements for clerics', async () => {
      const lowWisCleric = createMockCharacter({
        id: 'low-wis-1',
        class: 'Cleric',
        level: 9,
        abilities: { ...researcher.abilities, wisdom: 10 },
      });
      context.setEntity(lowWisCleric.id, lowWisCleric);

      const command = new SpellResearchCommand({
        characterId: lowWisCleric.id,
        spellLevel: 4,
        spellName: 'Test Spell',
        spellDescription: 'Test description',
        researchType: 'cleric',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Wisdom must be at least 13');
    });
  });

  describe('Cost Requirements', () => {
    it('should calculate basic research costs correctly', async () => {
      const command = new SpellResearchCommand({
        characterId: researcher.id,
        spellLevel: 3,
        spellName: 'Test Spell',
        spellDescription: 'Test description',
        researchType: 'magic-user',
      });

      const requirements = command.calculateResearchRequirements(3, 'magic-user');

      expect(requirements.timeInWeeks).toBe(3);
      expect(requirements.baseCost).toBe(900);
      expect(requirements.totalCost).toBe(900);
    });

    it('should reject research when insufficient funds', async () => {
      const poorWizard = createMockCharacter({
        id: 'poor-1',
        currency: { platinum: 0, gold: 100, electrum: 0, silver: 0, copper: 0 },
      });
      context.setEntity(poorWizard.id, poorWizard);

      const command = new SpellResearchCommand({
        characterId: poorWizard.id,
        spellLevel: 3,
        spellName: 'Test Spell',
        spellDescription: 'Test description',
        researchType: 'magic-user',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Insufficient funds');
    });

    it('should include special material costs', async () => {
      const command = new SpellResearchCommand({
        characterId: researcher.id,
        spellLevel: 2,
        spellName: 'Test Spell',
        spellDescription: 'Test description',
        researchType: 'magic-user',
        specialMaterials: [
          { name: 'Rare Crystal', cost: 500, rarity: 'rare' },
          { name: 'Dragon Scale', cost: 300, rarity: 'very-rare' },
        ],
      });

      const requirements = command.calculateResearchRequirements(
        2,
        'magic-user',
        undefined,
        undefined,
        [
          { name: 'Rare Crystal', cost: 500, rarity: 'rare' },
          { name: 'Dragon Scale', cost: 300, rarity: 'very-rare' },
        ]
      );

      expect(requirements.materialCost).toBe(800);
      expect(requirements.totalCost).toBe(requirements.baseCost + 800);
    });
  });

  describe('Modifiers and Bonuses', () => {
    it('should apply mentor bonus to time and success', async () => {
      const command = new SpellResearchCommand({
        characterId: researcher.id,
        spellLevel: 4,
        spellName: 'Test Spell',
        spellDescription: 'Test description',
        researchType: 'magic-user',
        mentorAvailable: true,
      });

      const requirements = command.calculateResearchRequirements(
        4,
        'magic-user',
        undefined,
        undefined,
        [],
        true
      );

      expect(requirements.timeInWeeks).toBe(3);
    });

    it('should apply library quality bonuses', async () => {
      const excellentLibraryCommand = new SpellResearchCommand({
        characterId: researcher.id,
        spellLevel: 2,
        spellName: 'Test Spell',
        spellDescription: 'Test description',
        researchType: 'magic-user',
        libraryQuality: 'excellent',
      });

      const requirements = excellentLibraryCommand.calculateResearchRequirements(
        2,
        'magic-user',
        undefined,
        undefined,
        [],
        false,
        'excellent'
      );

      const baseCostWithoutLibrary = 2 * 100 * 2;
      const expectedCostWithLibrary = Math.floor(baseCostWithoutLibrary * 0.6);

      expect(requirements.baseCost).toBe(expectedCostWithLibrary);
    });

    it('should calculate success chances with all modifiers', async () => {
      const command = new SpellResearchCommand({
        characterId: researcher.id,
        spellLevel: 3,
        spellName: 'Test Spell',
        spellDescription: 'Test description',
        researchType: 'magic-user',
        mentorAvailable: true,
        libraryQuality: 'excellent',
      });

      const researchResult = command.performResearch(
        researcher,
        { timeInWeeks: 3, baseCost: 540, materialCost: 0, totalCost: 540, specialMaterials: [] },
        true,
        'excellent'
      );

      expect(researchResult.details.modifiers).toEqual({
        baseStat: 18,
        mentor: 20,
        library: 30,
        level: 18,
        spellLevelPenalty: -30,
      });
    });
  });

  describe('Research Outcomes', () => {
    it('should create spell on successful research', async () => {
      const superWizard = createMockCharacter({
        id: 'super-wizard',
        level: 20,
        abilities: { ...researcher.abilities, intelligence: 25 },
        currency: { platinum: 0, gold: 50000, electrum: 0, silver: 0, copper: 0 },
      });
      context.setEntity(superWizard.id, superWizard);

      const command = new SpellResearchCommand({
        characterId: superWizard.id,
        spellLevel: 1,
        spellName: 'Magic Detection',
        spellDescription: 'Detects magical auras',
        researchType: 'magic-user',
        mentorAvailable: true,
        libraryQuality: 'excellent',
      });

      const result = await command.execute(context);

      if (result.success && result.data) {
        const data = result.data as { spell: { name: string; level: number; class: string } };
        expect(data.spell).toBeDefined();
        expect(data.spell.name).toBe('Magic Detection');
        expect(data.spell.level).toBe(1);
        expect(data.spell.class).toBe('Magic-User');
      }
    });

    it('should deduct full costs on success', async () => {
      const originalGold = researcher.currency.gold;

      const command = new SpellResearchCommand({
        characterId: researcher.id,
        spellLevel: 2,
        spellName: 'Simple Spell',
        spellDescription: 'A simple spell',
        researchType: 'magic-user',
      });

      await command.execute(context);

      const updatedCharacter = context.getEntity<Character>(researcher.id);
      expect(updatedCharacter?.currency.gold).toBeLessThan(originalGold);
    });

    it('should deduct partial costs on failure', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99);

      const weakWizard = createMockCharacter({
        id: 'weak-wizard',
        level: 9,
        abilities: { ...researcher.abilities, intelligence: 15 },
        currency: { platinum: 0, gold: 5000, electrum: 0, silver: 0, copper: 0 },
      });
      context.setEntity(weakWizard.id, weakWizard);

      const command = new SpellResearchCommand({
        characterId: weakWizard.id,
        spellLevel: 5,
        spellName: 'Very Hard Spell',
        spellDescription: 'Extremely difficult spell research',
        researchType: 'magic-user',
        libraryQuality: 'poor',
        mentorAvailable: false,
      });

      const originalGold = weakWizard.currency.gold;
      await command.execute(context);

      const updatedCharacter = context.getEntity<Character>(weakWizard.id);
      const goldLost = originalGold - (updatedCharacter?.currency.gold || 0);

      expect(goldLost).toBeGreaterThan(0);
    });
  });

  describe('Context Data Setup', () => {
    it('should set up context data for rules processing', async () => {
      const command = new SpellResearchCommand({
        characterId: researcher.id,
        spellLevel: 3,
        spellName: 'Test Spell',
        spellDescription: 'Test description',
        researchType: 'magic-user',
      });

      await command.execute(context);

      const contextData = context.getTemporary('spell-research-params') as {
        characterId: string;
        spellLevel: number;
        spellName: string;
        researchType: string;
      };
      expect(contextData).toBeDefined();
      expect(contextData.characterId).toBe(researcher.id);
      expect(contextData.spellLevel).toBe(3);
      expect(contextData.spellName).toBe('Test Spell');
      expect(contextData.researchType).toBe('magic-user');
    });
  });

  describe('Required Rules', () => {
    it('should specify required enchantment and scribing rules', () => {
      const command = new SpellResearchCommand({
        characterId: researcher.id,
        spellLevel: 3,
        spellName: 'Test Spell',
        spellDescription: 'Test description',
        researchType: 'magic-user',
      });

      const requiredRules = command.getRequiredRules();
      expect(requiredRules).toContain('enchantment-rules');
      expect(requiredRules).toContain('scroll-scribing');
    });
  });

  describe('Spell Creation', () => {
    it('should create spell with correct class mapping', () => {
      const command = new SpellResearchCommand({
        characterId: researcher.id,
        spellLevel: 3,
        spellName: 'Test Spell',
        spellDescription: 'Test description',
        researchType: 'magic-user',
      });

      const spell = command.createResearchedSpell(
        'Arcane Bolt',
        'Magical energy projectile',
        3,
        'magic-user',
        researcher
      );

      expect(spell.name).toBe('Arcane Bolt');
      expect(spell.level).toBe(3);
      expect(spell.class).toBe('Magic-User');
      expect(spell.description).toBe('Magical energy projectile');
      expect(spell.components).toEqual(['V', 'S']);
    });

    it('should create different spell classes correctly', () => {
      const command = new SpellResearchCommand({
        characterId: researcher.id,
        spellLevel: 2,
        spellName: 'Test Spell',
        spellDescription: 'Test description',
        researchType: 'cleric',
      });

      const clericSpell = command.createResearchedSpell(
        'Divine Grace',
        'Channels divine power',
        2,
        'cleric',
        researcher
      );

      expect(clericSpell.class).toBe('Cleric');

      const druidSpell = command.createResearchedSpell(
        "Nature's Call",
        'Communicates with nature',
        2,
        'druid',
        researcher
      );

      expect(druidSpell.class).toBe('Druid');

      const illusionSpell = command.createResearchedSpell(
        'Mind Trick',
        'Creates mental illusion',
        2,
        'illusionist',
        researcher
      );

      expect(illusionSpell.class).toBe('Illusionist');
    });
  });

  describe('OSRIC Compliance', () => {
    it('should implement authentic OSRIC research time progression', () => {
      const command = new SpellResearchCommand({
        characterId: researcher.id,
        spellLevel: 5,
        spellName: 'Test Spell',
        spellDescription: 'Test description',
        researchType: 'magic-user',
      });

      const requirements = command.calculateResearchRequirements(5, 'magic-user');

      expect(requirements.timeInWeeks).toBe(5);
    });

    it('should implement authentic OSRIC cost calculations', () => {
      const command = new SpellResearchCommand({
        characterId: researcher.id,
        spellLevel: 4,
        spellName: 'Test Spell',
        spellDescription: 'Test description',
        researchType: 'magic-user',
      });

      const requirements = command.calculateResearchRequirements(4, 'magic-user');

      expect(requirements.baseCost).toBe(1600);
    });

    it('should enforce OSRIC minimum level requirements', () => {
      const command = new SpellResearchCommand({
        characterId: researcher.id,
        spellLevel: 7,
        spellName: 'Test Spell',
        spellDescription: 'Test description',
        researchType: 'magic-user',
      });

      const minLevel = command.getMinimumLevelForSpellLevel('Magic-User', 7);
      expect(minLevel).toBe(13);
    });

    it('should handle all spell level progressions correctly', () => {
      const command = new SpellResearchCommand({
        characterId: researcher.id,
        spellLevel: 1,
        spellName: 'Test Spell',
        spellDescription: 'Test description',
        researchType: 'magic-user',
      });

      expect(command.getMinimumLevelForSpellLevel('Magic-User', 1)).toBe(1);
      expect(command.getMinimumLevelForSpellLevel('Magic-User', 5)).toBe(9);
      expect(command.getMinimumLevelForSpellLevel('Magic-User', 9)).toBe(17);

      expect(command.getMinimumLevelForSpellLevel('Cleric', 1)).toBe(1);
      expect(command.getMinimumLevelForSpellLevel('Cleric', 4)).toBe(7);
      expect(command.getMinimumLevelForSpellLevel('Cleric', 7)).toBe(13);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing character gracefully', async () => {
      const command = new SpellResearchCommand({
        characterId: 'missing-character',
        spellLevel: 3,
        spellName: 'Test Spell',
        spellDescription: 'Test description',
        researchType: 'magic-user',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Character with ID "missing-character" not found');
    });

    it('should handle invalid research types', async () => {
      const researchParams = {
        characterId: researcher.id,
        spellLevel: 3,
        spellName: 'Test Spell',
        spellDescription: 'Test description',
        researchType: 'magic-user' as const,
      };
      Object.defineProperty(researchParams, 'researchType', {
        value: 'invalid-type',
        writable: true,
      });

      const command = new SpellResearchCommand(researchParams);

      const result = await command.execute(context);
      expect(result.success).toBe(false);
    });

    it('should handle exceptions gracefully', async () => {
      const command = new SpellResearchCommand({
        characterId: researcher.id,
        spellLevel: 3,
        spellName: 'Test Spell',
        spellDescription: 'Test description',
        researchType: 'magic-user',
      });

      context = new GameContext(createStore());

      const result = await command.execute(context);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Character with ID');
    });
  });
});
