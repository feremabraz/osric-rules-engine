import type { CommandResult } from '@osric/core/Command';
import type { GameContext } from '@osric/core/GameContext';
import type { ItemId } from '@osric/types';
import { createItemId } from '@osric/types';
import type { Item as BaseItem, Currency, Weapon } from '@osric/types/entities';

export class Item {
  private _data: BaseItem;

  constructor(data: BaseItem) {
    this._data = { ...data };
  }

  get id(): ItemId {
    return this._data.id as ItemId;
  }
  get name(): string {
    return this._data.name;
  }
  get weight(): number {
    return this._data.weight;
  }
  get description(): string {
    return this._data.description;
  }
  get value(): number {
    return this._data.value;
  }
  get equipped(): boolean {
    return this._data.equipped;
  }
  get magicBonus(): number | null {
    return this._data.magicBonus;
  }
  get charges(): number | null {
    return this._data.charges;
  }

  get data(): BaseItem {
    return { ...this._data };
  }

  isWeapon(): boolean {
    return 'damage' in this._data && 'type' in this._data;
  }

  isMagical(): boolean {
    return this._data.magicBonus !== null && this._data.magicBonus !== 0;
  }

  getWeaponDamage(): string | null {
    if (!this.isWeapon()) return null;
    return (this._data as Weapon).damage || null;
  }

  getMagicBonus(): number {
    return this._data.magicBonus || 0;
  }

  getTotalWeight(): number {
    return this._data.weight;
  }

  getTotalValue(): number {
    return this._data.value;
  }

  getValueAsCurrency(): Currency {
    const goldValue = this._data.value;

    const platinum = Math.floor(goldValue / 5);
    const remainingGold = goldValue % 5;

    return {
      platinum,
      gold: remainingGold,
      electrum: 0,
      silver: 0,
      copper: 0,
    };
  }

  canBeUsedByClass(characterClass: string): boolean {
    if (!this.isWeapon()) return true;

    const weapon = this._data as Weapon;
    return weapon.allowedClasses.some((cls) => cls === characterClass);
  }

  requiresProficiency(): boolean {
    return this.isWeapon();
  }

  getWeaponSpeed(): number {
    if (!this.isWeapon()) return 0;
    return (this._data as Weapon).speed || 0;
  }

  hasCharges(): boolean {
    return this._data.charges !== null;
  }

  getRemainingCharges(): number {
    return this._data.charges || 0;
  }

  isEquipped(): boolean {
    return this._data.equipped;
  }

  async executeCommand(
    _commandType: string,
    _parameters: Record<string, unknown>,
    _context: GameContext
  ): Promise<CommandResult> {
    throw new Error('Command execution should be handled by the RuleEngine');
  }

  canExecuteCommand(commandType: string, _parameters: Record<string, unknown>): boolean {
    switch (commandType) {
      case 'attack':
        return this.isWeapon();
      case 'use-item':
        return this.hasCharges() || this.isMagical();
      case 'equip':
        return !this._data.equipped;
      case 'unequip':
        return this._data.equipped;
      case 'sell':
        return this._data.value > 0;
      default:
        return true;
    }
  }

  update(updates: Partial<BaseItem>): Item {
    return new Item({ ...this._data, ...updates });
  }

  useCharge(): Item {
    if (!this.hasCharges()) return this;

    const currentCharges = this.getRemainingCharges();
    if (currentCharges <= 0) return this;

    return this.update({ charges: currentCharges - 1 });
  }

  setEquipped(equipped: boolean): Item {
    return this.update({ equipped });
  }

  addMagicBonus(bonus: number): Item {
    const currentBonus = this._data.magicBonus || 0;
    return this.update({ magicBonus: currentBonus + bonus });
  }

  isBroken(): boolean {
    return this.hasCharges() && this.getRemainingCharges() <= 0;
  }

  getDisplayName(): string {
    let name = this._data.name;

    if (this.isMagical()) {
      const bonus = this.getMagicBonus();
      if (bonus > 0) {
        name += ` +${bonus}`;
      } else if (bonus < 0) {
        name += ` ${bonus}`;
      }
    }

    if (this._data.equipped) {
      name += ' (equipped)';
    }

    if (this.hasCharges()) {
      name += ` (${this.getRemainingCharges()} charges)`;
    }

    return name;
  }

  clone(): Item {
    return new Item(JSON.parse(JSON.stringify(this._data)));
  }
}

export const ItemFactory = {
  create(data: BaseItem): Item {
    return new Item(data);
  },

  fromJSON(json: string): Item {
    const data = JSON.parse(json) as BaseItem;
    return new Item(data);
  },

  createBasicItem(options: {
    name: string;
    weight: number;
    value: number;
    description: string;
    magicBonus?: number;
    charges?: number;
  }): Item {
    const data: BaseItem = {
      id: createItemId(`item-${Date.now()}`),
      name: options.name,
      weight: options.weight,
      description: options.description,
      value: options.value,
      equipped: false,
      magicBonus: options.magicBonus || null,
      charges: options.charges || null,
    };

    return new Item(data);
  },

  validate(data: BaseItem): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (data.weight < 0) {
      errors.push(`Item weight cannot be negative: ${data.weight}`);
    }

    if (data.value < 0) {
      errors.push(`Item value cannot be negative: ${data.value}`);
    }

    if (data.charges !== null && data.charges < 0) {
      errors.push(`Item charges cannot be negative: ${data.charges}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },
};
