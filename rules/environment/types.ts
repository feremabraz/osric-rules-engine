import type { ActionResult, Character } from '@rules/types';

// Falling damage related types
export interface FallingDamageParams {
  distance: number; // in meters (converted from OSRIC's feet)
  character: Character;
  modifiers?: {
    damageFactor?: number; // for magical effects that might reduce damage
    savingThrowBonus?: number; // for any bonuses to avoid damage
  };
}

export interface FallingDamageResult extends ActionResult {
  distance: number;
  damagePerDie: number;
  diceRolled: number;
}

// Swimming/drowning related types
export const SwimmingDifficultyLevels = [
  'Calm',
  'Choppy',
  'Rough',
  'Stormy',
  'Treacherous',
] as const;

export type SwimmingDifficulty = (typeof SwimmingDifficultyLevels)[number];

export interface SwimmingParams {
  character: Character;
  difficulty: SwimmingDifficulty;
  armorWorn: boolean; // According to OSRIC, armored characters have difficulty swimming
  encumbered: boolean; // Heavily encumbered characters have more difficulty
  consecutiveRounds?: number; // How many rounds the character has been swimming
  modifiers?: {
    strengthBonus?: number; // Additional strength bonus beyond normal modifiers
    constitutionBonus?: number; // Additional constitution bonus
  };
}

export interface SwimmingResult extends ActionResult {
  roundsBeforeTiring: number; // How many more rounds the character can swim before tiring
  roundsBeforeDrowning: number | null; // Null if not at risk of drowning
  difficulty: SwimmingDifficulty;
}

// Starvation and thirst related types
export interface SurvivalNeedStatus {
  daysSinceLastFood: number;
  daysSinceLastWater: number;
  currentEffects: string[];
}

export interface SurvivalNeedParams {
  character: Character;
  status: SurvivalNeedStatus;
  isDesertEnvironment?: boolean; // Increases water needs
  isFrigidEnvironment?: boolean; // Increases food needs
  modifiers?: {
    constitutionBonus?: number; // Additional constitution bonus
  };
}

export interface SurvivalNeedResult extends ActionResult {
  status: SurvivalNeedStatus;
  damageApplied: number;
  statPenalties: Record<string, number>;
}

// Environment temperature related types
export const TemperatureRanges = [
  'Frigid', // Below freezing, risk of hypothermia
  'Cold', // Cold but above freezing
  'Cool', // Cool but not uncomfortable
  'Moderate', // Comfortable
  'Warm', // Warm but not uncomfortable
  'Hot', // Hot, risk of heat exhaustion
  'Extreme', // Extremely hot, risk of heat stroke
] as const;

export type TemperatureRange = (typeof TemperatureRanges)[number];

export interface TemperatureEffectParams {
  character: Character;
  temperature: TemperatureRange;
  hoursExposed: number;
  hasAppropriateClothing: boolean;
  hasAppropriateEquipment: boolean; // e.g., tent, fire, etc.
  modifiers?: {
    constitutionBonus?: number; // Additional constitution bonus
  };
}

export interface TemperatureEffectResult extends ActionResult {
  temperature: TemperatureRange;
  effectLevel: number; // 0 = none, 1 = mild, 2 = moderate, 3 = severe
  damageApplied: number;
  statPenalties: Record<string, number>;
}
