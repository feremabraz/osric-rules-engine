import type { CharacterClass, Monster } from '@rules/types';
import { determineLevel, getExperienceForNextLevel, getLevelTitle } from './levelProgression';
import { calculateMonsterXP } from './monsterXP';
import {
  calculateTrainingCompletion,
  getTrainingRequirements,
  meetsTrainingRequirements,
} from './training';
import type { ExperienceTracker, XPHistoryEntry, XPSource } from './types';

/**
 * Calculate XP rewards from combat encounter
 */
export function calculateCombatXP(
  defeatedMonsters: Monster[],
  playerLevel: number,
  partySize = 1,
  treasureValue = 0
): number {
  // Calculate base monster XP
  let monsterXP = 0;

  for (const monster of defeatedMonsters) {
    monsterXP += calculateMonsterXP(monster, playerLevel);
  }

  // Add treasure XP (in OSRIC, 1 GP = 1 XP)
  const treasureXP = treasureValue;

  // Total XP for the encounter
  const totalXP = monsterXP + treasureXP;

  // Divide by party size (if more than one character)
  const individualXP = Math.floor(totalXP / partySize);

  return individualXP;
}

/**
 * Award experience points to a character
 */
export function awardExperience(
  experienceTracker: ExperienceTracker,
  amount: number,
  source: XPSource,
  description: string
): ExperienceTracker {
  // Create history entry
  const entry: XPHistoryEntry = {
    amount,
    source,
    description,
    timestamp: new Date(),
  };

  // Update the tracker with new XP
  const updatedTracker: ExperienceTracker = {
    ...experienceTracker,
    current: experienceTracker.current + amount,
    history: [...experienceTracker.history, entry],
  };

  return updatedTracker;
}

/**
 * Check if character can level up
 */
export function canLevelUp(experienceTracker: ExperienceTracker): boolean {
  return experienceTracker.current >= experienceTracker.requiredForNextLevel;
}

/**
 * Start training for level up
 */
export function startTraining(
  experienceTracker: ExperienceTracker,
  characterClass: string,
  currentLevel: number,
  availableGold: number,
  hasTrainer: boolean,
  trainerLevel = 0,
  trainerName = 'Unknown Trainer'
): { experienceTracker: ExperienceTracker; goldSpent: number; success: boolean; message: string } {
  // Check if has enough XP
  if (!canLevelUp(experienceTracker)) {
    return {
      experienceTracker,
      goldSpent: 0,
      success: false,
      message: 'Not enough experience points to level up.',
    };
  }

  // Check training requirements
  const targetLevel = currentLevel + 1;
  const requirementCheck = meetsTrainingRequirements(
    characterClass as CharacterClass,
    currentLevel,
    targetLevel,
    availableGold,
    hasTrainer,
    trainerLevel
  );

  if (!requirementCheck.canAdvance) {
    return {
      experienceTracker,
      goldSpent: 0,
      success: false,
      message: requirementCheck.reason || 'Cannot meet training requirements.',
    };
  }

  // Get training details
  const trainingRequirements = getTrainingRequirements(
    characterClass as CharacterClass,
    currentLevel,
    targetLevel
  );

  // Calculate completion date
  const startDate = new Date();
  const completionDate = calculateTrainingCompletion(
    characterClass as CharacterClass,
    currentLevel,
    targetLevel,
    startDate
  );

  // Update tracker with training status
  const updatedTracker: ExperienceTracker = {
    ...experienceTracker,
    trainingStatus: {
      inProgress: true,
      completionDate,
      trainer: trainerName,
    },
  };

  return {
    experienceTracker: updatedTracker,
    goldSpent: trainingRequirements.cost,
    success: true,
    message: `Training started with ${trainerName}. Will be complete on ${completionDate.toLocaleDateString()}.`,
  };
}

/**
 * Complete level up process
 */
export function completeLevelUp(
  experienceTracker: ExperienceTracker,
  characterClass: string,
  currentLevel: number
): { experienceTracker: ExperienceTracker; newLevel: number; success: boolean; message: string } {
  // Check if training is complete
  if (
    experienceTracker.trainingStatus?.inProgress &&
    experienceTracker.trainingStatus.completionDate &&
    new Date() < experienceTracker.trainingStatus.completionDate
  ) {
    return {
      experienceTracker,
      newLevel: currentLevel,
      success: false,
      message: `Training not yet complete. Will finish on ${experienceTracker.trainingStatus.completionDate.toLocaleDateString()}.`,
    };
  }

  // Process level up
  const newLevel = currentLevel + 1;
  const newTitle = getLevelTitle(characterClass as CharacterClass, newLevel);
  const requiredForNextLevel = getExperienceForNextLevel(
    characterClass as CharacterClass,
    newLevel
  );

  // Update tracker
  const updatedTracker: ExperienceTracker = {
    ...experienceTracker,
    level: newLevel,
    requiredForNextLevel,
    trainingStatus: undefined, // Clear training status
  };

  return {
    experienceTracker: updatedTracker,
    newLevel,
    success: true,
    message: `Level up complete! Now a level ${newLevel} ${newTitle}.`,
  };
}

/**
 * Calculate prime requisite XP bonus percentage based on ability score
 */
export function calculatePrimeRequisiteBonus(primeRequisiteScore: number): number {
  // OSRIC rules for prime requisite bonuses
  if (primeRequisiteScore >= 16) return 0.1; // 10% bonus
  if (primeRequisiteScore === 15) return 0.05; // 5% bonus
  if (primeRequisiteScore === 7 || primeRequisiteScore === 8) return -0.1; // 10% penalty
  if (primeRequisiteScore <= 6) return -0.2; // 20% penalty

  return 0; // No bonus or penalty for scores 9-14
}

/**
 * Initialize a new experience tracker for a character
 */
export function initializeExperienceTracker(
  characterClass: string,
  primeRequisiteScore: number,
  startingExperience = 0
): ExperienceTracker {
  const primeRequisiteBonus = calculatePrimeRequisiteBonus(primeRequisiteScore);
  const level = determineLevel(characterClass as CharacterClass, startingExperience);
  const requiredForNextLevel = getExperienceForNextLevel(characterClass as CharacterClass, level);

  return {
    current: startingExperience,
    requiredForNextLevel,
    level,
    history: [],
    bonuses: {
      primeRequisiteBonus,
    },
  };
}

/**
 * Experience management functions
 */
export function calculateExperienceProgress(tracker: ExperienceTracker | null) {
  if (!tracker) return { percentage: 0, current: 0, required: 0 };

  const current = tracker.current;
  const required = tracker.requiredForNextLevel;
  // Calculate from the previous level requirement to the next level
  const previousLevelXP = required - required * 0.5; // Simplified approximation
  const totalNeeded = required - previousLevelXP;
  const progress = current - previousLevelXP;

  const percentage = Math.min(100, Math.floor((progress / totalNeeded) * 100));

  return { percentage, current, required };
}
