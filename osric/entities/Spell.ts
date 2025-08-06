/**
 * Enhanced Spell entity wrapper for OSRIC Rules Engine
 *
 * Wraps the base Spell interface with command-oriented behavior methods
 * while preserving all OSRIC AD&D 1st Edition spell data and mechanics.
 */

import type { CommandResult } from '../core/Command';
import type { GameContext } from '../core/GameContext';
import type { Spell as BaseSpell, SavingThrowType, SpellClass } from '../types/entities';

/**
 * Enhanced Spell entity with command execution capabilities
 *
 * PRESERVATION NOTE: All original Spell data is maintained via composition,
 * with added methods for command-oriented interactions.
 */
export class Spell {
  private _data: BaseSpell;

  constructor(data: BaseSpell) {
    this._data = { ...data };
  }

  // ===== DATA ACCESS =====
  // Preserve all original OSRIC spell data

  get name(): string {
    return this._data.name;
  }
  get level(): number {
    return this._data.level;
  }
  get spellClass(): SpellClass {
    return this._data.class;
  }
  get range(): string {
    return this._data.range;
  }
  get duration(): string {
    return this._data.duration;
  }
  get castingTime(): string {
    return this._data.castingTime;
  }
  get areaOfEffect(): string {
    return this._data.areaOfEffect;
  }
  get savingThrow(): SavingThrowType | 'None' {
    return this._data.savingThrow;
  }
  get components(): string[] {
    return this._data.components;
  }
  get description(): string {
    return this._data.description;
  }
  get materialComponents(): string[] | null {
    return this._data.materialComponents;
  }
  get reversible(): boolean {
    return this._data.reversible;
  }

  // Get raw data for systems that need it
  get data(): BaseSpell {
    return { ...this._data };
  }

  // ===== OSRIC SPELL MECHANICS =====
  // PRESERVE: All OSRIC spell casting rules and mechanics

  /**
   * Check if spell requires verbal components
   * PRESERVE: OSRIC component requirements
   */
  requiresVerbal(): boolean {
    return this._data.components.includes('V') || this._data.components.includes('Verbal');
  }

  /**
   * Check if spell requires somatic components
   * PRESERVE: OSRIC component requirements
   */
  requiresSomatic(): boolean {
    return this._data.components.includes('S') || this._data.components.includes('Somatic');
  }

  /**
   * Check if spell requires material components
   * PRESERVE: OSRIC component requirements
   */
  requiresMaterial(): boolean {
    return (
      this._data.components.includes('M') ||
      this._data.components.includes('Material') ||
      (this._data.materialComponents !== null && this._data.materialComponents.length > 0)
    );
  }

  /**
   * Get casting time in segments/rounds
   * PRESERVE: OSRIC casting time interpretations
   */
  getCastingTimeValue(): { value: number; unit: 'segment' | 'round' | 'turn' | 'hour' | 'day' } {
    const castingTime = this._data.castingTime.toLowerCase();

    // Parse OSRIC casting time formats
    if (castingTime.includes('segment')) {
      const segments = Number.parseInt(castingTime.match(/(\d+)/)?.[1] || '1', 10);
      return { value: segments, unit: 'segment' };
    }
    if (castingTime.includes('round')) {
      const rounds = Number.parseInt(castingTime.match(/(\d+)/)?.[1] || '1', 10);
      return { value: rounds, unit: 'round' };
    }
    if (castingTime.includes('turn')) {
      const turns = Number.parseInt(castingTime.match(/(\d+)/)?.[1] || '1', 10);
      return { value: turns, unit: 'turn' };
    }
    if (castingTime.includes('hour')) {
      const hours = Number.parseInt(castingTime.match(/(\d+)/)?.[1] || '1', 10);
      return { value: hours, unit: 'hour' };
    }
    if (castingTime.includes('day')) {
      const days = Number.parseInt(castingTime.match(/(\d+)/)?.[1] || '1', 10);
      return { value: days, unit: 'day' };
    }

    // Default to 1 segment
    return { value: 1, unit: 'segment' };
  }

  /**
   * Get spell duration in appropriate time units
   * PRESERVE: OSRIC duration calculations
   */
  getDurationValue(): { value: number; unit: string; permanent: boolean } {
    const duration = this._data.duration.toLowerCase();

    if (duration.includes('permanent') || duration.includes('instantaneous')) {
      return { value: 0, unit: 'permanent', permanent: true };
    }

    // Parse common OSRIC duration formats
    const match = duration.match(/(\d+)\s*(\w+)/);
    if (match) {
      return {
        value: Number.parseInt(match[1], 10),
        unit: match[2],
        permanent: false,
      };
    }

    return { value: 1, unit: 'round', permanent: false };
  }

  /**
   * Get spell range in meters
   * PRESERVE: OSRIC range measurements (converted to metric)
   */
  getRangeValue(): { value: number; unit: string; touch: boolean; self: boolean } {
    const range = this._data.range.toLowerCase();

    if (range.includes('touch')) {
      return { value: 0, unit: 'touch', touch: true, self: false };
    }
    if (range.includes('self') || range.includes('caster')) {
      return { value: 0, unit: 'self', touch: false, self: true };
    }

    // Parse distance ranges
    const match = range.match(/(\d+)\s*(\w+)/);
    if (match) {
      let value = Number.parseInt(match[1], 10);
      const unit = match[2];

      // Convert to meters if needed
      if (unit.includes('yard')) {
        value = Math.round(value * 0.9144); // yards to meters
      } else if (unit.includes('mile')) {
        value = Math.round(value * 1609.34); // miles to meters
      } else if (unit.includes('feet') || unit.includes('ft')) {
        value = Math.round(value * 0.3048); // feet to meters
      }

      return { value, unit: 'meters', touch: false, self: false };
    }

    return { value: 9, unit: 'meters', touch: false, self: false }; // converted from 30 feet
  }

  /**
   * Check if spell allows a saving throw
   * PRESERVE: OSRIC saving throw mechanics
   */
  allowsSavingThrow(): boolean {
    return this._data.savingThrow !== 'None';
  }

  /**
   * Get saving throw type required
   * PRESERVE: OSRIC saving throw categories
   */
  getSavingThrowType(): SavingThrowType | 'None' {
    return this._data.savingThrow;
  }

  /**
   * Check if spell can be reversed
   * PRESERVE: OSRIC reversible spell mechanics
   */
  isReversible(): boolean {
    return this._data.reversible;
  }

  // ===== SPELL CASTING VALIDATION =====
  // PRESERVE: OSRIC spell casting requirements

  /**
   * Check if character can cast this spell
   * PRESERVE: OSRIC spell casting class restrictions
   */
  canBeCastByClass(characterClass: string): boolean {
    // OSRIC spell class restrictions
    const spellcastingClasses = {
      'Magic-User': [1, 2, 3, 4, 5, 6, 7, 8, 9],
      Cleric: [1, 2, 3, 4, 5, 6, 7],
      Druid: [1, 2, 3, 4, 5, 6, 7],
      Illusionist: [1, 2, 3, 4, 5, 6, 7],
      Ranger: [1, 2, 3], // Limited spell casting
      Paladin: [1, 2, 3, 4], // Limited spell casting
    };

    const allowedLevels = spellcastingClasses[characterClass as keyof typeof spellcastingClasses];
    return allowedLevels?.includes(this._data.level) || false;
  }

  /**
   * Check if character has required level to cast spell
   * PRESERVE: OSRIC spell level requirements
   */
  canBeCastAtLevel(characterLevel: number, characterClass: string): boolean {
    // OSRIC minimum levels for spell access
    const minimumLevels: Record<string, Record<number, number>> = {
      'Magic-User': { 1: 1, 2: 3, 3: 5, 4: 7, 5: 9, 6: 11, 7: 13, 8: 15, 9: 17 },
      Cleric: { 1: 1, 2: 3, 3: 5, 4: 7, 5: 9, 6: 11, 7: 13 },
      Druid: { 1: 2, 2: 3, 3: 5, 4: 7, 5: 9, 6: 11, 7: 13 },
      Illusionist: { 1: 1, 2: 3, 3: 5, 4: 7, 5: 9, 6: 11, 7: 13 },
      Ranger: { 1: 8, 2: 9, 3: 10 },
      Paladin: { 1: 9, 2: 11, 3: 13, 4: 15 },
    };

    const classLevels = minimumLevels[characterClass];
    if (!classLevels) return false;

    const requiredLevel = classLevels[this._data.level];
    return requiredLevel !== undefined && characterLevel >= requiredLevel;
  }

  /**
   * Check if all components are available
   * PRESERVE: OSRIC component availability rules
   */
  canCastWithComponents(availableComponents: {
    canSpeak: boolean;
    handsAvailable: number;
    hasMaterialComponent: boolean;
  }): boolean {
    // Check verbal components
    if (this.requiresVerbal() && !availableComponents.canSpeak) {
      return false;
    }

    // Check somatic components
    if (this.requiresSomatic() && availableComponents.handsAvailable < 1) {
      return false;
    }

    // Check material components
    if (this.requiresMaterial() && !availableComponents.hasMaterialComponent) {
      return false;
    }

    return true;
  }

  // ===== SPELL EFFECTS =====
  // PRESERVE: OSRIC spell effect mechanics

  /**
   * Calculate spell damage (if applicable)
   * PRESERVE: OSRIC damage spell formulas
   */
  calculateDamage(casterLevel: number): { dice: string; bonus: number } | null {
    // This would parse the spell description for damage formulas
    // Common OSRIC patterns: "1d4+1 per level", "1d6 per level (max 10d6)", etc.

    const description = this._data.description.toLowerCase();

    // Simple damage spell detection (would need expansion)
    if (description.includes('damage') || description.includes('hit points')) {
      // Magic Missile: 1d4+1 per missile
      if (this._data.name.toLowerCase().includes('magic missile')) {
        const missiles = Math.min(5, Math.floor((casterLevel + 1) / 2));
        return { dice: `${missiles}d4`, bonus: missiles };
      }

      // Fireball: 1d6 per level (max 10d6)
      if (this._data.name.toLowerCase().includes('fireball')) {
        const dice = Math.min(10, casterLevel);
        return { dice: `${dice}d6`, bonus: 0 };
      }
    }

    return null;
  }

  // ===== COMMAND EXECUTION HELPERS =====

  /**
   * Execute a command affecting this spell
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
   * Check if spell can be used for a specific command
   */
  canExecuteCommand(commandType: string, _parameters: Record<string, unknown>): boolean {
    switch (commandType) {
      case 'cast-spell':
        return true; // All spells can be cast
      case 'memorize-spell':
        return true; // All spells can be memorized
      case 'copy-spell':
        return this._data.class === 'Magic-User' || this._data.class === 'Illusionist'; // Only arcane spells can be copied
      case 'research-spell':
        return this._data.level >= 1; // Can research variations
      default:
        return false;
    }
  }

  // ===== DATA MODIFICATION =====

  /**
   * Update spell data (immutable)
   * Returns a new Spell instance with updated data
   */
  update(updates: Partial<BaseSpell>): Spell {
    return new Spell({ ...this._data, ...updates });
  }

  /**
   * Create reversed version of spell (if reversible)
   * PRESERVE: OSRIC reversible spell mechanics
   */
  createReversed(): Spell | null {
    if (!this._data.reversible) return null;

    // Generate reversed name (common OSRIC pattern)
    const reversedName = this._data.name.startsWith('Cure')
      ? this._data.name.replace('Cure', 'Cause')
      : this._data.name.startsWith('Bless')
        ? this._data.name.replace('Bless', 'Curse')
        : `Reverse ${this._data.name}`;

    return this.update({
      name: reversedName,
      description: `Reversed version of ${this._data.name}. ${this._data.description}`,
    });
  }

  // ===== UTILITY METHODS =====

  /**
   * Get spell display information
   */
  getDisplayInfo(): string {
    const componentStr = this._data.components.join(', ');
    return `${this._data.name} (Level ${this._data.level}, ${this._data.class}, ${componentStr})`;
  }

  /**
   * Create a deep copy of this spell
   */
  clone(): Spell {
    return new Spell(JSON.parse(JSON.stringify(this._data)));
  }
}

/**
 * Spell factory functions for creating enhanced Spell instances
 */
export const SpellFactory = {
  /**
   * Create a Spell from base data
   */
  create(data: BaseSpell): Spell {
    return new Spell(data);
  },

  /**
   * Create a Spell from JSON
   */
  fromJSON(json: string): Spell {
    const data = JSON.parse(json) as BaseSpell;
    return new Spell(data);
  },

  /**
   * Validate spell data against OSRIC rules
   * PRESERVE: All OSRIC spell constraints
   */
  validate(data: BaseSpell): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate spell level (OSRIC 1-9 for arcane, 1-7 for divine)
    if (data.level < 1 || data.level > 9) {
      errors.push(`Spell level ${data.level} is outside OSRIC range (1-9)`);
    }

    // Validate required fields
    if (!data.name.trim()) {
      errors.push('Spell name is required');
    }

    if (!data.description.trim()) {
      errors.push('Spell description is required');
    }

    // Validate components
    if (!data.components || data.components.length === 0) {
      errors.push('Spell must have at least one component');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },
};
