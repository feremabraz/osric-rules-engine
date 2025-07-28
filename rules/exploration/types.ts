import type { Character } from '../types';

// Search types
export interface SearchAction {
  actor: Character;
  area: SearchArea;
  method: SearchMethod;
  timeSpent: number; // in turns
  result: SearchResult;
}

export interface SearchArea {
  size: {
    width: number; // in feet
    height: number; // in feet
  };
  description: string;
  hasSecretDoors: boolean;
  hasTraps: boolean;
  secretDoorLocations?: string[];
  trapLocations?: string[];
}

export const SearchMethods = [
  'Standard',
  'Detailed',
  'Elf-Enhanced',
  'Dwarf-Enhanced',
  'Thief-Specialized',
  'Negotiated',
] as const;

export type SearchMethod = (typeof SearchMethods)[number];

export interface SearchResult {
  success: boolean;
  discoveredItems: string[];
  timeElapsed: number; // in turns
  increasedMonsterChance: boolean;
}

// Mapping types
export interface MappingAction {
  mapper: Character;
  area: MapArea;
  hasLight: boolean;
  hasTools: boolean;
  result: MappingResult;
}

export interface MapArea {
  size: {
    width: number; // in feet
    height: number; // in feet
  };
  complexity: MapComplexity;
  description: string;
}

export const MapComplexities = ['Simple', 'Moderate', 'Complex', 'Very Complex'] as const;
export type MapComplexity = (typeof MapComplexities)[number];

export interface MappingResult {
  success: boolean;
  accuracy: number; // percentage of correct mapping
  timeElapsed: number; // in turns
  increasedMonsterChance: boolean;
}

// Disease and Poison types
export const DiseaseTypes = [
  'Plague',
  'Infection',
  'Magical Disease',
  'Monster-Induced',
  'Environmental',
] as const;

export type DiseaseType = (typeof DiseaseTypes)[number];

export const PoisonTypes = ['Contact', 'Ingested', 'Injected', 'Inhaled', 'Magical'] as const;

export type PoisonType = (typeof PoisonTypes)[number];

export interface Disease {
  name: string;
  type: DiseaseType;
  incubationPeriod: number; // in days
  duration: number; // in days
  abilityPenalties: Partial<Record<keyof Character['abilities'], number>>;
  savingThrowModifier: number;
  deathChance: number; // percentage
  symptoms: string[];
  treatmentOptions: string[];
}

export interface Poison {
  name: string;
  type: PoisonType;
  onset: number; // in rounds
  damage: string; // e.g., "3d6" or "death"
  secondaryDamage: string | null;
  savingThrowModifier: number;
  duration: number; // in rounds
  symptoms: string[];
  antidotes: string[];
  halfLifeOutsideContainer: number; // in hours
}

// Temperature-related types
export const TemperatureRanges = [
  'Extreme Cold',
  'Severe Cold',
  'Cold',
  'Mild',
  'Comfortable',
  'Warm',
  'Hot',
  'Severe Heat',
  'Extreme Heat',
] as const;

export type TemperatureRange = (typeof TemperatureRanges)[number];

export interface TemperatureEffect {
  range: TemperatureRange;
  savingThrowRequired: boolean;
  savingThrowInterval: number; // in turns
  damagePerInterval: string | null; // e.g., "1d6" or null if no damage
  abilityPenalties: Partial<Record<keyof Character['abilities'], number>>;
  movementPenalty: number; // percentage
  combatPenalty: number; // penalty to attack rolls
  spellcastingPenalty: number; // percentage chance of spell failure
  protection: string[]; // list of items or spells that can provide protection
}

// Combined exploration module
export interface ExplorationAction {
  type: 'Search' | 'Map' | 'DiseaseCheck' | 'PoisonResistance' | 'TemperatureResistance';
  actor: Character;
  parameters:
    | SearchAction
    | MappingAction
    | DiseaseResistanceCheck
    | PoisonResistanceCheck
    | TemperatureResistanceCheck;
  result: SearchResult | MappingResult | ResistanceResult;
}

export interface DiseaseResistanceCheck {
  character: Character;
  disease: Disease;
  modifiers: {
    magicalAid: boolean;
    healerAssistance: boolean;
    previousExposure: boolean;
    constitutionAdjustment: number;
  };
}

export interface PoisonResistanceCheck {
  character: Character;
  poison: Poison;
  modifiers: {
    antidoteAdministered: boolean;
    magicalProtection: boolean;
    constitutionAdjustment: number;
    timeElapsedSinceExposure: number; // in rounds
  };
}

export interface TemperatureResistanceCheck {
  character: Character;
  temperatureEffect: TemperatureEffect;
  modifiers: {
    appropriateGear: boolean;
    magicalProtection: boolean;
    constitutionAdjustment: number;
    hoursExposed: number;
  };
}

export interface ResistanceResult {
  success: boolean;
  effectApplied: boolean;
  damage: number | null;
  statusEffects: string[];
  duration: number; // in rounds or turns, depending on effect type
}
