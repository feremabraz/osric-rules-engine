import type { CharacterClass } from './character';
// Item, weapon, armor types
// Item, weapon, armor types
export interface Item {
  id: string;
  name: string;
  weight: number;
  description: string;
  value: number;
  equipped: boolean;
  magicBonus: number | null;
  charges: number | null;
  itemType?: string;
  commandWord?: string;
  cursed?: boolean;
}

export const WeaponTypes = ['Melee', 'Ranged'] as const;
export type WeaponType = (typeof WeaponTypes)[number];

export const WeaponSizes = ['Small', 'Medium', 'Large'] as const;
export type WeaponSize = (typeof WeaponSizes)[number];

export interface Weapon extends Item {
  damage: string;
  type: WeaponType;
  size: WeaponSize;
  speed: number;
  allowedClasses: CharacterClass[];
  damageVsLarge: string | null;
  range: [number, number, number] | null;
  twoHanded: boolean;
}

export const ArmorTypes = ['Shield', 'Armor'] as const;
export type ArmorType = (typeof ArmorTypes)[number];

export interface Armor extends Item {
  armorClass: number;
  type: ArmorType;
  allowedClasses: CharacterClass[];
  movementPenalty: number | null;
}
