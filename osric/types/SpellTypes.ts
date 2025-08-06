/**
 * Advanced spell system types for OSRIC Rules Engine
 */
import type { Character, Item, SavingThrowType, Spell } from '../core/Types';

// Spell component requirements
export type SpellComponentType = 'V' | 'S' | 'M';

// Material component with detailed tracking information
export interface MaterialComponent {
  name: string;
  consumed: boolean;
  cost?: number; // Cost in gold pieces if purchasable
  description?: string;
}

// Expanded spell type with component tracking
export interface SpellWithComponents extends Spell {
  componentRequirements: SpellComponentType[];
  detailedMaterialComponents: MaterialComponent[]; // Detailed material components
}

// Spell research details
export interface SpellResearch {
  researcherId: string;
  spellName: string;
  targetLevel: number;
  daysSpent: number;
  goldSpent: number;
  progressPercentage: number;
  estimatedCompletion: number; // Days remaining
  notes: string;
  failureChance: number;
}

// Spell research difficulty factors
export interface ResearchDifficultyFactors {
  spellLevel: number; // Higher levels are harder
  casterLevel: number; // Higher is better
  intelligence: number; // Higher is better
  resources: number; // Gold spent on research
  rarity: number; // How unique/powerful spell is (1-10)
}

// Scroll creation
export interface ScrollCreation {
  creatorId: string;
  spellName: string;
  spellLevel: number;
  daysRequired: number;
  materialCost: number;
  progressPercentage: number;
}

// Scroll casting details
export interface ScrollCastingCheck {
  scroll: MagicScroll;
  caster: Character;
  failureChance: number; // Base 5% per level difference
  backfireChance: number; // If failed, chance for harmful effect
}

// Magic scroll as a specific item type
export interface MagicScroll extends Item {
  itemType: 'scroll';
  spell: Spell;
  userClasses: string[]; // Classes that can use this scroll
  consumed: boolean; // If the scroll has been used
  minCasterLevel: number;
  failureEffect?: string; // What happens on a failed casting
}

// Magic item identification results
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
