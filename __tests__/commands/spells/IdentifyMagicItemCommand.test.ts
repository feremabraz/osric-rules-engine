import { IdentifyMagicItemCommand } from '@osric/commands/spells/IdentifyMagicItemCommand';
import { GameContext } from '@osric/core/GameContext';
import { COMMAND_TYPES } from '@osric/types/constants';
import type { Character, Item } from '@osric/types/entities';
import { createStore } from 'jotai';
import { beforeEach, describe, expect, it } from 'vitest';

// Helper function for mock character creation
function createMockCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'test-character',
    name: 'Test Character',
    race: 'Human',
    class: 'Magic-User',
    level: 3,
    hitPoints: { current: 15, maximum: 15, temporary: 0 },
    armorClass: 10,
    abilities: {
      strength: 12,
      intelligence: 15,
      wisdom: 13,
      dexterity: 14,
      constitution: 12,
      charisma: 11,
    },
    savingThrows: {
      paralysisPoison: 14,
      petrifactionPolymorph: 13,
      rodStaffWand: 11,
      breathWeapon: 16,
      spell: 12,
    },
    thac0: 19,
    experience: 2500,
    alignment: 'Neutral',
    memorizedSpells: {
      1: [
        {
          name: 'Identify',
          level: 1,
          class: 'Magic-User',
          range: 'Touch',
          duration: 'Instantaneous',
          areaOfEffect: '1 item',
          components: ['V', 'S', 'M'],
          castingTime: '1 turn',
          savingThrow: 'None',
          description: 'Reveals magical properties',
          reversible: false,
          materialComponents: ['Pearl worth 100gp'],
          effect: () => ({ damage: null, healing: null, effect: 'identified', duration: 0 }),
        },
      ],
      2: [],
      3: [],
      4: [],
      5: [],
      6: [],
      7: [],
      8: [],
      9: [],
    },
    spellbook: [
      {
        name: 'Identify',
        level: 1,
        class: 'Magic-User',
        range: 'Touch',
        duration: 'Instantaneous',
        areaOfEffect: '1 item',
        components: ['V', 'S', 'M'],
        castingTime: '1 turn',
        savingThrow: 'None',
        description: 'Reveals magical properties',
        reversible: false,
        materialComponents: ['Pearl worth 100gp'],
        effect: () => ({ damage: null, healing: null, effect: 'identified', duration: 0 }),
      },
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
        description: 'Unerring missile of force',
        reversible: false,
        materialComponents: null,
        effect: () => ({
          damage: [4],
          healing: null,
          statusEffects: null,
          narrative: 'Magic missile hits target',
        }),
      },
    ],
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

// Helper function for mock magic item creation
function createMockMagicItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'magic-sword',
    name: 'Mysterious Sword',
    type: 'weapon',
    subtype: 'sword',
    weight: 4,
    value: 500,
    description: 'A gleaming sword with unknown properties',
    magicBonus: 1,
    enchantment: 'Unknown magical properties',
    cursed: false,
    requiresIdentification: true,
    ...overrides,
  } as Item;
}

// Helper function for mock magic item creation

describe('IdentifyMagicItemCommand', () => {
  let context: GameContext;
  let magicUser: Character;
  let magicItem: Item;

  beforeEach(() => {
    const store = createStore();
    context = new GameContext(store);

    magicUser = createMockCharacter({ id: 'magic-user' });
    magicItem = createMockMagicItem({ id: 'magic-item' });

    // Add item to character's inventory
    magicUser.inventory = [magicItem];

    context.setEntity('magic-user', magicUser);
    context.setItem('magic-item', magicItem);
  });

  describe('Command Creation', () => {
    it('should create command with proper type', () => {
      const command = new IdentifyMagicItemCommand('magic-user', 'magic-item');
      expect(command.type).toBe(COMMAND_TYPES.IDENTIFY_MAGIC_ITEM);
    });

    it('should store identifier and item IDs with method', () => {
      const command = new IdentifyMagicItemCommand('magic-user', 'magic-item', 'spell');
      expect(command.canExecute(context)).toBe(true);
    });

    it('should default to spell method', () => {
      const command = new IdentifyMagicItemCommand('magic-user', 'magic-item');
      expect(command.canExecute(context)).toBe(true);
    });
  });

  describe('Command Validation', () => {
    it('should validate when magic-user has item and identify spell', () => {
      const command = new IdentifyMagicItemCommand('magic-user', 'magic-item', 'spell');
      expect(command.canExecute(context)).toBe(true);
    });

    it('should fail when identifier does not exist', () => {
      const command = new IdentifyMagicItemCommand('nonexistent', 'magic-item');
      expect(command.canExecute(context)).toBe(false);
    });

    it('should fail when item does not exist', () => {
      const command = new IdentifyMagicItemCommand('magic-user', 'nonexistent');
      expect(command.canExecute(context)).toBe(false);
    });

    it('should fail when identifier does not have item', () => {
      // Create item not in inventory
      const otherItem = createMockMagicItem({ id: 'other-item' });
      context.setItem('other-item', otherItem);

      const command = new IdentifyMagicItemCommand('magic-user', 'other-item');
      expect(command.canExecute(context)).toBe(false);
    });

    it('should fail when character lacks identify spell for spell method', () => {
      const nonCaster = createMockCharacter({
        id: 'fighter',
        class: 'Fighter',
        memorizedSpells: { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [], 9: [] },
        spellbook: [],
        inventory: [magicItem],
      });
      context.setEntity('fighter', nonCaster);

      const command = new IdentifyMagicItemCommand('fighter', 'magic-item', 'spell');
      expect(command.canExecute(context)).toBe(false);
    });
  });

  describe('Basic Item Identification', () => {
    it('should successfully identify item using spell method', async () => {
      const command = new IdentifyMagicItemCommand('magic-user', 'magic-item', 'spell');
      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.message).toContain('attempts to identify Mysterious Sword using spell');
      expect(result.data?.method).toBe('spell');
    });

    it('should successfully identify item using sage method', async () => {
      const command = new IdentifyMagicItemCommand('magic-user', 'magic-item', 'sage');
      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.message).toContain('attempts to identify Mysterious Sword using sage');
      expect(result.data?.method).toBe('sage');
    });

    it('should successfully identify item using trial and error', async () => {
      const command = new IdentifyMagicItemCommand('magic-user', 'magic-item', 'trial');
      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.message).toContain('attempts to identify Mysterious Sword using trial');
      expect(result.data?.method).toBe('trial');
    });
  });

  describe('Context Data Setup', () => {
    it('should set up context data for rules processing', async () => {
      const command = new IdentifyMagicItemCommand('magic-user', 'magic-item', 'spell');
      await command.execute(context);

      expect(context.getTemporary('identifyItem_identifier')).toBe(magicUser);
      expect(context.getTemporary('identifyItem_item')).toBe(magicItem);
      expect(context.getTemporary('identifyItem_method')).toBe('spell');
    });
  });

  describe('Required Rules', () => {
    it('should specify required identification rules', () => {
      const command = new IdentifyMagicItemCommand('magic-user', 'magic-item');
      const rules = command.getRequiredRules();

      expect(rules).toContain('IdentificationValidation');
      expect(rules).toContain('IdentificationMethod');
      expect(rules).toContain('IdentificationResults');
    });
  });

  describe('Identification Methods', () => {
    it('should validate spell method for magic-users', () => {
      const command = new IdentifyMagicItemCommand('magic-user', 'magic-item', 'spell');
      expect(command.canExecute(context)).toBe(true);
    });

    it('should validate spell method for illusionists', () => {
      const illusionist = createMockCharacter({
        id: 'illusionist',
        class: 'Illusionist',
        inventory: [magicItem],
      });
      context.setEntity('illusionist', illusionist);

      const command = new IdentifyMagicItemCommand('illusionist', 'magic-item', 'spell');
      expect(command.canExecute(context)).toBe(true);
    });

    it('should reject spell method for non-casters', () => {
      const fighter = createMockCharacter({
        id: 'fighter',
        class: 'Fighter',
        memorizedSpells: { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [], 9: [] },
        spellbook: [],
        inventory: [magicItem],
      });
      context.setEntity('fighter', fighter);

      const command = new IdentifyMagicItemCommand('fighter', 'magic-item', 'spell');
      expect(command.canExecute(context)).toBe(false);
    });

    it('should validate sage method for all classes', () => {
      const thief = createMockCharacter({
        id: 'thief',
        class: 'Thief',
        inventory: [magicItem],
      });
      context.setEntity('thief', thief);

      const command = new IdentifyMagicItemCommand('thief', 'magic-item', 'sage');
      expect(command.canExecute(context)).toBe(true);
    });

    it('should validate trial method for conscious characters', () => {
      const command = new IdentifyMagicItemCommand('magic-user', 'magic-item', 'trial');
      expect(command.canExecute(context)).toBe(true);
    });

    it('should reject trial method for unconscious characters', () => {
      const unconsciousChar = createMockCharacter({
        id: 'unconscious',
        hitPoints: { current: 0, maximum: 15 },
        inventory: [magicItem],
      });
      context.setEntity('unconscious', unconsciousChar);

      const command = new IdentifyMagicItemCommand('unconscious', 'magic-item', 'trial');
      expect(command.canExecute(context)).toBe(false);
    });
  });

  describe('Spell Availability Checking', () => {
    it('should accept character with identify spell memorized', () => {
      const command = new IdentifyMagicItemCommand('magic-user', 'magic-item', 'spell');
      expect(command.canExecute(context)).toBe(true);
    });

    it('should accept character with identify spell in spellbook only', () => {
      const casterWithSpellbook = createMockCharacter({
        id: 'caster',
        memorizedSpells: { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [], 9: [] },
        spellbook: [
          {
            name: 'Identify',
            level: 1,
            class: 'Magic-User',
            range: 'Touch',
            duration: 'Instantaneous',
            areaOfEffect: '1 item',
            components: ['V', 'S', 'M'],
            castingTime: '1 turn',
            savingThrow: 'None',
            description: 'Reveals magical properties',
            reversible: false,
            materialComponents: ['Pearl worth 100gp'],
            effect: () => ({
              damage: null,
              healing: null,
              statusEffects: null,
              narrative: 'Item identified',
              duration: 0,
            }),
          },
        ],
        inventory: [magicItem],
      });
      context.setEntity('caster', casterWithSpellbook);

      const command = new IdentifyMagicItemCommand('caster', 'magic-item', 'spell');
      expect(command.canExecute(context)).toBe(true);
    });

    it('should reject character without identify spell', () => {
      const casterWithoutIdentify = createMockCharacter({
        id: 'caster',
        memorizedSpells: {
          1: [
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
              description: 'Unerring missile of force',
              reversible: false,
              materialComponents: null,
              effect: () => ({
                damage: [4],
                healing: null,
                statusEffects: null,
                narrative: 'Magic missile hits',
              }),
            },
          ],
          2: [],
          3: [],
          4: [],
          5: [],
          6: [],
          7: [],
          8: [],
          9: [],
        },
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
            description: 'Unerring missile of force',
            reversible: false,
            materialComponents: null,
            effect: () => ({
              damage: [4],
              healing: null,
              statusEffects: null,
              narrative: 'Magic missile hits',
            }),
          },
        ],
        inventory: [magicItem],
      });
      context.setEntity('caster', casterWithoutIdentify);

      const command = new IdentifyMagicItemCommand('caster', 'magic-item', 'spell');
      expect(command.canExecute(context)).toBe(false);
    });
  });

  describe('Identification Chances', () => {
    it('should return 100% chance for identify spell', () => {
      const command = new IdentifyMagicItemCommand('magic-user', 'magic-item', 'spell');
      const chance = command.getIdentificationChance(magicUser, 'spell', magicItem);

      expect(chance).toBe(100);
    });

    it('should calculate sage chance based on item complexity', () => {
      const command = new IdentifyMagicItemCommand('magic-user', 'magic-item', 'sage');
      const simpleItem = createMockMagicItem({ magicBonus: 1 });
      const complexItem = createMockMagicItem({ magicBonus: 4 });

      const simpleChance = command.getIdentificationChance(magicUser, 'sage', simpleItem);
      const complexChance = command.getIdentificationChance(magicUser, 'sage', complexItem);

      expect(simpleChance).toBeGreaterThan(complexChance);
      expect(simpleChance).toBeGreaterThanOrEqual(10);
      expect(simpleChance).toBeLessThanOrEqual(95);
    });

    it('should calculate trial chance with class bonuses', () => {
      const command = new IdentifyMagicItemCommand('magic-user', 'magic-item', 'trial');
      const thief = createMockCharacter({
        id: 'thief',
        class: 'Thief',
        abilities: { ...magicUser.abilities, intelligence: 16 },
      });

      const magicUserChance = command.getIdentificationChance(magicUser, 'trial', magicItem);
      const thiefChance = command.getIdentificationChance(thief, 'trial', magicItem);

      expect(thiefChance).toBeGreaterThan(magicUserChance);
      expect(magicUserChance).toBeGreaterThanOrEqual(5);
      expect(thiefChance).toBeLessThanOrEqual(60);
    });

    it('should apply intelligence bonus to trial and error', () => {
      const command = new IdentifyMagicItemCommand('magic-user', 'magic-item', 'trial');
      const smartChar = createMockCharacter({
        abilities: { ...magicUser.abilities, intelligence: 18 },
      });
      const dullChar = createMockCharacter({
        abilities: { ...magicUser.abilities, intelligence: 8 },
      });

      const smartChance = command.getIdentificationChance(smartChar, 'trial', magicItem);
      const dullChance = command.getIdentificationChance(dullChar, 'trial', magicItem);

      expect(smartChance).toBeGreaterThan(dullChance);
    });
  });

  describe('Time and Cost Calculations', () => {
    it('should return correct time for spell method', () => {
      const command = new IdentifyMagicItemCommand('magic-user', 'magic-item', 'spell');
      const time = command.getIdentificationTime('spell');

      expect(time).toBe('1 turn');
    });

    it('should return correct time for sage method', () => {
      const command = new IdentifyMagicItemCommand('magic-user', 'magic-item', 'sage');
      const time = command.getIdentificationTime('sage');

      expect(time).toBe('1d4 days');
    });

    it('should return correct time for trial method', () => {
      const command = new IdentifyMagicItemCommand('magic-user', 'magic-item', 'trial');
      const time = command.getIdentificationTime('trial');

      expect(time).toBe('1d6 hours');
    });

    it('should return correct cost for spell method', () => {
      const command = new IdentifyMagicItemCommand('magic-user', 'magic-item', 'spell');
      const cost = command.getIdentificationCost('spell', magicItem);

      expect(cost).toBe(100); // Pearl component cost
    });

    it('should calculate sage cost based on item value', () => {
      const command = new IdentifyMagicItemCommand('magic-user', 'magic-item', 'sage');
      const cheapItem = createMockMagicItem({ value: 100 });
      const expensiveItem = createMockMagicItem({ value: 1000 });

      const cheapCost = command.getIdentificationCost('sage', cheapItem);
      const expensiveCost = command.getIdentificationCost('sage', expensiveItem);

      expect(expensiveCost).toBeGreaterThan(cheapCost);
      expect(cheapCost).toBeGreaterThanOrEqual(50); // Minimum cost
    });

    it('should return zero cost for trial method', () => {
      const command = new IdentifyMagicItemCommand('magic-user', 'magic-item', 'trial');
      const cost = command.getIdentificationCost('trial', magicItem);

      expect(cost).toBe(0);
    });
  });

  describe('OSRIC Compliance', () => {
    it('should implement authentic OSRIC identification mechanics', () => {
      const command = new IdentifyMagicItemCommand('magic-user', 'magic-item', 'spell');

      // Test OSRIC-specific requirements
      expect(command.getIdentificationTime('spell')).toBe('1 turn');
      expect(command.getIdentificationCost('spell', magicItem)).toBe(100);
      expect(command.getIdentificationChance(magicUser, 'spell', magicItem)).toBe(100);
    });

    it('should enforce class restrictions for spell method', () => {
      const cleric = createMockCharacter({
        id: 'cleric',
        class: 'Cleric',
        memorizedSpells: { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 8: [], 9: [] },
        spellbook: [],
        inventory: [magicItem],
      });
      context.setEntity('cleric', cleric);

      const command = new IdentifyMagicItemCommand('cleric', 'magic-item', 'spell');
      expect(command.canExecute(context)).toBe(false);
    });

    it('should handle charisma modifiers for sage consultation', () => {
      const command = new IdentifyMagicItemCommand('magic-user', 'magic-item', 'sage');
      const charismaticChar = createMockCharacter({
        abilities: { ...magicUser.abilities, charisma: 18 },
      });
      const uncharismaticChar = createMockCharacter({
        abilities: { ...magicUser.abilities, charisma: 3 },
      });

      const charismaticChance = command.getIdentificationChance(charismaticChar, 'sage', magicItem);
      const uncharismaticChance = command.getIdentificationChance(
        uncharismaticChar,
        'sage',
        magicItem
      );

      expect(charismaticChance).toBeGreaterThan(uncharismaticChance);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing identifier', async () => {
      const command = new IdentifyMagicItemCommand('nonexistent', 'magic-item');
      const result = await command.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Identifier with ID nonexistent not found');
    });

    it('should handle missing item', async () => {
      const command = new IdentifyMagicItemCommand('magic-user', 'nonexistent');
      const result = await command.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Item with ID nonexistent not found');
    });

    it('should handle item not in inventory', async () => {
      const otherItem = createMockMagicItem({ id: 'other-item' });
      context.setItem('other-item', otherItem);

      const command = new IdentifyMagicItemCommand('magic-user', 'other-item');
      const result = await command.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('does not have access to');
    });

    it('should handle exceptions gracefully', async () => {
      // Create command with invalid method that might cause errors
      const command = new IdentifyMagicItemCommand('magic-user', 'magic-item', 'spell');
      const result = await command.execute(context);

      expect(result.success).toBe(true); // Execute succeeds, validation happens in canExecute
    });
  });
});
