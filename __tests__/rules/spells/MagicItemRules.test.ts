import { GameContext } from '@osric/core/GameContext';
import {
  MagicItemChargeCalculationRule,
  MagicItemChargeUsageRule,
  MagicItemIdentificationRule,
  MagicItemSavingThrowRule,
} from '@osric/rules/spells/MagicItemRules';
import type { Character } from '@osric/types/entities';
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
    memorizedSpells: { 1: [], 2: [], 3: [] },
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
    position: 'study',
    statusEffects: [],
    ...overrides,
  } as Character;
}

function createMockMagicItem(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'test-wand',
    name: 'Wand of Magic Missiles',
    description: 'A magical wand that fires magic missiles',
    type: 'Weapon',
    subType: 'wand',
    weight: 1,
    value: 2000,
    charges: null,
    magicBonus: 0,
    equipped: false,
    properties: [],
    itemType: 'wand',
    ...overrides,
  };
}

describe('MagicItemChargeCalculationRule', () => {
  let rule: MagicItemChargeCalculationRule;
  let context: GameContext;

  beforeEach(() => {
    const store = createStore();
    context = new GameContext(store);
    rule = new MagicItemChargeCalculationRule();
  });

  describe('canApply', () => {
    it('should apply when newMagicItem exists', () => {
      const item = createMockMagicItem();
      context.setTemporary('newMagicItem', item);

      expect(rule.canApply(context)).toBe(true);
    });

    it('should not apply when newMagicItem is missing', () => {
      expect(rule.canApply(context)).toBe(false);
    });
  });

  describe('execute - wands', () => {
    it('should calculate charges for wands using OSRIC formula', async () => {
      const wand = createMockMagicItem({ itemType: 'wand' });
      context.setTemporary('newMagicItem', wand);

      const result = await rule.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.itemType).toBe('wand');
      expect(result.data?.chargeFormula).toBe('101 - 1d20');
      expect(result.data?.charges).toBeGreaterThanOrEqual(81);
      expect(result.data?.charges).toBeLessThanOrEqual(100);
      expect(result.message).toContain('Wand of Magic Missiles (wand) has');
      expect(result.message).toContain('charges');
    });

    it('should update item with calculated charges', async () => {
      const wand = createMockMagicItem({ itemType: 'wand' });
      context.setTemporary('newMagicItem', wand);

      await rule.execute(context);

      const updatedItem = context.getTemporary('updatedMagicItem') as Record<string, unknown>;
      expect(updatedItem).toBeDefined();
      expect(updatedItem.charges).toBeGreaterThanOrEqual(81);
      expect(updatedItem.charges).toBeLessThanOrEqual(100);
    });
  });

  describe('execute - rods', () => {
    it('should calculate charges for rods using OSRIC formula', async () => {
      const rod = createMockMagicItem({
        itemType: 'rod',
        name: 'Rod of Lightning',
      });
      context.setTemporary('newMagicItem', rod);

      const result = await rule.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.itemType).toBe('rod');
      expect(result.data?.chargeFormula).toBe('51 - 1d10');
      expect(result.data?.charges).toBeGreaterThanOrEqual(41);
      expect(result.data?.charges).toBeLessThanOrEqual(50);
    });
  });

  describe('execute - staves', () => {
    it('should calculate charges for staves using OSRIC formula', async () => {
      const staff = createMockMagicItem({
        itemType: 'staff',
        name: 'Staff of Power',
      });
      context.setTemporary('newMagicItem', staff);

      const result = await rule.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.itemType).toBe('staff');
      expect(result.data?.chargeFormula).toBe('26 - 1d6');
      expect(result.data?.charges).toBeGreaterThanOrEqual(20);
      expect(result.data?.charges).toBeLessThanOrEqual(25);
    });
  });

  describe('execute - non-charge items', () => {
    it("should handle magic items that don't use charges", async () => {
      const sword = createMockMagicItem({
        itemType: 'sword',
        name: 'Flame Tongue',
        type: 'Weapon',
        subType: 'sword',
      });
      context.setTemporary('newMagicItem', sword);

      const result = await rule.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.charges).toBeNull();
      expect(result.data?.chargeFormula).toBe('N/A');
      expect(result.message).toContain('does not use charges');
    });
  });

  describe('execute - error handling', () => {
    it('should handle missing magic item', async () => {
      const result = await rule.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('No magic item found for charge calculation');
    });
  });
});

describe('MagicItemChargeUsageRule', () => {
  let rule: MagicItemChargeUsageRule;
  let context: GameContext;

  beforeEach(() => {
    const store = createStore();
    context = new GameContext(store);
    rule = new MagicItemChargeUsageRule();
  });

  describe('canApply', () => {
    it('should apply when magicItemToUse exists', () => {
      const item = createMockMagicItem();
      context.setTemporary('magicItemToUse', item);

      expect(rule.canApply(context)).toBe(true);
    });

    it('should not apply when magicItemToUse is missing', () => {
      expect(rule.canApply(context)).toBe(false);
    });
  });

  describe('execute - charge usage', () => {
    it('should use one charge from a charged item', async () => {
      const character = createMockCharacter();
      const wand = createMockMagicItem({ charges: 50 });

      context.setTemporary('magicItemToUse', wand);
      context.setTemporary('itemUser', character);

      const result = await rule.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.chargesRemaining).toBe(49);
      expect(result.data?.disintegrated).toBe(false);
      expect(result.message).toContain('49 charges remaining');
    });

    it('should handle item with no charges (non-charge item)', async () => {
      const character = createMockCharacter();
      const sword = createMockMagicItem({ charges: null });

      context.setTemporary('magicItemToUse', sword);
      context.setTemporary('itemUser', character);

      const result = await rule.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.chargesRemaining).toBeNull();
      expect(result.data?.disintegrated).toBe(false);
      expect(result.message).toContain("doesn't use charges");
    });

    it('should disintegrate item when using last charge', async () => {
      const character = createMockCharacter();
      const wand = createMockMagicItem({ charges: 1 });

      context.setTemporary('magicItemToUse', wand);
      context.setTemporary('itemUser', character);
      context.setEntity('test-character', character);

      const result = await rule.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.chargesRemaining).toBe(0);
      expect(result.data?.disintegrated).toBe(true);
      expect(result.message).toContain('disintegrates into dust');
    });

    it('should fail when item has no charges left', async () => {
      const character = createMockCharacter();
      const wand = createMockMagicItem({ charges: 0 });

      context.setTemporary('magicItemToUse', wand);
      context.setTemporary('itemUser', character);
      context.setEntity('test-character', character);

      const result = await rule.execute(context);

      expect(result.success).toBe(false);
      expect(result.data?.chargesRemaining).toBe(0);
      expect(result.data?.disintegrated).toBe(true);
      expect(result.message).toContain('has no charges left and disintegrates');
    });
  });

  describe('execute - error handling', () => {
    it('should handle missing item or user', async () => {
      const result = await rule.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Missing item or user information');
    });
  });
});

describe('MagicItemSavingThrowRule', () => {
  let rule: MagicItemSavingThrowRule;
  let context: GameContext;

  beforeEach(() => {
    const store = createStore();
    context = new GameContext(store);
    rule = new MagicItemSavingThrowRule();
  });

  describe('canApply', () => {
    it('should apply when magicItemSavingThrow data exists', () => {
      const savingThrowData = {
        item: createMockMagicItem(),
        effectType: 'dispel_magic',
      };
      context.setTemporary('magicItemSavingThrow', savingThrowData);

      expect(rule.canApply(context)).toBe(true);
    });

    it('should not apply when magicItemSavingThrow data is missing', () => {
      expect(rule.canApply(context)).toBe(false);
    });
  });

  describe('execute - different item types', () => {
    it('should use correct saving throw for wands', async () => {
      const wand = createMockMagicItem({ itemType: 'wand' });
      const savingThrowData = {
        item: wand,
        effectType: 'rod_of_cancellation',
      };
      context.setTemporary('magicItemSavingThrow', savingThrowData);

      const result = await rule.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.itemType).toBe('wand');
      expect(result.data?.targetRoll).toBe(15);
      expect(result.message).toContain('Rod Of Cancellation');
    });

    it('should use correct saving throw for rings', async () => {
      const ring = createMockMagicItem({ itemType: 'ring', name: 'Ring of Protection' });
      const savingThrowData = {
        item: ring,
        effectType: 'dispel_magic',
      };
      context.setTemporary('magicItemSavingThrow', savingThrowData);

      const result = await rule.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.itemType).toBe('ring');
      expect(result.data?.targetRoll).toBe(19);
    });

    it('should use correct saving throw for armor', async () => {
      const armor = createMockMagicItem({
        type: 'Armor',
        name: 'Plate Mail +1',
        magicBonus: 1,
      });

      const { itemType, ...armorWithoutItemType } = armor;
      const savingThrowData = {
        item: armorWithoutItemType,
        effectType: 'antimagic_field',
      };
      context.setTemporary('magicItemSavingThrow', savingThrowData);

      const result = await rule.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.itemType).toBe('armor');
      expect(result.data?.targetRoll).toBe(15);
    });

    it('should use correct saving throw for powerful armor', async () => {
      const armor = createMockMagicItem({
        type: 'Armor',
        name: 'Plate Mail +5',
        magicBonus: 5,
      });
      const { itemType, ...armorWithoutItemType } = armor;
      const savingThrowData = {
        item: armorWithoutItemType,
        effectType: 'rod_of_cancellation',
      };
      context.setTemporary('magicItemSavingThrow', savingThrowData);

      const result = await rule.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.itemType).toBe('armorPowerful');
      expect(result.data?.targetRoll).toBe(8);
    });

    it('should handle holy swords differently from regular swords', async () => {
      const holySword = createMockMagicItem({
        type: 'Weapon',
        subType: 'sword',
        name: 'Holy Avenger',
        isHoly: true,
      });
      const { itemType, ...swordWithoutItemType } = holySword;
      const savingThrowData = {
        item: swordWithoutItemType,
        effectType: 'rod_of_cancellation',
      };
      context.setTemporary('magicItemSavingThrow', savingThrowData);

      const result = await rule.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.itemType).toBe('swordHoly');
      expect(result.data?.targetRoll).toBe(7);
    });
  });

  describe('execute - effect modifiers', () => {
    it('should apply dispel magic modifier', async () => {
      const item = createMockMagicItem({ itemType: 'scroll' });
      const savingThrowData = {
        item,
        effectType: 'dispel_magic',
      };
      context.setTemporary('magicItemSavingThrow', savingThrowData);

      const result = await rule.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.targetRoll).toBe(21);
    });

    it('should apply antimagic field modifier', async () => {
      const item = createMockMagicItem({ itemType: 'potion' });
      const savingThrowData = {
        item,
        effectType: 'antimagic_field',
      };
      context.setTemporary('magicItemSavingThrow', savingThrowData);

      const result = await rule.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.targetRoll).toBe(24);
    });
  });

  describe('execute - error handling', () => {
    it('should handle missing saving throw data', async () => {
      const result = await rule.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('No saving throw data found');
    });
  });
});

describe('MagicItemIdentificationRule', () => {
  let rule: MagicItemIdentificationRule;
  let context: GameContext;

  beforeEach(() => {
    const store = createStore();
    context = new GameContext(store);
    rule = new MagicItemIdentificationRule();
  });

  describe('canApply', () => {
    it('should apply when identificationAttempt data exists', () => {
      const identificationAttempt = {
        character: createMockCharacter(),
        item: createMockMagicItem(),
        method: 'identify_spell',
      };
      context.setTemporary('identificationAttempt', identificationAttempt);

      expect(rule.canApply(context)).toBe(true);
    });

    it('should not apply when identificationAttempt data is missing', () => {
      expect(rule.canApply(context)).toBe(false);
    });
  });

  describe('execute - identify spell', () => {
    it('should handle identify spell with pearl', async () => {
      const character = createMockCharacter({ level: 20 });
      const item = createMockMagicItem({ charges: 50 });
      const identificationAttempt = {
        character,
        item,
        method: 'identify_spell',
        hasPearl: true,
      };

      context.setTemporary('identificationAttempt', identificationAttempt);
      context.setEntity('test-character', character);

      const result = await rule.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.constitutionLoss).toBe(8);

      const updatedCharacter = context.getEntity<Character>('test-character');
      expect(updatedCharacter?.abilities.constitution).toBe(8);
      expect(updatedCharacter?.statusEffects).toHaveLength(1);
      expect(updatedCharacter?.statusEffects[0].name).toContain('Constitution Loss');
    });

    it('should fail without pearl', async () => {
      const character = createMockCharacter();
      const item = createMockMagicItem();
      const identificationAttempt = {
        character,
        item,
        method: 'identify_spell',
        hasPearl: false,
      };

      context.setTemporary('identificationAttempt', identificationAttempt);

      const result = await rule.execute(context);

      expect(result.success).toBe(true);
      expect(result.message).toContain('fails to identify');
    });

    it('should provide item type information when successful', async () => {
      const character = createMockCharacter({ level: 20 });
      const item = createMockMagicItem({
        charges: 80,
        magicBonus: 2,
        name: 'Wand of Lightning',
      });
      const identificationAttempt = {
        character,
        item,
        method: 'identify_spell',
        hasPearl: true,
      };

      context.setTemporary('identificationAttempt', identificationAttempt);
      context.setEntity('test-character', character);

      const result = await rule.execute(context);

      expect(result.success).toBe(true);

      expect(result.data).toBeDefined();
    });
  });

  describe('execute - arcane study', () => {
    it('should use intelligence-based calculation', async () => {
      const character = createMockCharacter({
        level: 8,
        abilities: { ...createMockCharacter().abilities, intelligence: 18 },
      });
      const item = createMockMagicItem({ charges: 30 });
      const identificationAttempt = {
        character,
        item,
        method: 'arcane_study',
      };

      context.setTemporary('identificationAttempt', identificationAttempt);
      context.setEntity('test-character', character);

      const result = await rule.execute(context);

      expect(result.success).toBe(true);
      expect(result.message).toContain('arcane study');

      expect(result.data?.constitutionLoss).toBeGreaterThanOrEqual(0);
      expect(result.data?.constitutionLoss).toBeLessThanOrEqual(3);
    });

    it('should provide additional information for high intelligence', async () => {
      const character = createMockCharacter({
        level: 5,
        abilities: { ...createMockCharacter().abilities, intelligence: 17 },
      });
      const item = createMockMagicItem({
        value: 5000,
        name: 'Ancient Relic',
      });
      const identificationAttempt = {
        character,
        item,
        method: 'arcane_study',
      };

      context.setTemporary('identificationAttempt', identificationAttempt);
      context.setEntity('test-character', character);

      const result = await rule.execute(context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe('execute - divine knowledge', () => {
    it('should work for divine classes', async () => {
      const cleric = createMockCharacter({
        class: 'Cleric',
        level: 6,
        abilities: { ...createMockCharacter().abilities, wisdom: 16 },
      });
      const item = createMockMagicItem();
      const identificationAttempt = {
        character: cleric,
        item,
        method: 'divine_knowledge',
      };

      context.setTemporary('identificationAttempt', identificationAttempt);

      const result = await rule.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.constitutionLoss).toBe(0);
    });

    it('should fail for non-divine classes', async () => {
      const fighter = createMockCharacter({ class: 'Fighter' });
      const item = createMockMagicItem();
      const identificationAttempt = {
        character: fighter,
        item,
        method: 'divine_knowledge',
      };

      context.setTemporary('identificationAttempt', identificationAttempt);

      const result = await rule.execute(context);

      expect(result.success).toBe(true);
      expect(result.message).toContain('fails to identify');
    });

    it('should provide divine insights', async () => {
      const paladin = createMockCharacter({
        class: 'Paladin',
        level: 8,
        abilities: { ...createMockCharacter().abilities, wisdom: 18 },
      });
      const item = createMockMagicItem();
      const identificationAttempt = {
        character: paladin,
        item,
        method: 'divine_knowledge',
      };

      context.setTemporary('identificationAttempt', identificationAttempt);

      const result = await rule.execute(context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe('execute - error handling', () => {
    it('should handle missing identification attempt data', async () => {
      const result = await rule.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('No identification attempt data found');
    });

    it('should handle unknown identification method', async () => {
      const identificationAttempt = {
        character: createMockCharacter(),
        item: createMockMagicItem(),
        method: 'test_method',
      };

      context.setTemporary('identificationAttempt', identificationAttempt);

      const result = await rule.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Unknown identification method');
    });
  });

  describe('OSRIC compliance - identification mechanics', () => {
    it('should enforce authentic AD&D identification mechanics', async () => {
      const lowLevelCaster = createMockCharacter({ level: 1 });
      const highLevelCaster = createMockCharacter({ level: 10 });
      const item = createMockMagicItem();

      const lowLevelAttempt = {
        character: lowLevelCaster,
        item,
        method: 'identify_spell',
        hasPearl: true,
      };

      const highLevelAttempt = {
        character: highLevelCaster,
        item,
        method: 'identify_spell',
        hasPearl: true,
      };

      let lowLevelSuccesses = 0;
      let highLevelSuccesses = 0;

      for (let i = 0; i < 20; i++) {
        context.setTemporary('identificationAttempt', lowLevelAttempt);
        const lowResult = await rule.execute(context);
        if (lowResult.message.includes('successfully identifies')) lowLevelSuccesses++;

        context.setTemporary('identificationAttempt', highLevelAttempt);
        const highResult = await rule.execute(context);
        if (highResult.message.includes('successfully identifies')) highLevelSuccesses++;
      }

      expect(highLevelSuccesses).toBeGreaterThanOrEqual(lowLevelSuccesses);
    });

    it('should properly handle constitution loss mechanics', async () => {
      const character = createMockCharacter({
        level: 10,
        abilities: { ...createMockCharacter().abilities, constitution: 15 },
      });
      const item = createMockMagicItem();
      const identificationAttempt = {
        character,
        item,
        method: 'identify_spell',
        hasPearl: true,
      };

      context.setTemporary('identificationAttempt', identificationAttempt);
      context.setEntity('test-character', character);

      await rule.execute(context);

      const updatedCharacter = context.getEntity<Character>('test-character');

      expect(updatedCharacter?.statusEffects).toHaveLength(1);
      const statusEffect = updatedCharacter?.statusEffects[0];
      expect(statusEffect?.name).toContain('Constitution Loss');
      expect(statusEffect?.duration).toBe(64);
      expect(statusEffect?.effect).toBe('constitution_drain');
    });
  });
});
