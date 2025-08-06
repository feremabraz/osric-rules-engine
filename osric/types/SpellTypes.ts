import type { Character, Item, SavingThrowType, Spell } from '../core/Types';

export type SpellComponentType = 'V' | 'S' | 'M';

export interface MaterialComponent {
  name: string;
  consumed: boolean;
  cost?: number;
  description?: string;
}

export interface SpellWithComponents extends Spell {
  componentRequirements: SpellComponentType[];
  detailedMaterialComponents: MaterialComponent[];
}

export interface SpellResearch {
  researcherId: string;
  spellName: string;
  targetLevel: number;
  daysSpent: number;
  goldSpent: number;
  progressPercentage: number;
  estimatedCompletion: number;
  notes: string;
  failureChance: number;
}

export interface ResearchDifficultyFactors {
  spellLevel: number;
  casterLevel: number;
  intelligence: number;
  resources: number;
  rarity: number;
}

export interface ScrollCreation {
  creatorId: string;
  spellName: string;
  spellLevel: number;
  daysRequired: number;
  materialCost: number;
  progressPercentage: number;
}

export interface ScrollCastingCheck {
  scroll: MagicScroll;
  caster: Character;
  failureChance: number;
  backfireChance: number;
}

export interface MagicScroll extends Item {
  itemType: 'scroll';
  spell: Spell;
  userClasses: string[];
  consumed: boolean;
  minCasterLevel: number;
  failureEffect?: string;
}

export interface IdentificationResult {
  success: boolean;
  itemIdentified: boolean;
  propertiesRevealed: string[];
  commandWordRevealed: boolean;
  estimatedCharges: number | null;
  actualCharges: number | null;
  curseDetected: boolean;
  constitutionLoss: number;
}
