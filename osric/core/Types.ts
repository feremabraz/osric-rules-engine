/**
 * Core types for OSRIC Rules Engine
 * These are foundational types that other systems depend on
 */

// Basic character type (simplified for OSRIC needs)
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
  // Character inventory and status
  inventory?: Item[];
  statusEffects?: StatusEffect[];
}

// Basic item type
export interface Item {
  id: string;
  name: string;
  itemType: string;
  weight: number;
  value: number;
  description?: string;
  // Magic item properties
  charges?: number | null;
  magicBonus?: number;
  commandWord?: string;
  cursed?: boolean;
}

// Basic spell type
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

// Saving throw types
export type SavingThrowType = 'paralysis' | 'rod' | 'petrification' | 'breath' | 'spell';

// Status effects
export interface StatusEffect {
  name: string;
  duration: number;
  description: string;
}

// Combat-related types
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

// Game time types
export interface GameTime {
  rounds: number;
  turns: number;
  hours: number;
  days: number;
}

// Location and movement
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
