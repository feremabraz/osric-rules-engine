import type { Character } from '@osric/types/character';
import type { Spell } from '@osric/types/spell';

export interface ScrollCreation {
  creatorId: string;
  spellName: string;
  spellLevel: number;
  daysRequired: number;
  materialCost: number;
  progressPercentage: number;
}

export interface MagicScroll {
  id: string;
  name: string;
  itemType: 'scroll';
  spell: Spell;
  userClasses: string[];
  consumed: boolean;
  minCasterLevel: number;
  failureEffect?: string;
  weight: number;
  value: number;
  description: string;
  equipped: boolean;
  magicBonus: number | null;
  charges: number | null;
}

export interface ScrollCastingCheck {
  scroll: MagicScroll;
  caster: Character;
  failureChance: number;
  backfireChance: number;
}
