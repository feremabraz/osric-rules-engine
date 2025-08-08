import { GameContext } from '@osric/core/GameContext';

import { Item, ItemFactory } from '@osric/entities/Item';
import type { Item as BaseItem, Weapon } from '@osric/types/entities';
import { createStore } from 'jotai';
import { beforeEach, describe, expect, it } from 'vitest';

describe('Item', () => {
  let context: GameContext;

  beforeEach(() => {
    const store = createStore();
    context = new GameContext(store);
  });

  function createBasicItemData(overrides: Partial<BaseItem> = {}): BaseItem {
    return {
      id: 'test-item',
      name: 'Test Item',
      weight: 1,
      description: 'A test item',
      value: 10,
      equipped: false,
      magicBonus: null,
      charges: null,
      ...overrides,
    };
  }

  function createWeaponData(overrides: Partial<Weapon> = {}): Weapon {
    return {
      ...createBasicItemData(),
      damage: '1d8',
      type: 'Melee',
      size: 'Medium',
      speed: 7,
      allowedClasses: ['Fighter', 'Cleric'],
      damageVsLarge: '1d12',
      range: null,
      twoHanded: false,
      ...overrides,
    };
  }

  describe('Creation and Basic Properties', () => {
    it('should create item with all basic properties', () => {
      const itemData = createBasicItemData({
        id: 'sword-1',
        name: 'Iron Sword',
        weight: 4,
        description: 'A well-crafted iron sword',
        value: 150,
        equipped: true,
        magicBonus: 1,
        charges: 5,
      });

      const item = new Item(itemData);

      expect(item.id).toBe('sword-1');
      expect(item.name).toBe('Iron Sword');
      expect(item.weight).toBe(4);
      expect(item.description).toBe('A well-crafted iron sword');
      expect(item.value).toBe(150);
      expect(item.equipped).toBe(true);
      expect(item.magicBonus).toBe(1);
      expect(item.charges).toBe(5);
    });

    it('should create item with minimal properties', () => {
      const itemData = createBasicItemData();
      const item = new Item(itemData);

      expect(item.id).toBe('test-item');
      expect(item.name).toBe('Test Item');
      expect(item.weight).toBe(1);
      expect(item.equipped).toBe(false);
      expect(item.magicBonus).toBe(null);
      expect(item.charges).toBe(null);
    });

    it('should return immutable data copy', () => {
      const itemData = createBasicItemData();
      const item = new Item(itemData);
      const data = item.data;

      data.name = 'Modified Name';
      expect(item.name).toBe('Test Item');
    });
  });

  describe('Weapon Detection and Properties', () => {
    it('should correctly identify weapons', () => {
      const weaponData = createWeaponData();
      const weapon = new Item(weaponData);

      expect(weapon.isWeapon()).toBe(true);
      expect(weapon.getWeaponDamage()).toBe('1d8');
      expect(weapon.getWeaponSpeed()).toBe(7);
      expect(weapon.requiresProficiency()).toBe(true);
    });

    it('should correctly identify non-weapons', () => {
      const itemData = createBasicItemData();
      const item = new Item(itemData);

      expect(item.isWeapon()).toBe(false);
      expect(item.getWeaponDamage()).toBe(null);
      expect(item.getWeaponSpeed()).toBe(0);
      expect(item.requiresProficiency()).toBe(false);
    });

    it('should check class restrictions for weapons', () => {
      const weaponData = createWeaponData({
        allowedClasses: ['Fighter', 'Paladin'],
      });
      const weapon = new Item(weaponData);

      expect(weapon.canBeUsedByClass('Fighter')).toBe(true);
      expect(weapon.canBeUsedByClass('Paladin')).toBe(true);
      expect(weapon.canBeUsedByClass('Magic User')).toBe(false);
      expect(weapon.canBeUsedByClass('Thief')).toBe(false);
    });

    it('should allow all classes to use non-weapons', () => {
      const itemData = createBasicItemData();
      const item = new Item(itemData);

      expect(item.canBeUsedByClass('Fighter')).toBe(true);
      expect(item.canBeUsedByClass('Magic User')).toBe(true);
      expect(item.canBeUsedByClass('Cleric')).toBe(true);
      expect(item.canBeUsedByClass('Thief')).toBe(true);
    });
  });

  describe('Magic Properties', () => {
    it('should detect magical items', () => {
      const magicItem = new Item(createBasicItemData({ magicBonus: 2 }));
      const nonMagicItem = new Item(createBasicItemData({ magicBonus: null }));
      const zeroMagicItem = new Item(createBasicItemData({ magicBonus: 0 }));

      expect(magicItem.isMagical()).toBe(true);
      expect(nonMagicItem.isMagical()).toBe(false);
      expect(zeroMagicItem.isMagical()).toBe(false);
    });

    it('should return correct magic bonus', () => {
      const magicItem = new Item(createBasicItemData({ magicBonus: 3 }));
      const cursedItem = new Item(createBasicItemData({ magicBonus: -1 }));
      const normalItem = new Item(createBasicItemData({ magicBonus: null }));

      expect(magicItem.getMagicBonus()).toBe(3);
      expect(cursedItem.getMagicBonus()).toBe(-1);
      expect(normalItem.getMagicBonus()).toBe(0);
    });

    it('should add magic bonus correctly', () => {
      const item = new Item(createBasicItemData({ magicBonus: 1 }));
      const enhanced = item.addMagicBonus(2);

      expect(enhanced.getMagicBonus()).toBe(3);
      expect(item.getMagicBonus()).toBe(1);
    });

    it('should add magic bonus to non-magical items', () => {
      const item = new Item(createBasicItemData({ magicBonus: null }));
      const enhanced = item.addMagicBonus(1);

      expect(enhanced.getMagicBonus()).toBe(1);
      expect(enhanced.isMagical()).toBe(true);
    });
  });

  describe('Charge Management', () => {
    it('should detect items with charges', () => {
      const chargedItem = new Item(createBasicItemData({ charges: 5 }));
      const normalItem = new Item(createBasicItemData({ charges: null }));

      expect(chargedItem.hasCharges()).toBe(true);
      expect(chargedItem.getRemainingCharges()).toBe(5);
      expect(normalItem.hasCharges()).toBe(false);
      expect(normalItem.getRemainingCharges()).toBe(0);
    });

    it('should use charges correctly', () => {
      const item = new Item(createBasicItemData({ charges: 3 }));
      const afterUse = item.useCharge();

      expect(afterUse.getRemainingCharges()).toBe(2);
      expect(item.getRemainingCharges()).toBe(3);
    });

    it('should not reduce charges below zero', () => {
      const item = new Item(createBasicItemData({ charges: 1 }));
      const afterUse1 = item.useCharge();
      const afterUse2 = afterUse1.useCharge();

      expect(afterUse1.getRemainingCharges()).toBe(0);
      expect(afterUse2.getRemainingCharges()).toBe(0);
    });

    it('should not affect items without charges', () => {
      const item = new Item(createBasicItemData({ charges: null }));
      const afterUse = item.useCharge();

      expect(afterUse.getRemainingCharges()).toBe(0);
      expect(afterUse.hasCharges()).toBe(false);
    });

    it('should detect broken items', () => {
      const workingItem = new Item(createBasicItemData({ charges: 5 }));
      const brokenItem = new Item(createBasicItemData({ charges: 0 }));
      const normalItem = new Item(createBasicItemData({ charges: null }));

      expect(workingItem.isBroken()).toBe(false);
      expect(brokenItem.isBroken()).toBe(true);
      expect(normalItem.isBroken()).toBe(false);
    });
  });

  describe('Equipment State', () => {
    it('should track equipped state', () => {
      const equippedItem = new Item(createBasicItemData({ equipped: true }));
      const unequippedItem = new Item(createBasicItemData({ equipped: false }));

      expect(equippedItem.isEquipped()).toBe(true);
      expect(unequippedItem.isEquipped()).toBe(false);
    });

    it('should change equipped state', () => {
      const item = new Item(createBasicItemData({ equipped: false }));
      const equipped = item.setEquipped(true);
      const unequipped = equipped.setEquipped(false);

      expect(equipped.isEquipped()).toBe(true);
      expect(unequipped.isEquipped()).toBe(false);
      expect(item.isEquipped()).toBe(false);
    });
  });

  describe('Value and Currency', () => {
    it('should calculate total weight and value', () => {
      const item = new Item(
        createBasicItemData({
          weight: 5,
          value: 100,
        })
      );

      expect(item.getTotalWeight()).toBe(5);
      expect(item.getTotalValue()).toBe(100);
    });

    it('should convert value to currency', () => {
      const item = new Item(createBasicItemData({ value: 23 }));
      const currency = item.getValueAsCurrency();

      expect(currency.platinum).toBe(4);
      expect(currency.gold).toBe(3);
      expect(currency.electrum).toBe(0);
      expect(currency.silver).toBe(0);
      expect(currency.copper).toBe(0);
    });

    it('should handle zero value conversion', () => {
      const item = new Item(createBasicItemData({ value: 0 }));
      const currency = item.getValueAsCurrency();

      expect(currency.platinum).toBe(0);
      expect(currency.gold).toBe(0);
    });
  });

  describe('Command Execution', () => {
    it('should validate attack commands for weapons', () => {
      const weapon = new Item(createWeaponData());
      const item = new Item(createBasicItemData());

      expect(weapon.canExecuteCommand('attack', {})).toBe(true);
      expect(item.canExecuteCommand('attack', {})).toBe(false);
    });

    it('should validate use-item commands for magical/charged items', () => {
      const magicItem = new Item(createBasicItemData({ magicBonus: 1 }));
      const chargedItem = new Item(createBasicItemData({ charges: 5 }));
      const normalItem = new Item(createBasicItemData());

      expect(magicItem.canExecuteCommand('use-item', {})).toBe(true);
      expect(chargedItem.canExecuteCommand('use-item', {})).toBe(true);
      expect(normalItem.canExecuteCommand('use-item', {})).toBe(false);
    });

    it('should validate equip/unequip commands', () => {
      const equippedItem = new Item(createBasicItemData({ equipped: true }));
      const unequippedItem = new Item(createBasicItemData({ equipped: false }));

      expect(equippedItem.canExecuteCommand('equip', {})).toBe(false);
      expect(equippedItem.canExecuteCommand('unequip', {})).toBe(true);
      expect(unequippedItem.canExecuteCommand('equip', {})).toBe(true);
      expect(unequippedItem.canExecuteCommand('unequip', {})).toBe(false);
    });

    it('should validate sell commands', () => {
      const valuableItem = new Item(createBasicItemData({ value: 100 }));
      const worthlessItem = new Item(createBasicItemData({ value: 0 }));

      expect(valuableItem.canExecuteCommand('sell', {})).toBe(true);
      expect(worthlessItem.canExecuteCommand('sell', {})).toBe(false);
    });

    it('should allow unknown commands by default', () => {
      const item = new Item(createBasicItemData());

      expect(item.canExecuteCommand('unknown-command', {})).toBe(true);
    });

    it('should throw error when executing commands directly', async () => {
      const item = new Item(createBasicItemData());

      await expect(item.executeCommand('attack', {}, context)).rejects.toThrow(
        'Command execution should be handled by the RuleEngine'
      );
    });
  });

  describe('Display and Updates', () => {
    it('should generate correct display names', () => {
      const normalItem = new Item(createBasicItemData({ name: 'Iron Sword' }));
      const magicItem = new Item(
        createBasicItemData({
          name: 'Iron Sword',
          magicBonus: 2,
        })
      );
      const cursedItem = new Item(
        createBasicItemData({
          name: 'Iron Sword',
          magicBonus: -1,
        })
      );
      const equippedItem = new Item(
        createBasicItemData({
          name: 'Iron Sword',
          equipped: true,
        })
      );
      const chargedItem = new Item(
        createBasicItemData({
          name: 'Wand',
          charges: 3,
        })
      );

      expect(normalItem.getDisplayName()).toBe('Iron Sword');
      expect(magicItem.getDisplayName()).toBe('Iron Sword +2');
      expect(cursedItem.getDisplayName()).toBe('Iron Sword -1');
      expect(equippedItem.getDisplayName()).toBe('Iron Sword (equipped)');
      expect(chargedItem.getDisplayName()).toBe('Wand (3 charges)');
    });

    it('should update item properties', () => {
      const item = new Item(createBasicItemData());
      const updated = item.update({
        name: 'Updated Item',
        value: 200,
        equipped: true,
      });

      expect(updated.name).toBe('Updated Item');
      expect(updated.value).toBe(200);
      expect(updated.equipped).toBe(true);
      expect(item.name).toBe('Test Item');
    });

    it('should clone item correctly', () => {
      const original = new Item(
        createBasicItemData({
          name: 'Original',
          magicBonus: 1,
          charges: 5,
        })
      );
      const clone = original.clone();

      expect(clone.data).toEqual(original.data);
      expect(clone).not.toBe(original);
    });
  });

  describe('ItemFactory', () => {
    it('should create items using factory', () => {
      const data = createBasicItemData();
      const item = ItemFactory.create(data);

      expect(item).toBeInstanceOf(Item);
      expect(item.id).toBe(data.id);
    });

    it('should create items from JSON', () => {
      const data = createBasicItemData();
      const json = JSON.stringify(data);
      const item = ItemFactory.fromJSON(json);

      expect(item).toBeInstanceOf(Item);
      expect(item.data).toEqual(data);
    });

    it('should create basic items with options', () => {
      const item = ItemFactory.createBasicItem({
        name: 'Test Potion',
        weight: 0.5,
        value: 50,
        description: 'A healing potion',
        magicBonus: 1,
        charges: 3,
      });

      expect(item.name).toBe('Test Potion');
      expect(item.weight).toBe(0.5);
      expect(item.value).toBe(50);
      expect(item.description).toBe('A healing potion');
      expect(item.magicBonus).toBe(1);
      expect(item.charges).toBe(3);
      expect(item.id).toMatch(/^item-\d+$/);
    });

    it('should validate item data', () => {
      const validData = createBasicItemData();
      const invalidData = createBasicItemData({
        weight: -1,
        value: -10,
        charges: -5,
      });

      const validResult = ItemFactory.validate(validData);
      const invalidResult = ItemFactory.validate(invalidData);

      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors).toHaveLength(3);
      expect(invalidResult.errors).toContain('Item weight cannot be negative: -1');
      expect(invalidResult.errors).toContain('Item value cannot be negative: -10');
      expect(invalidResult.errors).toContain('Item charges cannot be negative: -5');
    });
  });

  describe('OSRIC Compliance', () => {
    it('should implement authentic OSRIC/AD&D 1st Edition item mechanics', () => {
      const longsword = new Item(
        createWeaponData({
          name: 'Long Sword +1',
          damage: '1d8',
          damageVsLarge: '1d12',
          magicBonus: 1,
          allowedClasses: ['Fighter', 'Paladin', 'Ranger'],
          speed: 5,
          twoHanded: false,
        })
      );

      expect(longsword.isWeapon()).toBe(true);
      expect(longsword.isMagical()).toBe(true);
      expect(longsword.getWeaponDamage()).toBe('1d8');
      expect(longsword.getMagicBonus()).toBe(1);
      expect(longsword.canBeUsedByClass('Fighter')).toBe(true);
      expect(longsword.canBeUsedByClass('Magic User')).toBe(false);
      expect(longsword.getDisplayName()).toBe('Long Sword +1 +1');
    });

    it('should handle classic charged magical items', () => {
      const wandOfFireballs = new Item(
        createBasicItemData({
          name: 'Wand of Fireballs',
          charges: 20,
          magicBonus: null,
          value: 5000,
          weight: 1,
        })
      );

      expect(wandOfFireballs.hasCharges()).toBe(true);
      expect(wandOfFireballs.getRemainingCharges()).toBe(20);
      expect(wandOfFireballs.canExecuteCommand('use-item', {})).toBe(true);
      expect(wandOfFireballs.getDisplayName()).toBe('Wand of Fireballs (20 charges)');
    });

    it('should implement proper currency conversion', () => {
      const gemstone = new Item(
        createBasicItemData({
          name: 'Ruby',
          value: 1000,
        })
      );
      const currency = gemstone.getValueAsCurrency();

      expect(currency.platinum).toBe(200);
      expect(currency.gold).toBe(0);
    });
  });
});
