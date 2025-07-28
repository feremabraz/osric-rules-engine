import type { CharacterClass } from '@rules/types';
import type { TrainingRequirement } from './types';

/**
 * Training requirements for level advancement by character class
 * Based on OSRIC ruleset
 */
export function getTrainingRequirements(
  characterClass: CharacterClass,
  currentLevel: number,
  targetLevel: number
): TrainingRequirement {
  // Base training requirements
  const baseRequirements: Record<CharacterClass, TrainingRequirement> = {
    Fighter: {
      needsTrainer: true,
      minimumTrainerLevel: currentLevel + 2,
      cost: 1500 * targetLevel,
      duration: 1 + targetLevel, // Days
    },
    Cleric: {
      needsTrainer: true,
      minimumTrainerLevel: currentLevel + 2,
      cost: 1000 * targetLevel,
      duration: 2 * targetLevel, // Days of prayer and meditation
    },
    'Magic-User': {
      needsTrainer: true,
      minimumTrainerLevel: currentLevel + 2,
      cost: 2000 * targetLevel,
      duration: 2 * targetLevel, // Days of study
    },
    Thief: {
      needsTrainer: true,
      minimumTrainerLevel: currentLevel + 2,
      cost: 1000 * targetLevel,
      duration: 1 + targetLevel, // Days
    },
    Assassin: {
      needsTrainer: true,
      minimumTrainerLevel: currentLevel + 2,
      cost: 1500 * targetLevel,
      duration: 1 + targetLevel, // Days
    },
    Druid: {
      needsTrainer: true,
      minimumTrainerLevel: currentLevel + 2,
      cost: 1000 * targetLevel,
      duration: 2 * targetLevel, // Days of communion with nature
    },
    Paladin: {
      needsTrainer: true,
      minimumTrainerLevel: currentLevel + 2,
      cost: 2000 * targetLevel,
      duration: 3 * targetLevel, // Days of prayer and training
    },
    Ranger: {
      needsTrainer: true,
      minimumTrainerLevel: currentLevel + 2,
      cost: 1500 * targetLevel,
      duration: 2 * targetLevel, // Days of wilderness training
    },
    Illusionist: {
      needsTrainer: true,
      minimumTrainerLevel: currentLevel + 2,
      cost: 2000 * targetLevel,
      duration: 2 * targetLevel, // Days of study
    },
  };

  // Get base requirement for the class
  const baseRequirement = baseRequirements[characterClass];

  // Special cases
  // Higher levels require higher level trainers and more resources
  if (targetLevel >= 9) {
    return {
      ...baseRequirement,
      minimumTrainerLevel: Math.max(currentLevel + 3, targetLevel + 1),
      cost: baseRequirement.cost * 1.5,
      duration: baseRequirement.duration * 1.5,
    };
  }

  // Some classes don't need trainers at certain levels in OSRIC
  // e.g., Assassins becoming guild masters, etc.
  if (
    (characterClass === 'Assassin' && targetLevel >= 14) ||
    (characterClass === 'Druid' && targetLevel >= 12)
  ) {
    return {
      ...baseRequirement,
      needsTrainer: false,
      cost: baseRequirement.cost * 0.5, // Still needs resources, but no trainer fee
      duration: baseRequirement.duration, // Still takes time
    };
  }

  return baseRequirement;
}

/**
 * Check if a character meets the training requirements to level up
 */
export function meetsTrainingRequirements(
  characterClass: CharacterClass,
  currentLevel: number,
  targetLevel: number,
  availableGold: number,
  hasTrainer: boolean,
  trainerLevel = 0
): { canAdvance: boolean; reason?: string } {
  // Can only advance one level at a time
  if (targetLevel !== currentLevel + 1) {
    return {
      canAdvance: false,
      reason: 'Characters can only advance one level at a time.',
    };
  }

  const requirements = getTrainingRequirements(characterClass, currentLevel, targetLevel);

  // Check gold
  if (availableGold < requirements.cost) {
    return {
      canAdvance: false,
      reason: `Not enough gold for training. Need ${requirements.cost} gold.`,
    };
  }

  // Check trainer requirements
  if (requirements.needsTrainer) {
    if (!hasTrainer) {
      return {
        canAdvance: false,
        reason: 'No trainer available for training.',
      };
    }

    if (trainerLevel < requirements.minimumTrainerLevel) {
      return {
        canAdvance: false,
        reason: `Trainer level (${trainerLevel}) is too low. Need level ${requirements.minimumTrainerLevel} or higher.`,
      };
    }
  }

  return { canAdvance: true };
}

/**
 * Calculate when training will be complete
 */
export function calculateTrainingCompletion(
  characterClass: CharacterClass,
  currentLevel: number,
  targetLevel: number,
  startDate: Date
): Date {
  const requirements = getTrainingRequirements(characterClass, currentLevel, targetLevel);
  const completionDate = new Date(startDate);

  // Add training duration in days
  completionDate.setDate(completionDate.getDate() + Math.ceil(requirements.duration));

  return completionDate;
}
