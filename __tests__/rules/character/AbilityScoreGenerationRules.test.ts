/**
 * AbilityScoreGenerationRules Tests - OSRIC Compliance
 *
 * Tests the three individual rules from AbilityScoreGenerationRules.ts:
 * - AbilityScoreGenerationRule (3 OSRIC methods)
 * - ExceptionalStrengthRule (fighter 18/xx strength)
 * - RacialAbilityAdjustmentRule (all racial modifiers)
 */

import { createStore } from 'jotai';
import { beforeEach, describe, expect, it } from 'vitest';
import { GameContext } from '../../../osric/core/GameContext';
import {
  AbilityScoreGenerationRule,
  ExceptionalStrengthRule,
  RacialAbilityAdjustmentRule,
} from '../../../osric/rules/character/AbilityScoreGenerationRules';
import type { AbilityScores } from '../../../osric/types/entities';

// Mock command that implements the Command interface
class MockCharacterCommand {
  readonly type = 'create-character';
  readonly actorId = 'test-actor';
  readonly targetIds: string[] = [];

  async execute(_context: GameContext) {
    return { success: true, message: 'Mock command executed' };
  }

  canExecute(_context: GameContext): boolean {
    return true;
  }

  getRequiredRules(): string[] {
    return ['ability-score-generation', 'exceptional-strength', 'racial-ability-adjustments'];
  }

  getInvolvedEntities(): string[] {
    return [this.actorId, ...this.targetIds];
  }
}

describe('AbilityScoreGenerationRules', () => {
  let context: GameContext;
  let store: ReturnType<typeof createStore>;
  let mockCommand: MockCharacterCommand;

  beforeEach(() => {
    store = createStore();
    context = new GameContext(store);
    mockCommand = new MockCharacterCommand();
  });

  describe('AbilityScoreGenerationRule', () => {
    it('should generate valid ability scores with standard3d6', async () => {
      // Set up character creation data
      context.setTemporary('character-creation', {
        name: 'Test Fighter',
        race: 'Human',
        characterClass: 'Fighter',
        abilityScoreMethod: 'standard3d6',
        alignment: 'Lawful Good',
      });

      const rule = new AbilityScoreGenerationRule();
      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Generated ability scores using standard3d6');

      const abilityScores = context.getTemporary('generated-ability-scores') as AbilityScores;
      expect(abilityScores).toBeDefined();

      // Verify all ability scores are in valid range (3-18)
      expect(abilityScores.strength).toBeGreaterThanOrEqual(3);
      expect(abilityScores.strength).toBeLessThanOrEqual(18);
      expect(abilityScores.dexterity).toBeGreaterThanOrEqual(3);
      expect(abilityScores.dexterity).toBeLessThanOrEqual(18);
      expect(abilityScores.constitution).toBeGreaterThanOrEqual(3);
      expect(abilityScores.constitution).toBeLessThanOrEqual(18);
      expect(abilityScores.intelligence).toBeGreaterThanOrEqual(3);
      expect(abilityScores.intelligence).toBeLessThanOrEqual(18);
      expect(abilityScores.wisdom).toBeGreaterThanOrEqual(3);
      expect(abilityScores.wisdom).toBeLessThanOrEqual(18);
      expect(abilityScores.charisma).toBeGreaterThanOrEqual(3);
      expect(abilityScores.charisma).toBeLessThanOrEqual(18);
    });

    it('should generate scores with arranged3d6 method', async () => {
      context.setTemporary('character-creation', {
        name: 'Test Character',
        race: 'Human',
        characterClass: 'Fighter',
        abilityScoreMethod: 'arranged3d6',
        alignment: 'Lawful Good',
      });

      const rule = new AbilityScoreGenerationRule();
      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Generated ability scores using arranged3d6');

      const abilityScores = context.getTemporary('generated-ability-scores') as AbilityScores;
      expect(abilityScores).toBeDefined();

      // All scores should be in valid range
      for (const score of Object.values(abilityScores)) {
        expect(score).toBeGreaterThanOrEqual(3);
        expect(score).toBeLessThanOrEqual(18);
      }
    });

    it('should generate higher scores with 4d6dropLowest method', async () => {
      context.setTemporary('character-creation', {
        name: 'Test Character',
        race: 'Human',
        characterClass: 'Fighter',
        abilityScoreMethod: '4d6dropLowest',
        alignment: 'Lawful Good',
      });

      const rule = new AbilityScoreGenerationRule();
      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Generated ability scores using 4d6dropLowest');

      const abilityScores = context.getTemporary('generated-ability-scores') as AbilityScores;
      expect(abilityScores).toBeDefined();

      // 4d6 drop lowest should generally produce higher scores
      const totalScore = Object.values(abilityScores).reduce((sum, score) => sum + score, 0);
      expect(totalScore).toBeGreaterThan(60); // Should be higher than 3d6 average
    });

    it('should only apply to create-character commands with ability score method', async () => {
      const rule = new AbilityScoreGenerationRule();

      // Test with wrong command type
      const wrongCommand = { ...mockCommand, type: 'attack' };
      expect(rule.canApply(context, wrongCommand as unknown as typeof mockCommand)).toBe(false);

      // Test with correct command type but no data
      expect(rule.canApply(context, mockCommand)).toBe(false);

      // Test with correct command type and data
      context.setTemporary('character-creation', { abilityScoreMethod: 'standard3d6' });
      expect(rule.canApply(context, mockCommand)).toBe(true);
    });
  });

  describe('ExceptionalStrengthRule', () => {
    it('should apply exceptional strength to fighters with 18 strength', async () => {
      // Set up data for exceptional strength test
      context.setTemporary('character-creation', {
        characterClass: 'Fighter',
        race: 'Human',
      });
      context.setTemporary('generated-ability-scores', {
        strength: 18,
        dexterity: 12,
        constitution: 14,
        intelligence: 10,
        wisdom: 11,
        charisma: 13,
      });

      const rule = new ExceptionalStrengthRule();
      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('exceptional strength');

      const exceptionalStrength = context.getTemporary('exceptional-strength');
      expect(exceptionalStrength).toBeGreaterThanOrEqual(1);
      expect(exceptionalStrength).toBeLessThanOrEqual(100);
    });

    it('should apply to paladins and rangers with 18 strength', async () => {
      const testClasses = ['Paladin', 'Ranger'];

      for (const characterClass of testClasses) {
        context.setTemporary('character-creation', {
          characterClass,
          race: 'Human',
        });
        context.setTemporary('generated-ability-scores', {
          strength: 18,
          dexterity: 12,
          constitution: 14,
          intelligence: 10,
          wisdom: 11,
          charisma: 13,
        });

        const rule = new ExceptionalStrengthRule();
        const result = await rule.execute(context, mockCommand);

        expect(result.success).toBe(true);
        expect(result.message).toContain('exceptional strength');

        const exceptionalStrength = context.getTemporary('exceptional-strength');
        expect(exceptionalStrength).toBeGreaterThanOrEqual(1);
        expect(exceptionalStrength).toBeLessThanOrEqual(100);
      }
    });

    it('should not apply to non-fighter classes with 18 strength', async () => {
      const nonFighterClasses = ['Magic-User', 'Cleric', 'Thief'];

      for (const characterClass of nonFighterClasses) {
        context.setTemporary('character-creation', {
          characterClass,
          race: 'Human',
        });
        context.setTemporary('generated-ability-scores', {
          strength: 18,
          dexterity: 12,
          constitution: 14,
          intelligence: 16,
          wisdom: 11,
          charisma: 13,
        });

        const rule = new ExceptionalStrengthRule();

        // Rule should not apply
        expect(rule.canApply(context, mockCommand)).toBe(false);
      }
    });

    it('should not apply to fighters with strength less than 18', async () => {
      context.setTemporary('character-creation', {
        characterClass: 'Fighter',
        race: 'Human',
      });
      context.setTemporary('generated-ability-scores', {
        strength: 17, // Below 18
        dexterity: 12,
        constitution: 14,
        intelligence: 10,
        wisdom: 11,
        charisma: 13,
      });

      const rule = new ExceptionalStrengthRule();
      expect(rule.canApply(context, mockCommand)).toBe(false);
    });
  });

  describe('RacialAbilityAdjustmentRule', () => {
    it('should apply elf racial adjustments correctly (+1 DEX, -1 CON)', async () => {
      context.setTemporary('character-creation', {
        race: 'Elf',
        characterClass: 'Fighter',
      });

      const originalScores: AbilityScores = {
        strength: 15,
        dexterity: 12,
        constitution: 14,
        intelligence: 16,
        wisdom: 13,
        charisma: 11,
      };
      context.setTemporary('generated-ability-scores', originalScores);

      const rule = new RacialAbilityAdjustmentRule();
      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Applied racial adjustments for Elf');

      const adjustedScores = context.getTemporary('adjusted-ability-scores') as AbilityScores;
      expect(adjustedScores.dexterity).toBe(originalScores.dexterity + 1); // +1 DEX
      expect(adjustedScores.constitution).toBe(originalScores.constitution - 1); // -1 CON

      // Other scores unchanged
      expect(adjustedScores.strength).toBe(originalScores.strength);
      expect(adjustedScores.intelligence).toBe(originalScores.intelligence);
      expect(adjustedScores.wisdom).toBe(originalScores.wisdom);
      expect(adjustedScores.charisma).toBe(originalScores.charisma);
    });

    it('should apply dwarf racial adjustments correctly (+1 CON, -1 CHA)', async () => {
      context.setTemporary('character-creation', {
        race: 'Dwarf',
        characterClass: 'Fighter',
      });

      const originalScores: AbilityScores = {
        strength: 15,
        dexterity: 12,
        constitution: 14,
        intelligence: 10,
        wisdom: 13,
        charisma: 11,
      };
      context.setTemporary('generated-ability-scores', originalScores);

      const rule = new RacialAbilityAdjustmentRule();
      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Applied racial adjustments for Dwarf');

      const adjustedScores = context.getTemporary('adjusted-ability-scores') as AbilityScores;
      expect(adjustedScores.constitution).toBe(originalScores.constitution + 1); // +1 CON
      expect(adjustedScores.charisma).toBe(originalScores.charisma - 1); // -1 CHA
    });

    it('should fail if character does not meet racial requirements', async () => {
      context.setTemporary('character-creation', {
        race: 'Dwarf',
        characterClass: 'Fighter',
      });

      // Set scores that don't meet dwarf requirements
      context.setTemporary('generated-ability-scores', {
        strength: 7, // Below dwarf requirement (8+)
        dexterity: 10,
        constitution: 11, // Below dwarf requirement (12+)
        intelligence: 10,
        wisdom: 10,
        charisma: 10,
      });

      const rule = new RacialAbilityAdjustmentRule();
      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('racial ability requirements');
      expect(result.message).toContain('Dwarf');
    });

    it('should preserve exact OSRIC racial ability adjustments', async () => {
      const testCases = [
        { race: 'Dwarf', expectedCon: +1, expectedCha: -1 },
        { race: 'Elf', expectedDex: +1, expectedCon: -1 },
        { race: 'Halfling', expectedStr: -1, expectedDex: +1 },
        { race: 'Half-Orc', expectedStr: +1, expectedCon: +1, expectedCha: -2 },
      ];

      const rule = new RacialAbilityAdjustmentRule();

      for (const testCase of testCases) {
        const baseScores: AbilityScores = {
          strength: 15,
          dexterity: 15,
          constitution: 15,
          intelligence: 15,
          wisdom: 15,
          charisma: 15,
        };

        context.setTemporary('character-creation', {
          race: testCase.race,
          characterClass: 'Fighter',
        });
        context.setTemporary('generated-ability-scores', baseScores);

        const result = await rule.execute(context, mockCommand);
        expect(result.success).toBe(true);

        const adjusted = context.getTemporary('adjusted-ability-scores') as AbilityScores;

        if (testCase.expectedStr) {
          expect(adjusted.strength).toBe(baseScores.strength + testCase.expectedStr);
        }
        if (testCase.expectedDex) {
          expect(adjusted.dexterity).toBe(baseScores.dexterity + testCase.expectedDex);
        }
        if (testCase.expectedCon) {
          expect(adjusted.constitution).toBe(baseScores.constitution + testCase.expectedCon);
        }
        if (testCase.expectedCha) {
          expect(adjusted.charisma).toBe(baseScores.charisma + testCase.expectedCha);
        }
      }
    });

    it('should not apply to humans (no racial adjustments)', async () => {
      const originalScores: AbilityScores = {
        strength: 15,
        dexterity: 12,
        constitution: 14,
        intelligence: 16,
        wisdom: 13,
        charisma: 11,
      };

      context.setTemporary('character-creation', {
        race: 'Human',
        characterClass: 'Fighter',
      });
      context.setTemporary('generated-ability-scores', originalScores);

      const rule = new RacialAbilityAdjustmentRule();
      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Applied racial adjustments for Human');

      const adjustedScores = context.getTemporary('adjusted-ability-scores') as AbilityScores;
      // All scores should remain unchanged for humans
      expect(adjustedScores).toEqual(originalScores);
    });
  });
});
