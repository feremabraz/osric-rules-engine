import type { Character } from './character';
import type { CharacterClass } from './character';
import type { Monster } from './monster';
// Shared types and utilities
export type Brand<T, B extends string> = T & { readonly __brand: B };
export type CharacterId = Brand<string, 'CharacterId'>;
export type ItemId = Brand<string, 'ItemId'>;
export type MonsterId = Brand<string, 'MonsterId'>;
export type SpellId = Brand<string, 'SpellId'>;

export const SavingThrowTypes = [
  'Poison or Death',
  'Wands',
  'Paralysis, Polymorph, or Petrification',
  'Breath Weapons',
  'Spells, Rods, or Staves',
] as const;
export type SavingThrowType = (typeof SavingThrowTypes)[number];

export interface Currency {
  platinum: number;
  gold: number;
  electrum: number;
  silver: number;
  copper: number;
}

export interface StatusEffect {
  name: string;
  duration: number;
  effect: string;
  savingThrow: SavingThrowType | null;
  endCondition: string | null;
}

export interface RacialAbility {
  name: string;
  description: string;
  effect: (character: Character) => void;
}

export interface ClassAbility {
  name: string;
  description: string;
  level: number;
  class: CharacterClass;
  effect: (character: Character, target?: Character | Monster) => ActionResult;
}

export interface ActionResult {
  success: boolean;
  message: string;
  damage: number[] | null;
  effects: string[] | null;
}

export interface CombatResult {
  hit: boolean;
  damage: number[];
  critical: boolean;
  message: string;
  specialEffects: StatusEffect[] | null;
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
