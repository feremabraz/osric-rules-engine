import type { CharacterClass, Monster } from '@rules/types';

/**
 * Experience point bonuses based on prime ability scores
 */
export interface ExperienceBonuses {
  // Percentage bonus from high prime requisite (e.g., 10% for high Strength for Fighters)
  primeRequisiteBonus: number;
}

/**
 * Training requirements needed to level up
 */
export interface TrainingRequirement {
  // Whether this class requires a trainer (true for most classes)
  needsTrainer: boolean;
  // Minimum trainer level (usually character level + 1 or higher)
  minimumTrainerLevel: number;
  // Training cost in gold pieces
  cost: number;
  // Training duration in days
  duration: number;
}

/**
 * Level advancement data
 */
export interface LevelAdvancement {
  level: number;
  experienceRequired: number;
  title?: string; // Class-specific title for this level
  hitDiceType: number; // e.g., 8 for d8
  hitDiceCount: number; // Number of dice at this level
  hitPointModifier?: number; // Any flat bonus to HP
  specialAbilities?: string[]; // New abilities gained at this level
}

/**
 * XP reward factors - components that affect XP calculation
 */
export interface XPRewardFactors {
  // Base XP from monster's HD/level
  baseXP: number;
  // XP bonus for special abilities
  specialAbilityBonus: number;
  // XP bonus for exceptional challenge
  exceptionalChallengeBonus: number;
  // XP modifier based on character level vs monster level
  levelDifferenceModifier: number;
}

/**
 * Experience table index by character class
 */
export type ExperienceTablesByClass = Record<CharacterClass, LevelAdvancement[]>;

/**
 * Monster XP table by HD
 */
export type MonsterXPTable = Record<string, number>;

/**
 * XP source - what the XP was earned for
 */
export enum XPSource {
  COMBAT = 'combat',
  TREASURE = 'treasure',
  QUEST = 'quest',
  ROLEPLAY = 'roleplay',
  OTHER = 'other',
}

/**
 * XP history entry
 */
export interface XPHistoryEntry {
  amount: number;
  source: XPSource;
  description: string;
  timestamp: Date;
}

/**
 * Interface for tracking experience points
 */
export interface ExperienceTracker {
  current: number;
  requiredForNextLevel: number;
  history: XPHistoryEntry[];
  level: number;
  bonuses: ExperienceBonuses;
  unspentXP?: number; // For banking XP when not yet trained
  trainingStatus?: {
    inProgress: boolean;
    completionDate?: Date;
    trainer?: string;
  };
}
