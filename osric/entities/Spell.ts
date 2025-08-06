import type { CommandResult } from '@osric/core/Command';
import type { GameContext } from '@osric/core/GameContext';
import type { Spell as BaseSpell, SavingThrowType, SpellClass } from '@osric/types/entities';

export class Spell {
  private _data: BaseSpell;

  constructor(data: BaseSpell) {
    this._data = { ...data };
  }

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

  get data(): BaseSpell {
    return { ...this._data };
  }

  requiresVerbal(): boolean {
    return this._data.components.includes('V') || this._data.components.includes('Verbal');
  }

  requiresSomatic(): boolean {
    return this._data.components.includes('S') || this._data.components.includes('Somatic');
  }

  requiresMaterial(): boolean {
    return (
      this._data.components.includes('M') ||
      this._data.components.includes('Material') ||
      (this._data.materialComponents !== null && this._data.materialComponents.length > 0)
    );
  }

  getCastingTimeValue(): { value: number; unit: 'segment' | 'round' | 'turn' | 'hour' | 'day' } {
    const castingTime = this._data.castingTime.toLowerCase();

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

    return { value: 1, unit: 'segment' };
  }

  getDurationValue(): { value: number; unit: string; permanent: boolean } {
    const duration = this._data.duration.toLowerCase();

    if (duration.includes('permanent') || duration.includes('instantaneous')) {
      return { value: 0, unit: 'permanent', permanent: true };
    }

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

  getRangeValue(): { value: number; unit: string; touch: boolean; self: boolean } {
    const range = this._data.range.toLowerCase();

    if (range.includes('touch')) {
      return { value: 0, unit: 'touch', touch: true, self: false };
    }
    if (range.includes('self') || range.includes('caster')) {
      return { value: 0, unit: 'self', touch: false, self: true };
    }

    const match = range.match(/(\d+)\s*(\w+)/);
    if (match) {
      let value = Number.parseInt(match[1], 10);
      const unit = match[2];

      if (unit.includes('yard')) {
        value = Math.round(value * 0.9144);
      } else if (unit.includes('mile')) {
        value = Math.round(value * 1609.34);
      } else if (unit.includes('feet') || unit.includes('ft')) {
        value = Math.round(value * 0.3048);
      }

      return { value, unit: 'meters', touch: false, self: false };
    }

    return { value: 9, unit: 'meters', touch: false, self: false };
  }

  allowsSavingThrow(): boolean {
    return this._data.savingThrow !== 'None';
  }

  getSavingThrowType(): SavingThrowType | 'None' {
    return this._data.savingThrow;
  }

  isReversible(): boolean {
    return this._data.reversible;
  }

  canBeCastByClass(characterClass: string): boolean {
    const spellcastingClasses = {
      'Magic-User': [1, 2, 3, 4, 5, 6, 7, 8, 9],
      Cleric: [1, 2, 3, 4, 5, 6, 7],
      Druid: [1, 2, 3, 4, 5, 6, 7],
      Illusionist: [1, 2, 3, 4, 5, 6, 7],
      Ranger: [1, 2, 3],
      Paladin: [1, 2, 3, 4],
    };

    const allowedLevels = spellcastingClasses[characterClass as keyof typeof spellcastingClasses];
    return allowedLevels?.includes(this._data.level) || false;
  }

  canBeCastAtLevel(characterLevel: number, characterClass: string): boolean {
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

  canCastWithComponents(availableComponents: {
    canSpeak: boolean;
    handsAvailable: number;
    hasMaterialComponent: boolean;
  }): boolean {
    if (this.requiresVerbal() && !availableComponents.canSpeak) {
      return false;
    }

    if (this.requiresSomatic() && availableComponents.handsAvailable < 1) {
      return false;
    }

    if (this.requiresMaterial() && !availableComponents.hasMaterialComponent) {
      return false;
    }

    return true;
  }

  calculateDamage(casterLevel: number): { dice: string; bonus: number } | null {
    const description = this._data.description.toLowerCase();

    if (description.includes('damage') || description.includes('hit points')) {
      if (this._data.name.toLowerCase().includes('magic missile')) {
        const missiles = Math.min(5, Math.floor((casterLevel + 1) / 2));
        return { dice: `${missiles}d4`, bonus: missiles };
      }

      if (this._data.name.toLowerCase().includes('fireball')) {
        const dice = Math.min(10, casterLevel);
        return { dice: `${dice}d6`, bonus: 0 };
      }
    }

    return null;
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
      case 'cast-spell':
        return true;
      case 'memorize-spell':
        return true;
      case 'copy-spell':
        return this._data.class === 'Magic-User' || this._data.class === 'Illusionist';
      case 'research-spell':
        return this._data.level >= 1;
      default:
        return false;
    }
  }

  update(updates: Partial<BaseSpell>): Spell {
    return new Spell({ ...this._data, ...updates });
  }

  createReversed(): Spell | null {
    if (!this._data.reversible) return null;

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

  getDisplayInfo(): string {
    const componentStr = this._data.components.join(', ');
    return `${this._data.name} (Level ${this._data.level}, ${this._data.class}, ${componentStr})`;
  }

  clone(): Spell {
    return new Spell(JSON.parse(JSON.stringify(this._data)));
  }
}

export const SpellFactory = {
  create(data: BaseSpell): Spell {
    return new Spell(data);
  },

  fromJSON(json: string): Spell {
    const data = JSON.parse(json) as BaseSpell;
    return new Spell(data);
  },

  validate(data: BaseSpell): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (data.level < 1 || data.level > 9) {
      errors.push(`Spell level ${data.level} is outside OSRIC range (1-9)`);
    }

    if (!data.name.trim()) {
      errors.push('Spell name is required');
    }

    if (!data.description.trim()) {
      errors.push('Spell description is required');
    }

    if (!data.components || data.components.length === 0) {
      errors.push('Spell must have at least one component');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },
};
