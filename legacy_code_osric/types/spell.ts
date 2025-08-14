import type { Character } from './character';
import type { Monster } from './monster';
import type { SavingThrowType, StatusEffect } from './shared';
// Spell-related types
export const SpellClasses = ['Magic-User', 'Cleric', 'Druid', 'Illusionist'] as const;
export type SpellClass = (typeof SpellClasses)[number];

export interface Spell {
  name: string;
  level: number;
  class: SpellClass;
  school?: string;
  range: string;
  duration: string;
  areaOfEffect: string;
  components: string[];
  castingTime: string;
  savingThrow: SavingThrowType | 'None';
  description: string;
  reversible: boolean;
  materialComponents: string[] | null;
  effect: (caster: Character, targets: (Character | Monster)[]) => SpellResult;
}

export interface SpellResult {
  damage: number[] | null;
  healing: number[] | null;
  statusEffects: StatusEffect[] | null;
  narrative: string;
}
