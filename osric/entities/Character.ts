import type { CommandResult } from '@osric/core/Command';
import type { GameContext } from '@osric/core/GameContext';
import type { CharacterId } from '@osric/types';
import type {
  Alignment,
  Character as BaseCharacter,
  CharacterClass,
  CharacterRace,
} from '@osric/types/entities';

export class Character {
  private _data: BaseCharacter;

  constructor(data: BaseCharacter) {
    this._data = { ...data };
  }

  get id(): CharacterId {
    return this._data.id as CharacterId;
  }
  get name(): string {
    return this._data.name;
  }
  get race(): CharacterRace {
    return this._data.race;
  }
  get alignment(): Alignment {
    return this._data.alignment;
  }
  get characterClass(): CharacterClass {
    return this._data.class;
  }
  get level(): number {
    return this._data.level;
  }
  get experiencePoints(): number {
    return this._data.experience.current;
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
  get abilities(): BaseCharacter['abilities'] {
    return this._data.abilities;
  }
  get savingThrows(): BaseCharacter['savingThrows'] {
    return this._data.savingThrows;
  }
  get spells(): BaseCharacter['spells'] {
    return this._data.spells;
  }
  get inventory(): BaseCharacter['inventory'] {
    return this._data.inventory;
  }
  get currency(): BaseCharacter['currency'] {
    return this._data.currency;
  }

  get data(): BaseCharacter {
    return { ...this._data };
  }

  getAbilityModifier(ability: keyof BaseCharacter['abilities']): number {
    const score = this._data.abilities[ability];

    if (score <= 3) return -3;
    if (score <= 5) return -2;
    if (score <= 8) return -1;
    if (score <= 12) return 0;
    if (score <= 15) return +1;
    if (score <= 17) return +2;
    if (score === 18) return +3;
    if (score >= 19) return +4;

    return 0;
  }

  meetsAbilityRequirement(ability: keyof BaseCharacter['abilities'], minimum: number): boolean {
    return this._data.abilities[ability] >= minimum;
  }

  getExceptionalStrengthBonus(): { hit: number; damage: number } {
    const strength = this._data.abilities.strength;
    if (strength !== 18) return { hit: 0, damage: 0 };

    return { hit: 3, damage: 6 };
  }

  canPerformCombatAction(actionType: 'attack' | 'cast-spell' | 'use-item' | 'move'): boolean {
    if (this._data.hitPoints.current <= 0) return false;
    if (actionType === 'cast-spell' && !this.hasSpellsAvailable()) return false;

    return true;
  }

  getAttackBonus(_weaponType?: string): number {
    let bonus = 0;

    bonus += this.getAbilityModifier('strength');

    return bonus;
  }

  getDamageBonus(weaponType?: string): number {
    let bonus = 0;

    const strBonus = this.getAbilityModifier('strength');
    if (weaponType === 'melee') {
      bonus += strBonus;
    }

    return bonus;
  }

  getThac0(): number {
    return this._data.thac0;
  }

  canCastSpells(): boolean {
    const spellCastingClasses: CharacterClass[] = [
      'Magic-User',
      'Cleric',
      'Druid',
      'Illusionist',
      'Ranger',
      'Paladin',
    ];
    return spellCastingClasses.includes(this._data.class);
  }

  hasSpellsAvailable(level?: number): boolean {
    if (!this.canCastSpells()) return false;

    if (level) {
      return (this._data.spellSlots[level as keyof typeof this._data.spellSlots] || 0) > 0;
    }

    return Object.values(this._data.spellSlots).some((count: unknown) => (count as number) > 0);
  }

  getMaxSpellsPerDay(spellLevel: number): number {
    return this._data.spellSlots[spellLevel as keyof typeof this._data.spellSlots] || 0;
  }

  knowsSpell(spellName: string): boolean {
    return this._data.spellbook?.some((spell) => spell.name === spellName) || false;
  }

  getThiefSkillChance(skill: keyof import('../types/entities').ThiefSkills): number {
    if (!this._data.thiefSkills) return 0;

    const baseChance = this._data.thiefSkills[skill] || 0;

    let racialModifier = 0;
    if (this._data.race === 'Halfling' && skill === 'hideInShadows') {
      racialModifier += 15;
    }

    let dexModifier = 0;
    const dexSkills: (keyof import('../types/entities').ThiefSkills)[] = [
      'pickPockets',
      'openLocks',
      'removeTraps',
    ];
    if (dexSkills.includes(skill)) {
      dexModifier = this.getAbilityModifier('dexterity') * 5;
    }

    return Math.min(95, baseChance + racialModifier + dexModifier);
  }

  canUseThiefSkill(skill: keyof import('../types/entities').ThiefSkills): boolean {
    return (
      this._data.class === 'Thief' ||
      this._data.class === 'Assassin' ||
      (this._data.class === 'Fighter' && ['pickPockets', 'climbWalls'].includes(skill))
    );
  }

  getSavingThrow(saveType: string): number {
    const saveKey = saveType as keyof BaseCharacter['savingThrows'];
    let baseValue = this._data.savingThrows[saveKey] || 20;

    if (saveType === 'Poison or Death') {
      baseValue += this.getAbilityModifier('constitution');
    }
    if (saveType === 'Wands' || saveType === 'Spells, Rods, or Staves') {
      baseValue += this.getAbilityModifier('wisdom');
    }

    if (
      this._data.race === 'Dwarf' &&
      ['Poison or Death', 'Wands', 'Spells, Rods, or Staves'].includes(saveType)
    ) {
      baseValue += 4;
    }

    return baseValue;
  }

  canUseEquipment(equipmentType: string): boolean {
    if (this._data.class === 'Magic-User' && equipmentType.includes('armor')) {
      return false;
    }

    return true;
  }

  getClassBonus(_bonusType: string): number {
    return 0;
  }

  async executeCommand(
    _commandType: string,
    _parameters: Record<string, unknown>,
    _context: GameContext
  ): Promise<CommandResult> {
    throw new Error('Command execution should be handled by the RuleEngine');
  }

  canExecuteCommand(commandType: string, parameters: Record<string, unknown>): boolean {
    switch (commandType) {
      case 'attack':
        return this.canPerformCombatAction('attack');
      case 'cast-spell':
        return this.canPerformCombatAction('cast-spell');
      case 'use-thief-skill': {
        const skill = parameters.skill as keyof import('../types/entities').ThiefSkills;
        return this.canUseThiefSkill(skill);
      }
      default:
        return true;
    }
  }

  update(updates: Partial<BaseCharacter>): Character {
    return new Character({ ...this._data, ...updates });
  }

  takeDamage(amount: number): Character {
    const newHitPoints = Math.max(0, this._data.hitPoints.current - amount);
    return this.update({
      hitPoints: {
        current: newHitPoints,
        maximum: this._data.hitPoints.maximum,
      },
    });
  }

  heal(amount: number): Character {
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

  levelUp(newLevel: number, hitPointGain: number): Character {
    return this.update({
      level: newLevel,
      hitPoints: {
        current: this._data.hitPoints.current + hitPointGain,
        maximum: this._data.hitPoints.maximum + hitPointGain,
      },
    });
  }
}

export const CharacterFactory = {
  create(data: BaseCharacter): Character {
    return new Character(data);
  },

  fromJSON(json: string): Character {
    const data = JSON.parse(json) as BaseCharacter;
    return new Character(data);
  },

  validate(data: BaseCharacter): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const [ability, score] of Object.entries(data.abilities)) {
      if (typeof score === 'number' && (score < 3 || score > 18)) {
        errors.push(`${ability} score ${score} is outside OSRIC range (3-18)`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },
};
