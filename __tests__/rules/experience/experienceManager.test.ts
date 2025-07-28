import {
  awardExperience,
  calculateCombatXP,
  calculatePrimeRequisiteBonus,
  canLevelUp,
  completeLevelUp,
  initializeExperienceTracker,
  startTraining,
} from '@rules/experience/experienceManager';
import type { ExperienceTracker } from '@rules/experience/types';
import { XPSource } from '@rules/experience/types';
import type { Alignment, Monster, MovementType } from '@rules/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock date to ensure consistent test results
vi.useFakeTimers();
const mockDate = new Date(2025, 4, 15); // May 15, 2025
vi.setSystemTime(mockDate);

describe('Experience Manager', () => {
  // Sample monster for testing
  const testMonster: Monster = {
    id: 'test-monster',
    name: 'Test Monster',
    level: 3,
    hitPoints: {
      current: 20,
      maximum: 20,
    },
    armorClass: 6,
    thac0: 17,
    experience: { current: 0, requiredForNextLevel: 4000, level: 3 },
    alignment: 'True Neutral' as Alignment,
    inventory: [],
    position: 'guarding',
    statusEffects: [],
    hitDice: '3+1',
    damagePerAttack: ['1d8'],
    morale: 8,
    treasure: 'C',
    specialAbilities: ['attack'],
    xpValue: 0,
    size: 'Medium',
    movementTypes: [{ type: 'Walk', rate: 30 }],
    habitat: ['dungeon'],
    frequency: 'Common',
    organization: 'solitary',
    diet: 'carnivore',
    ecology: 'predator',
  };

  let sampleTracker: ExperienceTracker;

  beforeEach(() => {
    // Initialize a fresh tracker for each test
    sampleTracker = {
      current: 0,
      requiredForNextLevel: 2000, // Fighter needs 2000 XP for level 2
      history: [],
      level: 1,
      bonuses: {
        primeRequisiteBonus: 0,
      },
      trainingStatus: undefined,
    };
  });

  describe('calculateCombatXP', () => {
    it('should calculate correct XP for a single monster', () => {
      const xp = calculateCombatXP([testMonster], 1);
      expect(xp).toBeGreaterThan(0);
      expect(Number.isInteger(xp)).toBe(true);
    });

    it('should split XP between party members', () => {
      const soloXP = calculateCombatXP([testMonster], 1, 1);
      const partyXP = calculateCombatXP([testMonster], 1, 4);
      expect(soloXP).toBe(partyXP * 4);
    });

    it('should include treasure value in XP calculation', () => {
      const noTreasureXP = calculateCombatXP([testMonster], 1, 1, 0);
      const withTreasureXP = calculateCombatXP([testMonster], 1, 1, 100);
      expect(withTreasureXP).toBe(noTreasureXP + 100);
    });
  });

  describe('awardExperience', () => {
    it('should correctly add XP to the tracker', () => {
      const updatedTracker = awardExperience(
        sampleTracker,
        1000,
        XPSource.COMBAT,
        'Defeated a monster'
      );
      expect(updatedTracker.current).toBe(1000);
      // Instead of checking total which no longer exists, verify the history was updated
      expect(updatedTracker.history.length).toBe(1);
      expect(updatedTracker.history[0].amount).toBe(1000);
      expect(updatedTracker.history[0].source).toBe(XPSource.COMBAT);
      expect(updatedTracker.history[0].description).toBe('Defeated a monster');
    });

    it('should keep history of multiple XP awards', () => {
      let tracker = awardExperience(sampleTracker, 1000, XPSource.COMBAT, 'Defeated a monster');
      tracker = awardExperience(tracker, 500, XPSource.QUEST, 'Completed a side quest');

      expect(tracker.current).toBe(1500);
      // Check the tracker state and history
      expect(tracker.history.length).toBe(2);
      expect(tracker.history[1].source).toBe(XPSource.QUEST);
    });
  });

  describe('canLevelUp', () => {
    it('should return false if not enough XP', () => {
      // Fighter needs 2000 XP to reach level 2
      sampleTracker.current = 1999;
      expect(canLevelUp(sampleTracker)).toBe(false);
    });

    it('should return true if enough XP', () => {
      // Fighter needs 2000 XP to reach level 2
      sampleTracker.current = 2000;
      expect(canLevelUp(sampleTracker)).toBe(true);
    });
  });

  describe('startTraining', () => {
    it('should return success if training requirements are met', () => {
      // Setting up a character with enough gold and a trainer
      sampleTracker.current = 2000; // Enough XP for level 2
      const result = startTraining(
        sampleTracker,
        'Fighter',
        1,
        5000, // Enough gold
        true, // Has trainer
        4, // Sufficient trainer level
        'Master Trainer'
      );

      expect(result.success).toBe(true);
      expect(result.goldSpent).toBeGreaterThan(0);
      expect(result.experienceTracker.trainingStatus).not.toBeNull();
      expect(result.experienceTracker.trainingStatus?.inProgress).toBe(true);
    });

    it('should return failure if training requirements are not met', () => {
      sampleTracker.current = 2000; // Enough XP for level 2
      const result = startTraining(
        sampleTracker,
        'Fighter',
        1,
        1000, // Not enough gold
        true, // Has trainer
        4, // Sufficient trainer level
        'Master Trainer'
      );

      expect(result.success).toBe(false);
      expect(result.goldSpent).toBe(0);
      expect(result.experienceTracker.trainingStatus).toBeUndefined();
    });
  });

  describe('completeLevelUp', () => {
    it('should level up character if training is complete', () => {
      // Set up a tracker with completed training
      sampleTracker.current = 2000; // Enough XP for level 2
      sampleTracker.trainingStatus = {
        inProgress: true,
        completionDate: new Date(2025, 4, 10), // Completed 5 days ago
        trainer: 'Master Trainer',
      };

      const result = completeLevelUp(sampleTracker, 'Fighter', 1);

      expect(result.success).toBe(true);
      expect(result.newLevel).toBe(2);
      expect(result.experienceTracker.trainingStatus).toBeUndefined();
    });

    it('should not level up if training is incomplete', () => {
      // Set up a tracker with incomplete training
      sampleTracker.current = 2000; // Enough XP for level 2
      sampleTracker.trainingStatus = {
        inProgress: true,
        completionDate: new Date(2025, 4, 20), // Will complete in 5 days
        trainer: 'Master Trainer',
      };

      const result = completeLevelUp(sampleTracker, 'Fighter', 1);

      expect(result.success).toBe(false);
      expect(result.experienceTracker.trainingStatus).not.toBeUndefined();
    });
  });

  describe('calculatePrimeRequisiteBonus', () => {
    it('should return 0% bonus for average ability scores', () => {
      expect(calculatePrimeRequisiteBonus(10)).toBe(0);
      expect(calculatePrimeRequisiteBonus(12)).toBe(0);
    });

    it('should return positive bonus for high ability scores', () => {
      expect(calculatePrimeRequisiteBonus(15)).toBeGreaterThan(0);
      expect(calculatePrimeRequisiteBonus(18)).toBeGreaterThan(0);
    });

    it('should return negative penalty for low ability scores', () => {
      expect(calculatePrimeRequisiteBonus(6)).toBeLessThan(0);
      expect(calculatePrimeRequisiteBonus(3)).toBeLessThan(0);
    });
  });

  describe('initializeExperienceTracker', () => {
    it('should create a proper tracker for a new character', () => {
      const tracker = initializeExperienceTracker('Fighter', 10, 0);

      expect(tracker.current).toBe(0);
      expect(tracker.level).toBe(1); // Level 1 character
      expect(tracker.bonuses.primeRequisiteBonus).toBe(0); // No bonus for score 10
      expect(tracker.history.length).toBe(0);
      expect(tracker.trainingStatus).toBeUndefined();
    });

    it('should apply bonus percentage for high ability scores', () => {
      const tracker = initializeExperienceTracker('Fighter', 16, 0);

      expect(tracker.bonuses.primeRequisiteBonus).toBeGreaterThan(0);
    });

    it('should initialize with starting experience if provided', () => {
      const tracker = initializeExperienceTracker('Fighter', 10, 1000);

      expect(tracker.current).toBe(1000);
      // The implementation doesn't add a history entry for initial XP, only sets current
      expect(tracker.history.length).toBe(0);
    });
  });
});
