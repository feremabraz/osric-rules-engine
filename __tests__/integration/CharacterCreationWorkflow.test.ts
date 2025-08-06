/**
 * Character Creation Workflow Integration Tests - OSRIC Compliance
 * 
 * Tests the complete     it('should create a valid elf magic-user with racial adjustments', async () => {
      // Mock dice rolls for a valid Magic-User (INT 9+ required) 
      // Rolls: STR=12, DEX=13, CON=11, INT=15, WIS=14, CHA=13
      mockDiceRolls([4, 2, 6, 4, 3, 6, 3, 2, 6, 5, 4, 6, 5, 3, 6, 4, 3, 6]);

      const command = new CreateCharacterCommand({
        name: 'Elaria Starweaver',
        race: 'Elf',
        characterClass: 'Magic-User',
        abilityScoreMethod: 'standard3d6', // Use standard3d6 with mocked dice
        alignment: 'Chaotic Neutral',
      });on workflow:
 * - RuleChain + CreateCharacterCommand + All Rules integration
 * - Full OSRIC character creation process validation
 * - End-to-end workflow testing with OSRIC preservation
 */

import { createStore } from 'jotai';
import { type MockedFunction, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CreateCharacterCommand } from '../../osric/commands/character/CreateCharacterCommand';
import { GameContext } from '../../osric/core/GameContext';
import { RuleChain } from '../../osric/core/RuleChain';
import {
  AbilityScoreGenerationRule,
  ExceptionalStrengthRule,
  RacialAbilityAdjustmentRule,
} from '../../osric/rules/character/AbilityScoreGenerationRules';
import { ClassRequirementRule } from '../../osric/rules/character/ClassRequirementRules';
import type { AbilityScores } from '../../osric/types/entities';

describe('Character Creation Workflow Integration', () => {
  let context: GameContext;
  let ruleChain: RuleChain;
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
    context = new GameContext(store);
    // Configure RuleChain to NOT clear temporary data so we can inspect results
    ruleChain = new RuleChain({ clearTemporary: false });

    // Add rules to chain in correct order
    ruleChain.addRule(new AbilityScoreGenerationRule());
    ruleChain.addRule(new ExceptionalStrengthRule());
    ruleChain.addRule(new RacialAbilityAdjustmentRule());
    ruleChain.addRule(new ClassRequirementRule());

    // Mock Math.random to provide predictable dice rolls
    // This will give us consistent test results while still testing OSRIC logic
    vi.spyOn(Math, 'random');
  });

  afterEach(() => {
    // Clean up mocks after each test - this ensures fresh state
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  /**
   * Helper function to mock dice rolls for predictable ability scores
   * Takes an array of d6 values (1-6) and cycles through them
   */
  const mockDiceRolls = (rolls: number[]) => {
    // Clear any existing mock first
    vi.clearAllMocks();
    vi.restoreAllMocks();
    vi.spyOn(Math, 'random');

    let rollIndex = 0;
    (Math.random as MockedFunction<() => number>).mockImplementation(() => {
      const diceValue = rolls[rollIndex % rolls.length];
      // To get dice value N from Math.floor(Math.random() * 6) + 1,
      // Math.random() should return a value in range [(N-1)/6, N/6)
      // Use the middle of the range to avoid floating point precision issues
      const randomValue = (diceValue - 0.5) / 6;
      rollIndex++;
      return randomValue;
    });
  };

  describe('Complete Character Creation Workflow', () => {
    it('should create a valid human fighter using the complete workflow', async () => {
      // Mock dice rolls to ensure we get a valid fighter (STR 9+ required)
      // Rolls: STR=15 (5+4+6), DEX=12 (4+2+6), CON=14 (5+3+6), INT=10 (3+3+4), WIS=13 (4+3+6), CHA=11 (4+2+5)
      mockDiceRolls([5, 4, 6, 4, 2, 6, 5, 3, 6, 3, 3, 4, 4, 3, 6, 4, 2, 5]);

      const command = new CreateCharacterCommand({
        name: 'Sir Testington',
        race: 'Human',
        characterClass: 'Fighter',
        abilityScoreMethod: 'standard3d6', // Use standard3d6 with mocked dice
        alignment: 'Lawful Good',
      });

      // Execute command first to set up creation data
      const commandResult = await command.execute(context);
      expect(commandResult.success).toBe(true);

      // Then execute the rule chain
      const ruleResult = await ruleChain.execute(command, context);
      expect(ruleResult.success).toBe(true);

      // Verify all data is properly stored
      const creationData = context.getTemporary('character-creation');
      const generatedScores = context.getTemporary('generated-ability-scores');
      const adjustedScores = context.getTemporary('adjusted-ability-scores');

      expect(creationData).toBeDefined();
      expect(generatedScores).toBeDefined();
      expect(adjustedScores).toBeDefined();

      // For humans, adjusted scores should equal generated scores (no racial modifiers)
      expect(adjustedScores).toEqual(generatedScores);
    });

    it('should create a valid elf magic-user with racial adjustments', async () => {
      // Mock dice rolls for a valid Magic-User (INT 9+ required) with standard3d6
      // Rolls: STR=12, DEX=13, CON=11, INT=15, WIS=14, CHA=13
      mockDiceRolls([4, 2, 6, 4, 3, 6, 3, 2, 6, 5, 4, 6, 5, 3, 6, 4, 3, 6]);

      const command = new CreateCharacterCommand({
        name: 'Elaria Starweaver',
        race: 'Elf',
        characterClass: 'Magic-User',
        abilityScoreMethod: 'standard3d6', // Use standard3d6 with mocked dice
        alignment: 'Chaotic Neutral',
      });

      const commandResult = await command.execute(context);
      expect(commandResult.success).toBe(true);

      const ruleResult = await ruleChain.execute(command, context);
      expect(ruleResult.success).toBe(true);

      const generatedScores = context.getTemporary('generated-ability-scores') as AbilityScores;
      const adjustedScores = context.getTemporary('adjusted-ability-scores') as AbilityScores;

      expect(generatedScores).toBeTruthy();
      expect(adjustedScores).toBeTruthy();

      // Verify elf racial adjustments were applied
      expect(adjustedScores.dexterity).toBe(generatedScores.dexterity + 1);
      expect(adjustedScores.constitution).toBe(generatedScores.constitution - 1);

      // Other scores should remain unchanged
      expect(adjustedScores.strength).toBe(generatedScores.strength);
      expect(adjustedScores.intelligence).toBe(generatedScores.intelligence);
      expect(adjustedScores.wisdom).toBe(generatedScores.wisdom);
      expect(adjustedScores.charisma).toBe(generatedScores.charisma);
    });

    it('should handle fighter exceptional strength workflow', async () => {
      // Mock dice rolls for consistent testing
      mockDiceRolls([
        6,
        6,
        6, // STR = 16
        4,
        2,
        6, // DEX = 12
        5,
        3,
        6, // CON = 14
        3,
        3,
        4, // INT = 10
        3,
        2,
        6, // WIS = 11
        4,
        3,
        6, // CHA = 13
      ]);

      const command = new CreateCharacterCommand({
        name: 'Strong Fighter',
        race: 'Human',
        characterClass: 'Fighter',
        abilityScoreMethod: 'standard3d6',
        alignment: 'Lawful Good',
      });

      await command.execute(context);

      const ruleResult = await ruleChain.execute(command, context);
      expect(ruleResult.success).toBe(true);

      const generatedScores = context.getTemporary('generated-ability-scores') as AbilityScores;

      expect(generatedScores.strength).toBe(16);
      expect(generatedScores).toBeTruthy();
      expect(generatedScores.strength).toBeGreaterThanOrEqual(9); // Fighter minimum
    });

    it('should fail for invalid race/class ability combinations', async () => {
      // Mock dice rolls that will fail paladin requirements
      // Generate low scores that don't meet paladin minimums (STR 12, WIS 13, CHA 17, INT 9, CON 9)
      // STR=8, DEX=10, CON=8, INT=8, WIS=10, CHA=10 - all too low for paladin
      mockDiceRolls([2, 3, 3, 3, 3, 4, 2, 3, 3, 2, 3, 3, 3, 3, 4, 3, 3, 4]);

      const command = new CreateCharacterCommand({
        name: 'Weak Paladin',
        race: 'Human',
        characterClass: 'Paladin',
        abilityScoreMethod: 'standard3d6',
        alignment: 'Lawful Good',
      });

      await command.execute(context);

      const ruleResult = await ruleChain.execute(command, context);
      expect(ruleResult.success).toBe(false);
      expect(ruleResult.message).toContain('class requirements');
    });
  });

  describe('OSRIC Value Preservation Integration', () => {
    it('should preserve exact dwarf racial adjustments throughout workflow', async () => {
      // Mock dice rolls for dwarf fighter with good stats
      // STR=15, DEX=12, CON=14, INT=10, WIS=11, CHA=13
      mockDiceRolls([5, 4, 6, 4, 2, 6, 5, 3, 6, 3, 3, 4, 3, 2, 6, 4, 3, 6]);

      const command = new CreateCharacterCommand({
        name: 'Dwarf Fighter',
        race: 'Dwarf',
        characterClass: 'Fighter',
        abilityScoreMethod: 'standard3d6', // Use mocked dice instead of arranged
        alignment: 'Lawful Good',
      });

      await command.execute(context);

      const ruleResult = await ruleChain.execute(command, context);
      expect(ruleResult.success).toBe(true);

      const originalScores = context.getTemporary('generated-ability-scores') as AbilityScores;
      const adjustedScores = context.getTemporary('adjusted-ability-scores') as AbilityScores;

      expect(originalScores).toBeTruthy();
      expect(adjustedScores).toBeTruthy();

      // Verify exact OSRIC dwarf adjustments: +1 CON, -1 CHA
      expect(adjustedScores.constitution).toBe(originalScores.constitution + 1);
      expect(adjustedScores.charisma).toBe(originalScores.charisma - 1);

      // Other scores unchanged
      expect(adjustedScores.strength).toBe(originalScores.strength);
      expect(adjustedScores.dexterity).toBe(originalScores.dexterity);
      expect(adjustedScores.intelligence).toBe(originalScores.intelligence);
      expect(adjustedScores.wisdom).toBe(originalScores.wisdom);
    });

    it('should validate all class requirements match OSRIC exactly', async () => {
      const classTestCases = [
        {
          characterClass: 'Fighter' as const,
          diceRolls: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
        }, // STR=9, others=9
        {
          characterClass: 'Magic-User' as const,
          diceRolls: [3, 2, 4, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
        }, // STR=9, DEX=6, others=9, INT=9
        {
          characterClass: 'Cleric' as const,
          diceRolls: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
        }, // WIS=9, others=9
        {
          characterClass: 'Thief' as const,
          diceRolls: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
        }, // DEX=9, others=9
      ];

      for (const testCase of classTestCases) {
        // Set up specific dice rolls for this class's minimum requirements
        mockDiceRolls(testCase.diceRolls);

        const command = new CreateCharacterCommand({
          name: `Test ${testCase.characterClass}`,
          race: 'Human',
          characterClass: testCase.characterClass,
          abilityScoreMethod: 'standard3d6',
          alignment: 'Lawful Good',
        });

        await command.execute(context);

        const ruleResult = await ruleChain.execute(command, context);
        expect(ruleResult.success).toBe(true);
        expect(ruleResult.message).toContain(`meets requirements for ${testCase.characterClass}`);
      }
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle rule chain failures gracefully', async () => {
      // Mock dice rolls that will fail dwarf racial requirements
      // Dwarf requires: STR>=8, DEX>=3, CON>=12, INT>=3, WIS>=3, CHA>=3
      // CON=8 will fail (needs 12+), STR=15 is fine
      mockDiceRolls([5, 4, 6, 3, 3, 3, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]);

      const command = new CreateCharacterCommand({
        name: 'Test Character',
        race: 'Dwarf',
        characterClass: 'Fighter',
        abilityScoreMethod: 'standard3d6',
        alignment: 'Lawful Good',
      });

      await command.execute(context);

      const ruleResult = await ruleChain.execute(command, context);
      expect(ruleResult.success).toBe(false);
      expect(ruleResult.message).toContain('racial ability requirements');
    });

    it('should maintain context state consistency on failures', async () => {
      // Mock dice rolls that will fail paladin class requirements
      // STR=8 (too low), others adequate
      mockDiceRolls([2, 3, 3, 3, 3, 4, 3, 3, 4, 3, 3, 4, 3, 3, 4, 3, 3, 4]);

      const command = new CreateCharacterCommand({
        name: 'Test Character',
        race: 'Human',
        characterClass: 'Paladin',
        abilityScoreMethod: 'standard3d6',
        alignment: 'Lawful Good',
      });

      await command.execute(context);

      const ruleResult = await ruleChain.execute(command, context);
      expect(ruleResult.success).toBe(false);

      // Context should still have the creation data and generated scores
      expect(context.getTemporary('character-creation')).toBeDefined();
      expect(context.getTemporary('generated-ability-scores')).toBeDefined();
      // But should have adjusted scores from the successful racial adjustment rule
      expect(context.getTemporary('adjusted-ability-scores')).toBeDefined();
    });
  });
});
