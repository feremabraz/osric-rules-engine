// Monster-related types
import type { BaseCharacter } from './character';
// Monster-related types
export const CreatureSizes = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'] as const;
export type CreatureSize = (typeof CreatureSizes)[number];

export const MonsterFrequencies = ['Common', 'Uncommon', 'Rare', 'Very Rare', 'Unique'] as const;
export type MonsterFrequency = (typeof MonsterFrequencies)[number];

export const MovementTypes = ['Walk', 'Fly', 'Swim', 'Burrow', 'Climb'] as const;
export type MovementTypeValue = (typeof MovementTypes)[number];

export interface MovementType {
  type: MovementTypeValue;
  rate: number;
}

export interface Monster extends BaseCharacter {
  hitDice: string;
  damagePerAttack: string[];
  morale: number;
  treasure: string;
  specialAbilities: string[];
  xpValue: number;
  size: CreatureSize;
  movementTypes: MovementType[];
  habitat: string[];
  frequency: MonsterFrequency;
  organization: string;
  diet: string;
  ecology: string;
  exceptional?: boolean;
}
