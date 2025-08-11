import type { MonsterId } from '@osric/types';
import { createMonsterId } from '@osric/types';
import type { CommandResult } from '../core/Command';
import type { GameContext } from '../core/GameContext';
import type { Monster as BaseMonster, CreatureSize, MonsterFrequency } from '../types/entities';

export class Monster {
  private _data: BaseMonster;

  constructor(data: BaseMonster) {
    this._data = { ...data };
  }

  get id(): MonsterId {
    return this._data.id as MonsterId;
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

  get data(): BaseMonster {
    return { ...this._data };
  }

  getHitDiceValue(): { dice: number; bonus: number; sides: number } {
    const hitDice = this._data.hitDice;

    const match = hitDice.match(/^(\d+)([+-]\d+)?$/);
    if (!match) {
      return { dice: 1, bonus: 0, sides: 8 };
    }

    const dice = Number.parseInt(match[1], 10);
    const bonus = match[2] ? Number.parseInt(match[2], 10) : 0;

    return { dice, bonus, sides: 8 };
  }

  getAverageHitPoints(): number {
    const { dice, bonus, sides } = this.getHitDiceValue();
    const averagePerDie = (sides + 1) / 2;
    return Math.floor(dice * averagePerDie + bonus);
  }

  calculateThac0(): number {
    const { dice } = this.getHitDiceValue();

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

    return 3;
  }

  canPerformAction(actionType: 'attack' | 'move' | 'special-ability'): boolean {
    if (this._data.hitPoints.current <= 0) return false;

    if (actionType === 'attack' && this.shouldCheckMorale()) {
      return this._data.morale >= 7;
    }

    return true;
  }

  shouldCheckMorale(): boolean {
    const currentHp = this._data.hitPoints.current;
    const maxHp = this._data.hitPoints.maximum;

    return currentHp <= maxHp / 2;
  }

  getExperienceValue(): number {
    const { dice, bonus } = this.getHitDiceValue();
    const totalHitDice = dice + (bonus > 0 ? 1 : 0);

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

    return baseXp;
  }

  getAttacksPerRound(): number {
    return this._data.damagePerAttack.length;
  }

  getDamageForAttack(attackIndex: number): string {
    if (attackIndex < 0 || attackIndex >= this._data.damagePerAttack.length) {
      return '1d4';
    }
    return this._data.damagePerAttack[attackIndex];
  }

  getAttackBonus(): number {
    const { dice } = this.getHitDiceValue();

    if (dice >= 15) return 3;
    if (dice >= 9) return 2;
    if (dice >= 7) return 1;
    return 0;
  }

  hasTreasure(): boolean {
    return this._data.treasure !== '' && this._data.treasure !== 'Nil';
  }

  getTreasureType(): string {
    return this._data.treasure;
  }

  generateTreasure(): { coins: Record<string, number>; items: string[] } {
    return {
      coins: { copper: 0, silver: 0, gold: 0, platinum: 0 },
      items: [],
    };
  }

  isAlive(): boolean {
    return this._data.hitPoints.current > 0;
  }

  isIncapacitated(): boolean {
    return this._data.hitPoints.current <= 0;
  }

  hasStatusEffect(effectName: string): boolean {
    return this._data.statusEffects.some((effect) => effect.name === effectName);
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
        return this.canPerformAction('attack');
      case 'move':
        return this.canPerformAction('move');
      case 'use-special-ability':
        return this.canPerformAction('special-ability');
      default:
        return true;
    }
  }

  update(updates: Partial<BaseMonster>): Monster {
    return new Monster({ ...this._data, ...updates });
  }

  takeDamage(amount: number): Monster {
    const newHitPoints = Math.max(0, this._data.hitPoints.current - amount);
    return this.update({
      hitPoints: {
        current: newHitPoints,
        maximum: this._data.hitPoints.maximum,
      },
    });
  }

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

  addStatusEffect(effect: BaseMonster['statusEffects'][0]): Monster {
    return this.update({
      statusEffects: [...this._data.statusEffects, effect],
    });
  }

  removeStatusEffect(effectName: string): Monster {
    return this.update({
      statusEffects: this._data.statusEffects.filter((effect) => effect.name !== effectName),
    });
  }
}

export const MonsterFactory = {
  create(data: BaseMonster): Monster {
    return new Monster(data);
  },

  fromJSON(json: string): Monster {
    const data = JSON.parse(json) as BaseMonster;
    return new Monster(data);
  },

  fromStatBlock(statBlock: {
    name: string;
    hitDice: string;
    armorClass: number;
    damage: string[];
    morale: number;
    treasure: string;
    alignment: string;
  }): Monster {
    const data: BaseMonster = {
      id: createMonsterId(`monster-${Date.now()}`),
      name: statBlock.name,
      level: Number.parseInt(statBlock.hitDice.split(/[+-]/)[0], 10),
      hitPoints: { current: 1, maximum: 1 },
      armorClass: statBlock.armorClass,
      thac0: 20,
      experience: { current: 0, requiredForNextLevel: 0, level: 1 },
      alignment: statBlock.alignment as BaseMonster['alignment'],
      inventory: [],
      position: '',
      statusEffects: [],
      hitDice: statBlock.hitDice,
      damagePerAttack: statBlock.damage,
      morale: statBlock.morale,
      treasure: statBlock.treasure,

      specialAbilities: [],
      xpValue: 0,
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

  validate(data: BaseMonster): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.hitDice.match(/^\d+([+-]\d+)?$/)) {
      errors.push(`Invalid hit dice format: ${data.hitDice}`);
    }

    if (data.armorClass < -10 || data.armorClass > 10) {
      errors.push(`Armor class ${data.armorClass} is outside OSRIC range (-10 to 10)`);
    }

    if (data.morale < 2 || data.morale > 12) {
      errors.push(`Morale ${data.morale} is outside OSRIC range (2-12)`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },
};
