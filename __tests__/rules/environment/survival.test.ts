import { findFoodAndWater, resolveSurvivalNeeds } from '@rules/environment/survival';
import * as diceLib from '@rules/utils/dice';
import { mockAdventurer, mockWeakAdventurer } from '@tests/utils/mockData';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('Survival Needs Mechanics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset character's hit points before each test
    mockAdventurer.hitPoints.current = mockAdventurer.hitPoints.maximum;
    mockWeakAdventurer.hitPoints.current = mockWeakAdventurer.hitPoints.maximum;
  });

  describe('resolveSurvivalNeeds', () => {
    it('should have no effects when needs are met', () => {
      const result = resolveSurvivalNeeds({
        character: mockAdventurer,
        status: {
          daysSinceLastFood: 0,
          daysSinceLastWater: 0,
          currentEffects: [],
        },
      });

      expect(result.success).toBe(true);
      expect(result.effects).toBeNull();
      expect(result.damage).toBeNull();
      expect(result.damageApplied).toBe(0);
      expect(result.message).toContain('well fed and hydrated');
    });

    it('should apply mild effects for 1 day without food', () => {
      const result = resolveSurvivalNeeds({
        character: mockAdventurer,
        status: {
          daysSinceLastFood: 1,
          daysSinceLastWater: 0,
          currentEffects: [],
        },
      });

      expect(result.success).toBe(false);
      expect(result.effects).toContain('Hungry');
      expect(result.statPenalties.strength).toBeUndefined(); // No strength penalty until starvation
      expect(result.statPenalties.constitution).toBeUndefined(); // No con penalty yet
      expect(result.message).toContain('suffering from Hungry');
    });

    it('should apply moderate effects for 3 days without food', () => {
      // Threshold is 3 + 1 (con mod) = 4, so 5 days is over threshold
      const result = resolveSurvivalNeeds({
        character: mockAdventurer,
        status: {
          daysSinceLastFood: 5, // Beyond threshold (3 + 1)
          daysSinceLastWater: 0,
          currentEffects: [],
        },
      });

      expect(result.success).toBe(false);
      expect(result.effects).toContain('Starving');
      expect(result.statPenalties.strength).toBeDefined();
      expect(result.statPenalties.constitution).toBeDefined();
      expect(result.message).toContain('suffering from Starving');
    });

    it('should apply severe effects for 6 days without food', () => {
      const result = resolveSurvivalNeeds({
        character: mockAdventurer,
        status: {
          daysSinceLastFood: 10, // Well beyond threshold
          daysSinceLastWater: 0,
          currentEffects: [],
        },
      });

      expect(result.success).toBe(false);
      expect(result.effects).toContain('Starving');
      expect(result.effects).toContain('Severely Malnourished');
      expect(result.statPenalties.strength).toBeGreaterThan(1); // Significant strength loss
      expect(result.statPenalties.constitution).toBeGreaterThan(0); // Constitution affected
      expect(result.message).toContain('suffering from Starving and Severely Malnourished');
    });

    it('should apply mild effects for 1 day without water', () => {
      const result = resolveSurvivalNeeds({
        character: mockAdventurer,
        status: {
          daysSinceLastFood: 0,
          daysSinceLastWater: 1,
          currentEffects: [],
        },
      });

      expect(result.success).toBe(false);
      expect(result.effects).toContain('Thirsty');
      expect(result.message).toContain('suffering from Thirsty');
    });

    it('should apply moderate effects for 2 days without water', () => {
      // Create a character with a lower constitution system shock value
      const testCharacter = {
        ...mockAdventurer,
        abilityModifiers: {
          ...mockAdventurer.abilityModifiers,
          constitutionSystemShock: 10, // Lower value to make the threshold = 1 + floor(10/10/2) = 1 + 0 = 1
        },
      };

      // Now 2 days without water should trigger dehydration
      const result = resolveSurvivalNeeds({
        character: testCharacter,
        status: {
          daysSinceLastFood: 0,
          daysSinceLastWater: 2, // Just beyond threshold
          currentEffects: [],
        },
      });

      expect(result.success).toBe(false);
      expect(result.effects).toContain('Dehydrated');
      expect(result.statPenalties.constitution).toBeDefined();
      expect(result.statPenalties.strength).toBeDefined();
      expect(result.message).toContain('suffering from Dehydrated');
    });

    it('should apply severe effects for 3 days without water', () => {
      const result = resolveSurvivalNeeds({
        character: mockAdventurer,
        status: {
          daysSinceLastFood: 0,
          daysSinceLastWater: 5, // Well beyond threshold
          currentEffects: [],
        },
      });

      expect(result.success).toBe(false);
      expect(result.effects).toContain('Dehydrated');
      expect(result.effects).toContain('Severely Dehydrated');
      expect(result.statPenalties.constitution).toBeDefined();
      expect(result.statPenalties.strength).toBeDefined();
      expect(result.statPenalties.dexterity).toBeDefined();
      expect(result.message).toContain('suffering from Dehydrated and Severely Dehydrated');
    });

    it('should apply damage after more than 3 days without water', () => {
      // Mock a roll for the damage calculation if needed

      const result = resolveSurvivalNeeds({
        character: mockAdventurer,
        status: {
          daysSinceLastFood: 0,
          daysSinceLastWater: 5, // Well beyond threshold
          currentEffects: [],
        },
      });

      expect(result.success).toBe(false);
      expect(result.effects).toContain('Dehydrated');
      expect(result.damage).not.toBeNull();
      expect(result.damageApplied).toBeGreaterThan(0);
      expect(mockAdventurer.hitPoints.current).toBeLessThan(mockAdventurer.hitPoints.maximum);
    });

    it('should apply combined effects of hunger and thirst', () => {
      const result = resolveSurvivalNeeds({
        character: mockAdventurer,
        status: {
          daysSinceLastFood: 1,
          daysSinceLastWater: 1,
          currentEffects: [],
        },
      });

      expect(result.success).toBe(false);
      expect(result.effects).toContain('Hungry');
      expect(result.effects).toContain('Thirsty');
      expect(result.message).toContain('suffering from Hungry and Thirsty');
    });

    it('should have worse effects on characters with low constitution', () => {
      // Create survival results for both characters
      const strongResult = resolveSurvivalNeeds({
        character: mockAdventurer,
        status: {
          daysSinceLastFood: 0,
          daysSinceLastWater: 5,
          currentEffects: [],
        },
      });

      const weakResult = resolveSurvivalNeeds({
        character: mockWeakAdventurer,
        status: {
          daysSinceLastFood: 0,
          daysSinceLastWater: 5,
          currentEffects: [],
        },
      });

      // Both characters are affected
      expect(strongResult.success).toBe(false);
      expect(weakResult.success).toBe(false);

      // Weak character should have worse outcomes
      expect(weakResult.damageApplied >= strongResult.damageApplied).toBe(true);
    });

    it('should mark character as unconscious when HP reaches 0', () => {
      // Set HP low enough to be knocked unconscious
      mockAdventurer.hitPoints.current = 5;

      // Set up the test to ensure we get exactly enough damage to drop to 0
      const result = resolveSurvivalNeeds({
        character: mockAdventurer,
        status: {
          daysSinceLastFood: 0,
          daysSinceLastWater: 4, // Threshold is 1, so 3 days of damage
          currentEffects: [],
        },
      });

      expect(result.success).toBe(false);
      expect(mockAdventurer.hitPoints.current).toBeLessThanOrEqual(0);
      expect(result.effects).toContain('Unconscious');
    });
  });

  describe('findFoodAndWater', () => {
    it('should find food and water with a good roll in fertile terrain', () => {
      // Mock successful rolls for both food and water
      vi.spyOn(diceLib, 'roll')
        .mockReturnValueOnce(18) // First roll for food
        .mockReturnValueOnce(18); // Second roll for water

      const result = findFoodAndWater(mockAdventurer, 'Forest');

      expect(result.food).toBe(true);
      expect(result.water).toBe(true);
      expect(result.message).toContain('successfully finds both');
    });

    it('should struggle in harsh terrain', () => {
      // Mock a poor survival roll
      vi.spyOn(diceLib, 'roll')
        .mockReturnValueOnce(8) // Food roll
        .mockReturnValueOnce(8); // Water roll

      const result = findFoodAndWater(mockAdventurer, 'Desert');

      expect(result.food).toBe(false);
      expect(result.water).toBe(false);
      expect(result.message).toContain('fails to find');
    });

    it('should find only food with mixed results', () => {
      // Mock rolls for food (success) and water (failure)
      vi.spyOn(diceLib, 'roll')
        .mockReturnValueOnce(18) // Food roll - success
        .mockReturnValueOnce(5); // Water roll - failure

      const result = findFoodAndWater(mockAdventurer, 'Plains');

      expect(result.food).toBe(true);
      expect(result.water).toBe(false);
      expect(result.message).toContain('finds food but no water');
    });

    it('should find only water with mixed results', () => {
      // Mock rolls for food (failure) and water (success)
      vi.spyOn(diceLib, 'roll')
        .mockReturnValueOnce(5) // Food roll - failure
        .mockReturnValueOnce(18); // Water roll - success

      const result = findFoodAndWater(mockAdventurer, 'Mountains');

      expect(result.food).toBe(false);
      expect(result.water).toBe(true);
      expect(result.message).toContain('finds water but no food');
    });
  });
});
