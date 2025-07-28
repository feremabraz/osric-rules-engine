import {
  calculateTrainingCompletion,
  getTrainingRequirements,
  meetsTrainingRequirements,
} from '@rules/experience/training';
import type { CharacterClass } from '@rules/types';
import { beforeEach, describe, expect, it } from 'vitest';

describe('Character Training', () => {
  describe('getTrainingRequirements', () => {
    it('should return correct training requirements for different classes', () => {
      // Test Fighter training requirements
      const fighterReqs = getTrainingRequirements('Fighter', 1, 2);
      expect(fighterReqs).toHaveProperty('needsTrainer', true);
      expect(fighterReqs).toHaveProperty('minimumTrainerLevel');
      expect(fighterReqs).toHaveProperty('cost');
      expect(fighterReqs).toHaveProperty('duration');
      expect(fighterReqs.cost).toBe(3000); // 1500 * level 2

      // Test Magic-User training requirements (should be more expensive)
      const mageReqs = getTrainingRequirements('Magic-User', 1, 2);
      expect(mageReqs.cost).toBe(4000); // 2000 * level 2
      expect(mageReqs.cost).toBeGreaterThan(fighterReqs.cost);
    });

    it('should scale requirements with target level', () => {
      const level2Reqs = getTrainingRequirements('Fighter', 1, 2);
      const level3Reqs = getTrainingRequirements('Fighter', 2, 3);

      // Higher level should cost more
      expect(level3Reqs.cost).toBeGreaterThan(level2Reqs.cost);

      // Higher level should take more time
      expect(level3Reqs.duration).toBeGreaterThan(level2Reqs.duration);
    });
  });

  describe('meetsTrainingRequirements', () => {
    it('should return true when all requirements are met', () => {
      const result = meetsTrainingRequirements(
        'Fighter',
        1,
        2,
        10000, // Plenty of gold
        true, // Has trainer
        4 // Trainer level is high enough
      );

      expect(result.canAdvance).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should return false with reason when gold is insufficient', () => {
      const result = meetsTrainingRequirements(
        'Fighter',
        1,
        2,
        1000, // Not enough gold
        true, // Has trainer
        4 // Trainer level is high enough
      );

      expect(result.canAdvance).toBe(false);
      expect(result.reason).toContain('gold');
    });

    it('should return false with reason when no trainer is available', () => {
      const result = meetsTrainingRequirements(
        'Fighter',
        1,
        2,
        10000, // Plenty of gold
        false, // No trainer
        0 // No trainer level
      );

      expect(result.canAdvance).toBe(false);
      expect(result.reason).toContain('trainer');
    });

    it('should return false with reason when trainer level is too low', () => {
      const result = meetsTrainingRequirements(
        'Fighter',
        1,
        2,
        10000, // Plenty of gold
        true, // Has trainer
        2 // Trainer level too low
      );

      expect(result.canAdvance).toBe(false);
      expect(result.reason).toContain('level');
    });
  });

  describe('calculateTrainingCompletion', () => {
    let startDate: Date;

    beforeEach(() => {
      startDate = new Date(2025, 4, 15); // May 15, 2025
    });

    it('should calculate correct training completion date', () => {
      const fighterTraining = calculateTrainingCompletion('Fighter', 1, 2, startDate);

      // Get training requirements to know duration
      const requirements = getTrainingRequirements('Fighter', 1, 2);
      const expectedDays = requirements.duration;

      // Expected completion date
      const expectedDate = new Date(startDate);
      expectedDate.setDate(expectedDate.getDate() + expectedDays);

      expect(fighterTraining.getTime()).toBe(expectedDate.getTime());
    });

    it('should calculate longer training periods for higher levels', () => {
      const level2Training = calculateTrainingCompletion('Fighter', 1, 2, startDate);
      const level3Training = calculateTrainingCompletion('Fighter', 2, 3, startDate);

      expect(level3Training.getTime()).toBeGreaterThan(level2Training.getTime());
    });

    it('should calculate different training periods for different classes', () => {
      const fighterTraining = calculateTrainingCompletion('Fighter', 1, 2, startDate);
      const mageTraining = calculateTrainingCompletion('Magic-User', 1, 2, startDate);

      // Mages should take longer to train than fighters
      expect(mageTraining.getTime()).toBeGreaterThan(fighterTraining.getTime());
    });
  });
});
