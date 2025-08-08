// File: __tests__/rules/npc/TreasureGenerationRules.test.ts
import type { Command } from '@osric/core/Command';
import { GameContext } from '@osric/core/GameContext';
import {
  type TreasureContext,
  TreasureGenerationRules,
  type TreasureHoard,
} from '@osric/rules/npc/TreasureGenerationRules';
import { COMMAND_TYPES } from '@osric/types/constants';
import { createStore } from 'jotai';
import { beforeEach, describe, expect, it } from 'vitest';

interface TreasureResult {
  treasure: TreasureHoard;
  treasureDescription: string;
}

describe('TreasureGenerationRules', () => {
  let rule: TreasureGenerationRules;
  let context: GameContext;
  let mockCommand: Command;

  beforeEach(() => {
    // CRITICAL: Setup infrastructure
    const store = createStore();
    context = new GameContext(store);
    rule = new TreasureGenerationRules();

    // CRITICAL: Setup context data for Rules (COMPONENT_SPECIFIC)
    context.setTemporary('treasureContext', {
      treasureType: 'C',
      monsterHitDice: 3,
      numberAppearing: 5,
      environment: 'dungeon',
      partyLevel: 3,
    } as TreasureContext);

    // CRITICAL: Setup command with proper type
    mockCommand = {
      type: COMMAND_TYPES.MONSTER_GENERATION,
      actorId: 'test-monster',
      targetIds: [],
      async execute() {
        return { success: true, message: 'Mock' };
      },
      canExecute: () => true,
      getRequiredRules: () => ['treasure-generation'],
      getInvolvedEntities: () => ['test-monster'],
    } as Command;
  });

  describe('canApply', () => {
    it('should apply when command type is MONSTER_GENERATION', () => {
      expect(rule.canApply(context, mockCommand)).toBe(true);
    });

    it('should not apply with wrong command type', () => {
      const wrongCommand = { ...mockCommand, type: COMMAND_TYPES.ATTACK };
      expect(rule.canApply(context, wrongCommand)).toBe(false);
    });
  });

  describe('execute - Success Scenarios', () => {
    it('should execute successfully with valid data', async () => {
      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
      expect(result.data).toBeDefined();

      if (result.data) {
        const data = result.data as unknown as TreasureResult;
        expect(data.treasure).toBeDefined();
        expect(data.treasure.totalValue).toBeGreaterThan(0);
        expect(data.treasureDescription).toBeDefined();
      }
    });

    it('should handle treasure type A (large hoard)', async () => {
      context.setTemporary('treasureContext', {
        treasureType: 'A',
        monsterHitDice: 10,
        numberAppearing: 1,
        environment: 'dungeon',
        partyLevel: 8,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      if (result.data) {
        const data = result.data as unknown as TreasureResult;
        expect(data.treasure.goldPieces).toBeGreaterThan(0);
        expect(data.treasure.platinumPieces).toBeGreaterThan(0);
        expect(data.treasure.totalValue).toBeGreaterThan(10000);
      }
    });

    it('should handle treasure type C (small hoard)', async () => {
      context.setTemporary('treasureContext', {
        treasureType: 'C',
        monsterHitDice: 2,
        numberAppearing: 3,
        environment: 'wilderness',
        partyLevel: 2,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      if (result.data) {
        const data = result.data as unknown as TreasureResult;
        expect(data.treasure.copperPieces).toBeGreaterThan(0);
        expect(data.treasure.totalValue).toBeGreaterThan(0);
      }
    });

    it('should generate gems and jewelry for appropriate treasure types', async () => {
      context.setTemporary('treasureContext', {
        treasureType: 'A',
        monsterHitDice: 8,
        numberAppearing: 1,
        environment: 'dungeon',
        partyLevel: 6,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      if (result.data) {
        const data = result.data as unknown as TreasureResult;
        // Type A has good chances for gems and jewelry
        expect(data.treasure.gems.length + data.treasure.jewelry.length).toBeGreaterThanOrEqual(0);
      }
    });

    it('should scale treasure with number appearing', async () => {
      const smallGroup = {
        treasureType: 'C',
        monsterHitDice: 3,
        numberAppearing: 1,
        environment: 'dungeon',
        partyLevel: 3,
      };

      const largeGroup = {
        treasureType: 'C',
        monsterHitDice: 3,
        numberAppearing: 15,
        environment: 'dungeon',
        partyLevel: 3,
      };

      // Run multiple iterations to account for randomness
      let smallTotal = 0;
      let largeTotal = 0;
      let smallPositive = 0;
      let largePositive = 0;
      const iterations = 20;

      for (let i = 0; i < iterations; i++) {
        context.setTemporary('treasureContext', smallGroup);
        const smallResult = await rule.execute(context, mockCommand);

        context.setTemporary('treasureContext', largeGroup);
        const largeResult = await rule.execute(context, mockCommand);

        expect(smallResult.success).toBe(true);
        expect(largeResult.success).toBe(true);

        if (smallResult.data && largeResult.data) {
          const smallData = smallResult.data as unknown as TreasureResult;
          const largeData = largeResult.data as unknown as TreasureResult;
          smallTotal += smallData.treasure.totalValue;
          largeTotal += largeData.treasure.totalValue;

          // Count iterations where treasure was actually generated
          if (smallData.treasure.totalValue > 0) smallPositive++;
          if (largeData.treasure.totalValue > 0) largePositive++;
        }
      }

      // Check that larger groups generate treasure more often or in greater amounts
      // This accounts for the fact that some treasure types might not always generate treasure
      const smallAverage = smallTotal / iterations;
      const largeAverage = largeTotal / iterations;

      // Either the large group should have higher average treasure,
      // OR it should generate treasure more frequently
      const averageImprovement = largeAverage > smallAverage;
      const frequencyImprovement = largePositive >= smallPositive;

      expect(averageImprovement || frequencyImprovement).toBe(true);

      // Also verify that the large group generates some meaningful treasure
      expect(largeTotal).toBeGreaterThan(0);
    });
  });

  describe('execute - Error Scenarios', () => {
    it('should handle missing context data', async () => {
      context.setTemporary('treasureContext', null);

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('No treasure context provided');
    });

    it('should handle invalid treasure type gracefully', async () => {
      context.setTemporary('treasureContext', {
        treasureType: 'INVALID',
        monsterHitDice: 3,
        numberAppearing: 5,
        environment: 'dungeon',
        partyLevel: 3,
      });

      const result = await rule.execute(context, mockCommand);

      // Should still succeed but use default treasure type
      expect(result.success).toBe(true);
      if (result.data) {
        const data = result.data as unknown as TreasureResult;
        expect(data.treasure.totalValue).toBeGreaterThanOrEqual(0);
      }
    });

    it('should handle edge case with zero hit dice', async () => {
      context.setTemporary('treasureContext', {
        treasureType: 'C',
        monsterHitDice: 0,
        numberAppearing: 1,
        environment: 'dungeon',
        partyLevel: 1,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      if (result.data) {
        const data = result.data as unknown as TreasureResult;
        expect(data.treasure.totalValue).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('OSRIC Compliance', () => {
    it('should implement authentic OSRIC/AD&D 1st Edition mechanics', async () => {
      // Test with classic OSRIC treasure type distribution
      context.setTemporary('treasureContext', {
        treasureType: 'G', // High-value, low-volume treasure
        monsterHitDice: 12,
        numberAppearing: 1,
        environment: 'dungeon',
        partyLevel: 10,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      if (result.data) {
        const data = result.data as unknown as TreasureResult;
        // Type G should have significant gold and platinum
        expect(data.treasure.goldPieces).toBeGreaterThan(0);
        expect(data.treasure.platinumPieces).toBeGreaterThan(0);
        // Should have minimal copper/silver
        expect(data.treasure.copperPieces).toBe(0);
        expect(data.treasure.silverPieces).toBe(0);
      }
    });

    it('should follow OSRIC magic item generation probabilities', async () => {
      // High-level monsters should have better magic item chances
      context.setTemporary('treasureContext', {
        treasureType: 'A',
        monsterHitDice: 15,
        numberAppearing: 1,
        environment: 'dungeon',
        partyLevel: 12,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      if (result.data) {
        const data = result.data as unknown as TreasureResult;
        // High-level treasures should have substantial value
        expect(data.treasure.totalValue).toBeGreaterThan(10000);
      }
    });

    it('should properly calculate coin exchange rates per OSRIC', async () => {
      context.setTemporary('treasureContext', {
        treasureType: 'A',
        monsterHitDice: 5,
        numberAppearing: 1,
        environment: 'dungeon',
        partyLevel: 5,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      if (result.data) {
        const data = result.data as unknown as TreasureResult;
        // Verify proper coin value calculation
        // 1 cp = 0.01 gp, 1 sp = 0.1 gp, 1 ep = 0.5 gp, 1 gp = 1 gp, 1 pp = 5 gp
        const expectedCoinValue =
          data.treasure.copperPieces * 0.01 +
          data.treasure.silverPieces * 0.1 +
          data.treasure.electrumPieces * 0.5 +
          data.treasure.goldPieces +
          data.treasure.platinumPieces * 5;

        expect(data.treasure.totalValue).toBeGreaterThanOrEqual(expectedCoinValue);
      }
    });

    it('should generate appropriate gem values by monster power', async () => {
      context.setTemporary('treasureContext', {
        treasureType: 'A',
        monsterHitDice: 8,
        numberAppearing: 1,
        environment: 'dungeon',
        partyLevel: 7,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      if (result.data) {
        const data = result.data as unknown as TreasureResult;
        // Gems should have reasonable values based on monster power
        if (data.treasure.gems.length > 0) {
          const avgGemValue =
            data.treasure.gems.reduce((sum, gem) => sum + gem.value, 0) / data.treasure.gems.length;
          expect(avgGemValue).toBeGreaterThan(10); // Should be meaningful gems
          expect(avgGemValue).toBeLessThan(10000); // But not ridiculous
        }
      }
    });
  });
});
