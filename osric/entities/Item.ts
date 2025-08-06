/**
 * Enhanced Item entity wrapper for OSRIC Rules Engine
 *
 * Wraps the base Item interface with command-oriented behavior methods
 * while preserving all OSRIC AD&D 1st Edition item data and mechanics.
 */

import type { CommandResult } from '../core/Command';
import type { GameContext } from '../core/GameContext';
import type { Item as BaseItem, Currency, Weapon } from '../types/entities';

/**
 * Enhanced Item entity with command execution capabilities
 *
 * PRESERVATION NOTE: All original Item data is maintained via composition,
 * with added methods for command-oriented interactions.
 */
export class Item {
  private _data: BaseItem;

  constructor(data: BaseItem) {
    this._data = { ...data };
  }

  // ===== DATA ACCESS =====
  // Preserve all original OSRIC item data

  get id(): string {
    return this._data.id;
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

  // Get raw data for systems that need it
  get data(): BaseItem {
    return { ...this._data };
  }

  // ===== OSRIC ITEM MECHANICS =====
  // PRESERVE: All OSRIC item rules and calculations

  /**
   * Check if this is a weapon
   * PRESERVE: OSRIC weapon classifications
   */
  isWeapon(): boolean {
    return 'damage' in this._data && 'type' in this._data;
  }

  /**
   * Check if this is a magic item
   * PRESERVE: OSRIC magic item identification
   */
  isMagical(): boolean {
    return this._data.magicBonus !== null && this._data.magicBonus !== 0;
  }

  /**
   * Get weapon damage if this is a weapon
   * PRESERVE: OSRIC weapon damage tables
   */
  getWeaponDamage(): string | null {
    if (!this.isWeapon()) return null;
    return (this._data as Weapon).damage || null;
  }

  /**
   * Get magic bonus for magical items
   * PRESERVE: OSRIC magic item bonus system
   */
  getMagicBonus(): number {
    return this._data.magicBonus || 0;
  }

  /**
   * Calculate item weight for encumbrance
   * PRESERVE: OSRIC encumbrance calculations (weight in coins)
   */
  getTotalWeight(): number {
    return this._data.weight;
  }

  /**
   * Get item value
   * PRESERVE: OSRIC item values and pricing
   */
  getTotalValue(): number {
    return this._data.value;
  }

  /**
   * Convert item value to currency breakdown
   * PRESERVE: OSRIC currency system (1gp = 10sp = 100cp)
   */
  getValueAsCurrency(): Currency {
    const goldValue = this._data.value; // Value is in gold pieces

    const platinum = Math.floor(goldValue / 5); // 1pp = 5gp
    const remainingGold = goldValue % 5;

    return {
      platinum,
      gold: remainingGold,
      electrum: 0,
      silver: 0,
      copper: 0,
    };
  }

  // ===== ITEM USAGE METHODS =====
  // PRESERVE: OSRIC item usage rules

  /**
   * Check if item can be used by a character class
   * PRESERVE: OSRIC class equipment restrictions
   */
  canBeUsedByClass(characterClass: string): boolean {
    if (!this.isWeapon()) return true;

    const weapon = this._data as Weapon;
    return weapon.allowedClasses.some((cls) => cls === characterClass);
  }

  /**
   * Check if item requires proficiency to use effectively
   * PRESERVE: OSRIC weapon proficiency rules
   */
  requiresProficiency(): boolean {
    return this.isWeapon();
  }

  /**
   * Get weapon speed factor if this is a weapon
   * PRESERVE: OSRIC weapon speed factors for initiative
   */
  getWeaponSpeed(): number {
    if (!this.isWeapon()) return 0;
    return (this._data as Weapon).speed || 0;
  }

  /**
   * Check if item has limited uses
   * PRESERVE: OSRIC charged item mechanics
   */
  hasCharges(): boolean {
    return this._data.charges !== null;
  }

  /**
   * Get remaining charges for charged items
   * PRESERVE: OSRIC charged item tracking
   */
  getRemainingCharges(): number {
    return this._data.charges || 0;
  }

  /**
   * Check if item is equipped
   */
  isEquipped(): boolean {
    return this._data.equipped;
  }

  // ===== COMMAND EXECUTION HELPERS =====

  /**
   * Execute a command affecting this item
   */
  async executeCommand(
    _commandType: string,
    _parameters: Record<string, unknown>,
    _context: GameContext
  ): Promise<CommandResult> {
    // This would delegate to the appropriate command
    // The command system handles the actual execution
    throw new Error('Command execution should be handled by the RuleEngine');
  }

  /**
   * Check if item can be used for a specific command
   */
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

  // ===== DATA MODIFICATION =====

  /**
   * Update item data (immutable)
   * Returns a new Item instance with updated data
   */
  update(updates: Partial<BaseItem>): Item {
    return new Item({ ...this._data, ...updates });
  }

  /**
   * Use one charge from a charged item
   * PRESERVE: OSRIC charged item depletion
   */
  useCharge(): Item {
    if (!this.hasCharges()) return this;

    const currentCharges = this.getRemainingCharges();
    if (currentCharges <= 0) return this;

    return this.update({ charges: currentCharges - 1 });
  }

  /**
   * Equip or unequip the item
   */
  setEquipped(equipped: boolean): Item {
    return this.update({ equipped });
  }

  /**
   * Add magic bonus to item
   * PRESERVE: OSRIC magic item enhancement rules
   */
  addMagicBonus(bonus: number): Item {
    const currentBonus = this._data.magicBonus || 0;
    return this.update({ magicBonus: currentBonus + bonus });
  }

  // ===== UTILITY METHODS =====

  /**
   * Check if item is broken or destroyed
   */
  isBroken(): boolean {
    return this.hasCharges() && this.getRemainingCharges() <= 0;
  }

  /**
   * Get item display name with status
   */
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

  /**
   * Create a deep copy of this item
   */
  clone(): Item {
    return new Item(JSON.parse(JSON.stringify(this._data)));
  }
}

/**
 * Item factory functions for creating enhanced Item instances
 */
export const ItemFactory = {
  /**
   * Create an Item from base data
   */
  create(data: BaseItem): Item {
    return new Item(data);
  },

  /**
   * Create an Item from JSON
   */
  fromJSON(json: string): Item {
    const data = JSON.parse(json) as BaseItem;
    return new Item(data);
  },

  /**
   * Create a basic item
   * PRESERVE: OSRIC item creation templates
   */
  createBasicItem(options: {
    name: string;
    weight: number;
    value: number;
    description: string;
    magicBonus?: number;
    charges?: number;
  }): Item {
    const data: BaseItem = {
      id: `item-${Date.now()}`,
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

  /**
   * Validate item data against OSRIC rules
   * PRESERVE: All OSRIC item constraints
   */
  validate(data: BaseItem): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate weight (cannot be negative)
    if (data.weight < 0) {
      errors.push(`Item weight cannot be negative: ${data.weight}`);
    }

    // Validate value (cannot be negative)
    if (data.value < 0) {
      errors.push(`Item value cannot be negative: ${data.value}`);
    }

    // Validate charges (if present, cannot be negative)
    if (data.charges !== null && data.charges < 0) {
      errors.push(`Item charges cannot be negative: ${data.charges}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },
};
