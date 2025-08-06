export interface Character {
  id: string;
  name: string;
  class: string;
  level: number;
  abilities: {
    strength: number;
    intelligence: number;
    wisdom: number;
    dexterity: number;
    constitution: number;
    charisma: number;
  };
  hitPoints: {
    current: number;
    maximum: number;
  };
  armorClass: number;
  experience: number;
  savingThrows: {
    paralysis: number;
    rod: number;
    petrification: number;
    breath: number;
    spell: number;
  };

  inventory?: Item[];
  statusEffects?: StatusEffect[];
}

export interface Item {
  id: string;
  name: string;
  itemType: string;
  weight: number;
  value: number;
  description?: string;

  charges?: number | null;
  magicBonus?: number;
  commandWord?: string;
  cursed?: boolean;
}

export interface Spell {
  name: string;
  level: number;
  school: string;
  castingTime: string;
  range: string;
  duration: string;
  description: string;
  components: string[];
}

export type SavingThrowType = 'paralysis' | 'rod' | 'petrification' | 'breath' | 'spell';

export interface StatusEffect {
  name: string;
  duration: number;
  description: string;
}

export interface AttackRoll {
  roll: number;
  modifier: number;
  total: number;
  hit: boolean;
}

export interface Damage {
  amount: number;
  type: string;
}

export interface GameTime {
  rounds: number;
  turns: number;
  hours: number;
  days: number;
}

export interface Position {
  x: number;
  y: number;
  z?: number;
}

export interface Movement {
  base: number;
  current: number;
  encumbered: boolean;
}
