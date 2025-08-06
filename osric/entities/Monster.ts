/**
 * Enhanced Monster entity wrapper for OSRIC Rules Engine
 *
 * Wraps the base Monster interface with command-oriented behavior methods
 * while preserving all OSRIC AD&D 1st Edition monster data and mechanics.
 */

import type { CommandResult } from '../core/Command';
import type { GameContext } from '../core/GameContext';
import type { Monster as BaseMonster, CreatureSize, MonsterFrequency } from '../types/entities';

/**
 * Enhanced Monster entity with command execution capabilities
 *
 * PRESERVATION NOTE: All original Monster data is maintained via composition,
 * with added methods for command-oriented interactions.
 */
export class Monster {
  private _data: BaseMonster;

  constructor(data: BaseMonster) {
    this._data = { ...data };
  }

  // ===== DATA ACCESS =====
  // Preserve all original OSRIC monster data

  get id(): string {
    return this._data.id;
  }
  get name(): string {
    return this._data.name;
  }
  get level(): number {
    return this._data.level;
  }
  get hitPoints(): number {
    return this._data.hitPoints.current;
  }
  get maxHitPoints(): number {
    return this._data.hitPoints.maximum;
  }
  get armorClass(): number {
    return this._data.armorClass;
  }
  get thac0(): number {
    return this._data.thac0;
  }
  get hitDice(): string {
    return this._data.hitDice;
  }
  get damagePerAttack(): string[] {
    return this._data.damagePerAttack;
  }
  get morale(): number {
    return this._data.morale;
  }
  get treasure(): string {
    return this._data.treasure;
  }
  get alignment(): BaseMonster['alignment'] {
    return this._data.alignment;
  }
  get inventory(): BaseMonster['inventory'] {
    return this._data.inventory;
  }
  get position(): string {
    return this._data.position;
  }
  get statusEffects(): BaseMonster['statusEffects'] {
    return this._data.statusEffects;
  }

  // Get raw data for systems that need it
  get data(): BaseMonster {
    return { ...this._data };
  }

  // ===== OSRIC MONSTER MECHANICS =====
  // PRESERVE: All OSRIC monster stat calculations and behaviors

  /**
   * Calculate monster's hit dice as numerical value
   * PRESERVE: OSRIC hit dice parsing (e.g., "3+1" = 3d8+1)
   */
  getHitDiceValue(): { dice: number; bonus: number; sides: number } {
    const hitDice = this._data.hitDice;

    // Parse OSRIC hit dice format: "3+1", "2-1", "1+2", etc.
    const match = hitDice.match(/^(\d+)([+-]\d+)?$/);
    if (!match) {
      // Fallback for complex formats
      return { dice: 1, bonus: 0, sides: 8 };
    }

    const dice = Number.parseInt(match[1], 10);
    const bonus = match[2] ? Number.parseInt(match[2], 10) : 0;

    // OSRIC monsters use d8 for hit dice unless specified otherwise
    return { dice, bonus, sides: 8 };
  }

  /**
   * Calculate average hit points for this monster type
   * PRESERVE: OSRIC monster hit point calculations
   */
  getAverageHitPoints(): number {
    const { dice, bonus, sides } = this.getHitDiceValue();
    const averagePerDie = (sides + 1) / 2;
    return Math.floor(dice * averagePerDie + bonus);
  }

  /**
   * Get monster's THAC0 based on hit dice
   * PRESERVE: OSRIC monster THAC0 progression tables
   */
  calculateThac0(): number {
    const { dice } = this.getHitDiceValue();

    // OSRIC monster THAC0 progression (preserved exactly)
    if (dice <= 1) return 19;
    if (dice <= 2) return 18;
    if (dice <= 3) return 17;
    if (dice <= 4) return 16;
    if (dice <= 5) return 15;
    if (dice <= 6) return 14;
    if (dice <= 7) return 13;
    if (dice <= 8) return 12;
    if (dice <= 9) return 11;
    if (dice <= 10) return 10;
    if (dice <= 11) return 9;
    if (dice <= 12) return 8;
    if (dice <= 13) return 7;
    if (dice <= 14) return 6;
    if (dice <= 15) return 5;
    if (dice <= 16) return 4;
    // 17+ HD monsters have THAC0 3
    return 3;
  }

  /**
   * Check if monster can perform a specific action
   * PRESERVE: OSRIC monster behavior restrictions
   */
  canPerformAction(actionType: 'attack' | 'move' | 'special-ability'): boolean {
    // Basic checks
    if (this._data.hitPoints.current <= 0) return false;

    // Morale checks for fleeing (PRESERVE: OSRIC morale rules)
    if (actionType === 'attack' && this.shouldCheckMorale()) {
      return this._data.morale >= 7; // Simplified morale check
    }

    return true;
  }

  /**
   * Check if monster should make a morale check
   * PRESERVE: OSRIC morale check triggers
   */
  shouldCheckMorale(): boolean {
    const currentHp = this._data.hitPoints.current;
    const maxHp = this._data.hitPoints.maximum;

    // OSRIC morale check triggers (preserved)
    return currentHp <= maxHp / 2; // Check when at half hit points or less
  }

  /**
   * Calculate monster's experience point value
   * PRESERVE: OSRIC monster XP tables
   */
  getExperienceValue(): number {
    const { dice, bonus } = this.getHitDiceValue();
    const totalHitDice = dice + (bonus > 0 ? 1 : 0);

    // OSRIC base XP values by hit dice (preserved exactly)
    const baseXpByHd: Record<number, number> = {
      1: 15,
      2: 20,
      3: 35,
      4: 75,
      5: 175,
      6: 275,
      7: 450,
      8: 650,
      9: 900,
      10: 1100,
      11: 1350,
      12: 1550,
      13: 1750,
      14: 1950,
      15: 2250,
      16: 2700,
      17: 3250,
      18: 3750,
      19: 4500,
      20: 5250,
    };

    const baseXp = baseXpByHd[Math.min(totalHitDice, 20)] || 6000;

    // Add bonuses for special abilities
    // This would need to be expanded based on monster special abilities

    return baseXp;
  }

  // ===== COMBAT METHODS =====
  // PRESERVE: All OSRIC combat mechanics

  /**
   * Get number of attacks per round
   * PRESERVE: OSRIC monster attack patterns
   */
  getAttacksPerRound(): number {
    return this._data.damagePerAttack.length;
  }

  /**
   * Get damage for a specific attack
   * PRESERVE: OSRIC damage patterns and dice
   */
  getDamageForAttack(attackIndex: number): string {
    if (attackIndex < 0 || attackIndex >= this._data.damagePerAttack.length) {
      return '1d4'; // Default minimal damage
    }
    return this._data.damagePerAttack[attackIndex];
  }

  /**
   * Calculate attack bonus for monster
   * PRESERVE: OSRIC monster attack progressions
   */
  getAttackBonus(): number {
    // Most monsters attack as their hit dice level
    const { dice } = this.getHitDiceValue();

    // OSRIC fighter attack progression applied to monsters
    if (dice >= 15) return 3;
    if (dice >= 9) return 2;
    if (dice >= 7) return 1;
    return 0;
  }

  // ===== TREASURE METHODS =====
  // PRESERVE: OSRIC treasure type system

  /**
   * Check if monster has treasure
   * PRESERVE: OSRIC treasure type interpretations
   */
  hasTreasure(): boolean {
    return this._data.treasure !== '' && this._data.treasure !== 'Nil';
  }

  /**
   * Get treasure type information
   * PRESERVE: OSRIC treasure type system (A, B, C, etc.)
   */
  getTreasureType(): string {
    return this._data.treasure;
  }

  /**
   * Calculate treasure value (would need full treasure tables)
   * PRESERVE: OSRIC treasure generation tables
   */
  generateTreasure(): { coins: Record<string, number>; items: string[] } {
    // This would implement the full OSRIC treasure generation system
    // For now, return empty treasure
    return {
      coins: { copper: 0, silver: 0, gold: 0, platinum: 0 },
      items: [],
    };
  }

  // ===== STATUS AND CONDITION METHODS =====

  /**
   * Check if monster is alive
   */
  isAlive(): boolean {
    return this._data.hitPoints.current > 0;
  }

  /**
   * Check if monster is unconscious or dying
   * PRESERVE: OSRIC death and dying rules
   */
  isIncapacitated(): boolean {
    return this._data.hitPoints.current <= 0;
  }

  /**
   * Check if monster has a specific status effect
   */
  hasStatusEffect(effectName: string): boolean {
    return this._data.statusEffects.some((effect) => effect.name === effectName);
  }

  // ===== COMMAND EXECUTION HELPERS =====

  /**
   * Execute a command affecting this monster
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
   * Check if monster can execute a specific command
   */
  canExecuteCommand(commandType: string, _parameters: Record<string, unknown>): boolean {
    switch (commandType) {
      case 'attack':
        return this.canPerformAction('attack');
      case 'move':
        return this.canPerformAction('move');
      case 'use-special-ability':
        return this.canPerformAction('special-ability');
      default:
        return true;
    }
  }

  // ===== DATA MODIFICATION =====

  /**
   * Update monster data (immutable)
   * Returns a new Monster instance with updated data
   */
  update(updates: Partial<BaseMonster>): Monster {
    return new Monster({ ...this._data, ...updates });
  }

  /**
   * Apply damage to monster
   * PRESERVE: OSRIC damage and death rules
   */
  takeDamage(amount: number): Monster {
    const newHitPoints = Math.max(0, this._data.hitPoints.current - amount);
    return this.update({
      hitPoints: {
        current: newHitPoints,
        maximum: this._data.hitPoints.maximum,
      },
    });
  }

  /**
   * Heal monster
   * PRESERVE: OSRIC healing limits
   */
  heal(amount: number): Monster {
    const newHitPoints = Math.min(
      this._data.hitPoints.maximum,
      this._data.hitPoints.current + amount
    );
    return this.update({
      hitPoints: {
        current: newHitPoints,
        maximum: this._data.hitPoints.maximum,
      },
    });
  }

  /**
   * Add status effect to monster
   */
  addStatusEffect(effect: BaseMonster['statusEffects'][0]): Monster {
    return this.update({
      statusEffects: [...this._data.statusEffects, effect],
    });
  }

  /**
   * Remove status effect from monster
   */
  removeStatusEffect(effectName: string): Monster {
    return this.update({
      statusEffects: this._data.statusEffects.filter((effect) => effect.name !== effectName),
    });
  }
}

/**
 * Monster factory functions for creating enhanced Monster instances
 */
export const MonsterFactory = {
  /**
   * Create a Monster from base data
   */
  create(data: BaseMonster): Monster {
    return new Monster(data);
  },

  /**
   * Create a Monster from JSON
   */
  fromJSON(json: string): Monster {
    const data = JSON.parse(json) as BaseMonster;
    return new Monster(data);
  },

  /**
   * Create a monster from OSRIC stat block
   * PRESERVE: OSRIC monster stat block format
   */
  fromStatBlock(statBlock: {
    name: string;
    hitDice: string;
    armorClass: number;
    damage: string[];
    morale: number;
    treasure: string;
    alignment: string;
  }): Monster {
    // Generate a basic monster from stat block
    // This would be expanded to handle full OSRIC monster creation
    const data: BaseMonster = {
      id: `monster-${Date.now()}`,
      name: statBlock.name,
      level: Number.parseInt(statBlock.hitDice.split(/[+-]/)[0], 10),
      hitPoints: { current: 1, maximum: 1 }, // Would calculate from hit dice
      armorClass: statBlock.armorClass,
      thac0: 20, // Would calculate from hit dice
      experience: { current: 0, requiredForNextLevel: 0, level: 1 },
      alignment: statBlock.alignment as BaseMonster['alignment'],
      inventory: [],
      position: '',
      statusEffects: [],
      hitDice: statBlock.hitDice,
      damagePerAttack: statBlock.damage,
      morale: statBlock.morale,
      treasure: statBlock.treasure,
      // Add other required monster fields with defaults
      specialAbilities: [],
      xpValue: 0, // Would calculate from hit dice
      frequency: 'Common' as MonsterFrequency,
      size: 'Medium' as CreatureSize,
      movementTypes: [{ type: 'Walk', rate: 120 }],
      habitat: ['Any'],
      organization: 'Solitary',
      diet: 'Omnivore',
      ecology: 'Standard',
    };

    return new Monster(data);
  },

  /**
   * Validate monster data against OSRIC rules
   * PRESERVE: All OSRIC monster constraints
   */
  validate(data: BaseMonster): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate hit dice format
    if (!data.hitDice.match(/^\d+([+-]\d+)?$/)) {
      errors.push(`Invalid hit dice format: ${data.hitDice}`);
    }

    // Validate armor class (OSRIC uses descending AC)
    if (data.armorClass < -10 || data.armorClass > 10) {
      errors.push(`Armor class ${data.armorClass} is outside OSRIC range (-10 to 10)`);
    }

    // Validate morale (OSRIC 2-12 range)
    if (data.morale < 2 || data.morale > 12) {
      errors.push(`Morale ${data.morale} is outside OSRIC range (2-12)`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },
};
