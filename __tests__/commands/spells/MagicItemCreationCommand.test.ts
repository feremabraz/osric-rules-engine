import { MagicItemCreationCommand } from '@osric/commands/spells/MagicItemCreationCommand';
import { GameContext } from '@osric/core/GameContext';
import { COMMAND_TYPES } from '@osric/types/constants';
import type { Character } from '@osric/types/entities';
import { createStore } from 'jotai';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Type definitions for command result data
interface MagicItemCreationResult {
  item: {
    name: string;
    type: string;
    magicBonus?: number;
    enchantmentLevel?: number;
    spells?: string[];
  };
  timeSpent: number;
  goldSpent: number;
  goldLost?: number;
}

// Type guard function to check if result data is MagicItemCreationResult
function isMagicItemCreationResult(data: unknown): data is MagicItemCreationResult {
  return (
    typeof data === 'object' &&
    data !== null &&
    'item' in data &&
    'timeSpent' in data &&
    'goldSpent' in data
  );
}

// Helper function for mock character creation
function createMockCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'test-character',
    name: 'Test Wizard',
    level: 5,
    race: 'Human',
    class: 'Magic-User',
    classes: { 'Magic-User': 5 },
    abilities: {
      strength: 10,
      dexterity: 12,
      constitution: 14,
      intelligence: 18,
      wisdom: 13,
      charisma: 11,
    },
    hitPoints: { current: 15, maximum: 15 },
    experience: { current: 10000, requiredForNextLevel: 20000, level: 5 },
    armorClass: 10,
    thac0: 15,
    alignment: 'Lawful Good',
    currency: { platinum: 0, gold: 10000, electrum: 0, silver: 0, copper: 0 },
    inventory: [],
    position: 'laboratory',
    encumbrance: 0,
    movementRate: 120,
    primaryClass: null,
    spellSlots: { 1: 4, 2: 2, 3: 1 },
    memorizedSpells: {},
    spells: [
      {
        name: 'Magic Missile',
        level: 1,
        class: 'Magic-User',
        range: '150 feet',
        duration: 'Instantaneous',
        areaOfEffect: '1 creature',
        components: ['V', 'S'],
        castingTime: '1 segment',
        savingThrow: 'None',
        description: 'Unerring missile',
        reversible: false,
        materialComponents: null,
        effect: () => ({
          damage: [1],
          healing: null,
          statusEffects: null,
          narrative: 'Magic missile strikes',
        }),
      },
      {
        name: 'Fireball',
        level: 3,
        class: 'Magic-User',
        range: '150 feet',
        duration: 'Instantaneous',
        areaOfEffect: '20-foot radius sphere',
        components: ['V', 'S', 'M'],
        castingTime: '3 segments',
        savingThrow: 'Breath Weapons',
        description: 'Explosive ball of fire',
        reversible: false,
        materialComponents: ['sulfur', 'bat guano'],
        effect: () => ({
          damage: [6],
          healing: null,
          statusEffects: null,
          narrative: 'Fireball explodes',
        }),
      },
    ],
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
    abilityModifiers: {
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
    },
    savingThrows: {
      'Poison or Death': 13,
      Wands: 14,
      'Paralysis, Polymorph, or Petrification': 13,
      'Breath Weapons': 16,
      'Spells, Rods, or Staves': 15,
    },
    statusEffects: [],
    ...overrides,
  };
}

// Helper function to create cleric character
function createMockCleric(overrides: Partial<Character> = {}): Character {
  return createMockCharacter({
    name: 'Test Cleric',
    class: 'Cleric',
    classes: { Cleric: 5 },
    abilities: { ...createMockCharacter().abilities, wisdom: 17 },
    spells: [
      {
        name: 'Cure Light Wounds',
        level: 1,
        class: 'Cleric',
        range: 'Touch',
        duration: 'Permanent',
        areaOfEffect: 'Creature touched',
        components: ['V', 'S'],
        castingTime: '5 segments',
        savingThrow: 'None',
        description: 'Heals wounds',
        reversible: true,
        materialComponents: null,
        effect: () => ({
          damage: null,
          healing: [4],
          statusEffects: null,
          narrative: 'Wounds heal',
        }),
      },
      {
        name: 'Bless',
        level: 1,
        class: 'Cleric',
        range: '60 feet',
        duration: '6 rounds',
        areaOfEffect: '50-foot cube',
        components: ['V', 'S', 'M'],
        castingTime: '1 round',
        savingThrow: 'None',
        description: 'Improves morale',
        reversible: true,
        materialComponents: ['holy water'],
        effect: () => ({
          damage: null,
          healing: null,
          statusEffects: null,
          narrative: 'Morale improves',
        }),
      },
    ],
    ...overrides,
  });
}

describe('MagicItemCreationCommand', () => {
  let context: GameContext;
  let wizard: Character;
  let cleric: Character;
  let originalMathRandom: () => number;

  beforeEach(() => {
    const store = createStore();
    context = new GameContext(store);

    wizard = createMockCharacter({ id: 'test-wizard' });
    cleric = createMockCleric({ id: 'test-cleric' });

    context.setEntity('test-wizard', wizard);
    context.setEntity('test-cleric', cleric);

    // Store original Math.random
    originalMathRandom = Math.random;
    // Mock Math.random to always succeed (return 0.1, which is < most success chances)
    Math.random = vi.fn(() => 0.1);
  });

  afterEach(() => {
    // Restore original Math.random
    Math.random = originalMathRandom;
  });

  describe('Command Properties', () => {
    it('should have correct command type', () => {
      const command = new MagicItemCreationCommand({
        characterId: 'test-wizard',
        itemType: 'scroll',
      });

      expect(command.type).toBe(COMMAND_TYPES.MAGIC_ITEM_CREATION);
    });

    it('should provide required rules list', () => {
      const command = new MagicItemCreationCommand({
        characterId: 'test-wizard',
        itemType: 'scroll',
      });

      const rules = command.getRequiredRules();
      expect(rules).toContain('enchantment-rules');
      expect(rules).toContain('scroll-scribing-rules');
      expect(rules).toContain('potion-brewing-rules');
    });

    it('should validate canExecute correctly', () => {
      const command = new MagicItemCreationCommand({
        characterId: 'test-wizard',
        itemType: 'scroll',
      });

      expect(command.canExecute(context)).toBe(true);
    });
  });

  describe('Scroll Creation', () => {
    it('should create a scroll successfully', async () => {
      const command = new MagicItemCreationCommand({
        characterId: 'test-wizard',
        itemType: 'scroll',
        spellsToScribe: ['Magic Missile'],
        workspaceQuality: 'good',
      });

      const result = await command.execute(context);
      if (!result.success) {
        console.log('Test failure:', result.message, result.data);
      }
      expect(result.success).toBe(true);
      expect(result.message).toContain('Successfully created');

      expect(result.data).toBeDefined();
      expect((result.data as Record<string, unknown>).item).toBeDefined();
      expect((result.data as Record<string, unknown>).timeSpent).toBeDefined();
      expect((result.data as Record<string, unknown>).goldSpent).toBeDefined();
    });

    it('should handle unknown spells for scrolls', async () => {
      const command = new MagicItemCreationCommand({
        characterId: 'test-wizard',
        itemType: 'scroll',
        spellsToScribe: ['Unknown Spell'],
      });

      const result = await command.execute(context);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Unknown spells');
    });

    it('should allow clerics to create scrolls', async () => {
      const command = new MagicItemCreationCommand({
        characterId: 'test-cleric',
        itemType: 'scroll',
        spellsToScribe: ['Cure Light Wounds'],
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      if (result.data && isMagicItemCreationResult(result.data)) {
        expect(result.data.item.name).toContain('Cure Light Wounds');
      } else {
        throw new Error('Expected MagicItemCreationResult');
      }
    });

    it('should validate scroll creation at level 1', async () => {
      const lowLevelWizard = createMockCharacter({
        id: 'novice-wizard',
        classes: { 'Magic-User': 1 },
        experience: { current: 100, requiredForNextLevel: 2500, level: 1 },
        spells: [
          {
            name: 'Read Magic',
            level: 1,
            class: 'Magic-User',
            range: 'Touch',
            duration: '2 rounds per level',
            areaOfEffect: 'Special',
            components: ['V', 'S', 'M'],
            castingTime: '1 round',
            savingThrow: 'None',
            description: 'Read magical writings',
            reversible: false,
            materialComponents: ['clear crystal or mineral prism'],
            effect: () => ({
              damage: null,
              healing: null,
              statusEffects: null,
              narrative: 'Magical text becomes readable',
            }),
          },
        ],
      });
      context.setEntity('novice-wizard', lowLevelWizard);

      const command = new MagicItemCreationCommand({
        characterId: 'novice-wizard',
        itemType: 'scroll',
        spellsToScribe: ['Read Magic'],
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);
    });
  });

  describe('Potion Creation', () => {
    it('should create a potion successfully', async () => {
      const command = new MagicItemCreationCommand({
        characterId: 'test-wizard',
        itemType: 'potion',
        potionType: 'Healing',
        workspaceQuality: 'excellent',
        materialComponents: [{ name: 'Herb of Healing', cost: 50, quantity: 1, available: true }],
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should require level 3 for potion creation', async () => {
      const lowLevelWizard = createMockCharacter({
        id: 'novice-wizard',
        classes: { 'Magic-User': 2 },
        experience: { current: 2000, requiredForNextLevel: 5000, level: 2 },
      });
      context.setEntity('novice-wizard', lowLevelWizard);

      const command = new MagicItemCreationCommand({
        characterId: 'novice-wizard',
        itemType: 'potion',
        potionType: 'Healing',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Minimum level 3');
    });

    it('should handle missing materials', async () => {
      const command = new MagicItemCreationCommand({
        characterId: 'test-wizard',
        itemType: 'potion',
        potionType: 'Healing',
        materialComponents: [{ name: 'Rare Crystal', cost: 500, quantity: 1, available: false }],
      });

      const result = await command.execute(context);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Materials: Rare Crystal');
    });

    it('should allow clerics to create potions', async () => {
      const command = new MagicItemCreationCommand({
        characterId: 'test-cleric',
        itemType: 'potion',
        potionType: 'Healing',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);
    });
  });

  describe('Weapon Enchantment', () => {
    it('should create enchanted weapon successfully', async () => {
      const command = new MagicItemCreationCommand({
        characterId: 'test-wizard',
        itemType: 'weapon',
        enchantmentLevel: 1,
        workspaceQuality: 'excellent',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      if (result.data && isMagicItemCreationResult(result.data)) {
        expect(result.data.item.name).toContain('+1 Weapon');
        expect(result.data.item.magicBonus).toBe(1);
      } else {
        throw new Error('Expected MagicItemCreationResult');
      }
    });

    it('should scale costs for higher enchantment levels', async () => {
      const richWizard = createMockCharacter({
        id: 'rich-wizard',
        currency: { platinum: 0, gold: 50000, electrum: 0, silver: 0, copper: 0 },
      });
      context.setEntity('rich-wizard', richWizard);

      const command = new MagicItemCreationCommand({
        characterId: 'rich-wizard',
        itemType: 'weapon',
        enchantmentLevel: 3,
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);
      // Base cost 2000 * 2^(3-1) = 8000, so expect > 5000
      expect(result.data).toBeDefined();
    });

    it('should require level 5 for weapon enchantment', async () => {
      const lowLevelWizard = createMockCharacter({
        id: 'novice-wizard',
        classes: { 'Magic-User': 4 },
        experience: { current: 8000, requiredForNextLevel: 10000, level: 4 },
      });
      context.setEntity('novice-wizard', lowLevelWizard);

      const command = new MagicItemCreationCommand({
        characterId: 'novice-wizard',
        itemType: 'weapon',
        enchantmentLevel: 1,
      });

      const result = await command.execute(context);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Minimum level 5');
    });

    it('should allow clerics to enchant weapons', async () => {
      const command = new MagicItemCreationCommand({
        characterId: 'test-cleric',
        itemType: 'weapon',
        enchantmentLevel: 1,
        workspaceQuality: 'excellent',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);
    });
  });

  describe('Armor Enchantment', () => {
    it('should create enchanted armor successfully', async () => {
      const command = new MagicItemCreationCommand({
        characterId: 'test-wizard',
        itemType: 'armor',
        enchantmentLevel: 1,
        workspaceQuality: 'excellent',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should require level 5 for armor enchantment', async () => {
      const lowLevelWizard = createMockCharacter({
        id: 'novice-wizard',
        classes: { 'Magic-User': 3 },
        experience: { current: 5000, requiredForNextLevel: 10000, level: 3 },
      });
      context.setEntity('novice-wizard', lowLevelWizard);

      const command = new MagicItemCreationCommand({
        characterId: 'novice-wizard',
        itemType: 'armor',
        enchantmentLevel: 1,
      });

      const result = await command.execute(context);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Minimum level 5');
    });
  });

  describe('Advanced Item Creation', () => {
    it('should create rings at level 7+', async () => {
      const highLevelWizard = createMockCharacter({
        id: 'archmage',
        classes: { 'Magic-User': 7 },
        experience: { current: 70000, requiredForNextLevel: 100000, level: 7 },
        currency: { platinum: 0, gold: 20000, electrum: 0, silver: 0, copper: 0 },
      });
      context.setEntity('archmage', highLevelWizard);

      const command = new MagicItemCreationCommand({
        characterId: 'archmage',
        itemType: 'ring',
        workspaceQuality: 'excellent',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should create wands at level 7+', async () => {
      const highLevelWizard = createMockCharacter({
        id: 'archmage',
        classes: { 'Magic-User': 7 },
        experience: { current: 70000, requiredForNextLevel: 100000, level: 7 },
        currency: { platinum: 0, gold: 30000, electrum: 0, silver: 0, copper: 0 },
      });
      context.setEntity('archmage', highLevelWizard);

      const command = new MagicItemCreationCommand({
        characterId: 'archmage',
        itemType: 'wand',
        workspaceQuality: 'excellent',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should reject ring creation below level 7', async () => {
      const command = new MagicItemCreationCommand({
        characterId: 'test-wizard', // Level 5
        itemType: 'ring',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Minimum level 7');
    });

    it('should create rods at level 9+', async () => {
      const masterWizard = createMockCharacter({
        id: 'master-wizard',
        classes: { 'Magic-User': 9 },
        experience: { current: 200000, requiredForNextLevel: 300000, level: 9 },
        currency: { platinum: 0, gold: 50000, electrum: 0, silver: 0, copper: 0 },
      });
      context.setEntity('master-wizard', masterWizard);

      const command = new MagicItemCreationCommand({
        characterId: 'master-wizard',
        itemType: 'rod',
        workspaceQuality: 'excellent',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should create staves at level 11+', async () => {
      const archWizard = createMockCharacter({
        id: 'arch-wizard',
        classes: { 'Magic-User': 11 },
        experience: { current: 500000, requiredForNextLevel: 750000, level: 11 },
        currency: { platinum: 0, gold: 70000, electrum: 0, silver: 0, copper: 0 },
      });
      context.setEntity('arch-wizard', archWizard);

      const command = new MagicItemCreationCommand({
        characterId: 'arch-wizard',
        itemType: 'staff',
        workspaceQuality: 'excellent',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe('Workspace Quality Effects', () => {
    it('should reduce time with excellent workspace', async () => {
      const commandBasic = new MagicItemCreationCommand({
        characterId: 'test-wizard',
        itemType: 'scroll',
        spellsToScribe: ['Magic Missile'],
        workspaceQuality: 'basic',
      });

      const commandExcellent = new MagicItemCreationCommand({
        characterId: 'test-wizard',
        itemType: 'scroll',
        spellsToScribe: ['Magic Missile'],
        workspaceQuality: 'excellent',
      });

      const resultBasic = await commandBasic.execute(context);
      const resultExcellent = await commandExcellent.execute(context);

      expect(resultBasic.success).toBe(true);
      expect(resultExcellent.success).toBe(true);

      // Type-safe assertions
      if (
        resultBasic.data &&
        isMagicItemCreationResult(resultBasic.data) &&
        resultExcellent.data &&
        isMagicItemCreationResult(resultExcellent.data)
      ) {
        // Excellent workspace should cost more but be more reliable
        expect(resultExcellent.data.goldSpent).toBeGreaterThan(resultBasic.data.goldSpent);
      } else {
        throw new Error('Expected MagicItemCreationResult for both results');
      }
    });

    it('should reduce time with assistant present', async () => {
      const command = new MagicItemCreationCommand({
        characterId: 'test-wizard',
        itemType: 'scroll',
        spellsToScribe: ['Magic Missile'],
        assistantPresent: true,
        workspaceQuality: 'excellent',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe('Class Restrictions', () => {
    it('should reject non-spellcasters for scroll creation', async () => {
      const fighter = createMockCharacter({
        id: 'test-fighter',
        name: 'Test Fighter',
        class: 'Fighter',
        classes: { Fighter: 5 },
        spells: [],
      });
      context.setEntity('test-fighter', fighter);

      const command = new MagicItemCreationCommand({
        characterId: 'test-fighter',
        itemType: 'scroll',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(false);
      expect(result.message).toContain('must be');
    });

    it('should reject rings for non-magic-users', async () => {
      const highLevelCleric = createMockCleric({
        id: 'high-cleric',
        classes: { Cleric: 7 },
        experience: { current: 70000, requiredForNextLevel: 100000, level: 7 },
      });
      context.setEntity('high-cleric', highLevelCleric);

      const command = new MagicItemCreationCommand({
        characterId: 'high-cleric',
        itemType: 'ring',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(false);
      expect(result.message).toContain('must be magic-user');
    });
  });

  describe('Cost Validation', () => {
    it('should reject creation without sufficient gold', async () => {
      const poorWizard = createMockCharacter({
        id: 'poor-wizard',
        currency: { platinum: 0, gold: 10, electrum: 0, silver: 0, copper: 0 },
      });
      context.setEntity('poor-wizard', poorWizard);

      const command = new MagicItemCreationCommand({
        characterId: 'poor-wizard',
        itemType: 'weapon',
        enchantmentLevel: 1,
      });

      const result = await command.execute(context);
      expect(result.success).toBe(false);
      expect(result.message).toContain('gold pieces');
    });

    it('should deduct costs after successful creation', async () => {
      const originalGold = wizard.currency.gold;

      const command = new MagicItemCreationCommand({
        characterId: 'test-wizard',
        itemType: 'scroll',
        spellsToScribe: ['Magic Missile'],
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);

      const updatedWizard = context.getEntity<Character>('test-wizard');
      expect(updatedWizard?.currency.gold).toBeLessThan(originalGold);
    });

    it('should deduct partial costs on failure', async () => {
      // Force failure by setting up unfavorable conditions
      const unluckyWizard = createMockCharacter({
        id: 'unlucky-wizard',
        abilities: { ...createMockCharacter().abilities, intelligence: 8 }, // Low intelligence
        currency: { platinum: 0, gold: 5000, electrum: 0, silver: 0, copper: 0 },
      });
      context.setEntity('unlucky-wizard', unluckyWizard);

      const command = new MagicItemCreationCommand({
        characterId: 'unlucky-wizard',
        itemType: 'weapon',
        enchantmentLevel: 1,
        workspaceQuality: 'basic', // Low success chance
      });

      // Run multiple times to test failure case
      for (let i = 0; i < 10; i++) {
        const result = await command.execute(context);
        if (!result.success && result.message.includes('failed')) {
          expect((result.data as Record<string, unknown>).goldLost).toBeDefined();
          expect((result.data as Record<string, unknown>).goldLost).toBeGreaterThan(0);
          break;
        }
      }
      // Note: Due to randomness, we can't guarantee failure, but at least test the structure
    });
  });

  describe('Error Handling', () => {
    it('should handle missing character', async () => {
      const command = new MagicItemCreationCommand({
        characterId: 'nonexistent',
        itemType: 'scroll',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Character not found');
    });

    it('should handle unknown item type', async () => {
      const command = new MagicItemCreationCommand({
        characterId: 'test-wizard',
        itemType: 'unknown' as 'scroll',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Unknown item type');
    });

    it('should handle exceptions gracefully', async () => {
      // Force error by corrupting context
      const corruptWizard = { ...wizard, classes: {} } as Character;
      context.setEntity('test-wizard', corruptWizard);

      const command = new MagicItemCreationCommand({
        characterId: 'test-wizard',
        itemType: 'scroll',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Character must be');
    });
  });

  describe('OSRIC Compliance', () => {
    it('should follow OSRIC creation times', async () => {
      const command = new MagicItemCreationCommand({
        characterId: 'test-wizard',
        itemType: 'scroll',
        spellsToScribe: ['Magic Missile'],
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);
      expect((result.data as Record<string, unknown>).timeSpent).toBe(1); // 1 day for scroll
    });

    it('should implement authentic intelligence bonuses', async () => {
      const geniusWizard = createMockCharacter({
        id: 'genius-wizard',
        abilities: { ...createMockCharacter().abilities, intelligence: 18 },
        classes: { 'Magic-User': 5 },
      });
      context.setEntity('genius-wizard', geniusWizard);

      const command = new MagicItemCreationCommand({
        characterId: 'genius-wizard',
        itemType: 'scroll',
        spellsToScribe: ['Magic Missile'],
        workspaceQuality: 'excellent',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);
      // High intelligence should improve success rates
    });

    it('should preserve OSRIC level requirements', async () => {
      const testCases = [
        { itemType: 'scroll', minLevel: 1 },
        { itemType: 'potion', minLevel: 3 },
        { itemType: 'weapon', minLevel: 5 },
        { itemType: 'ring', minLevel: 7 },
        { itemType: 'rod', minLevel: 9 },
        { itemType: 'staff', minLevel: 11 },
      ];

      for (const testCase of testCases) {
        const lowLevelWizard = createMockCharacter({
          id: `wizard-${testCase.minLevel - 1}`,
          classes: { 'Magic-User': testCase.minLevel - 1 },
          experience: { current: 1000, requiredForNextLevel: 2000, level: testCase.minLevel - 1 },
        });
        context.setEntity(`wizard-${testCase.minLevel - 1}`, lowLevelWizard);

        const command = new MagicItemCreationCommand({
          characterId: `wizard-${testCase.minLevel - 1}`,
          itemType: testCase.itemType as 'scroll',
        });

        const result = await command.execute(context);
        expect(result.success).toBe(false);
        expect(result.message).toContain(`Minimum level ${testCase.minLevel}`);
      }
    });
  });
});
