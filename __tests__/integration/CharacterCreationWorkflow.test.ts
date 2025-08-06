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

    ruleChain = new RuleChain({ clearTemporary: false });

    ruleChain.addRule(new AbilityScoreGenerationRule());
    ruleChain.addRule(new ExceptionalStrengthRule());
    ruleChain.addRule(new RacialAbilityAdjustmentRule());
    ruleChain.addRule(new ClassRequirementRule());

    vi.spyOn(Math, 'random');
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  const mockDiceRolls = (rolls: number[]) => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    vi.spyOn(Math, 'random');

    let rollIndex = 0;
    (Math.random as MockedFunction<() => number>).mockImplementation(() => {
      const diceValue = rolls[rollIndex % rolls.length];

      const randomValue = (diceValue - 0.5) / 6;
      rollIndex++;
      return randomValue;
    });
  };

  describe('Complete Character Creation Workflow', () => {
    it('should create a valid human fighter using the complete workflow', async () => {
      mockDiceRolls([5, 4, 6, 4, 2, 6, 5, 3, 6, 3, 3, 4, 4, 3, 6, 4, 2, 5]);

      const command = new CreateCharacterCommand({
        name: 'Sir Testington',
        race: 'Human',
        characterClass: 'Fighter',
        abilityScoreMethod: 'standard3d6',
        alignment: 'Lawful Good',
      });

      const commandResult = await command.execute(context);
      expect(commandResult.success).toBe(true);

      const ruleResult = await ruleChain.execute(command, context);
      expect(ruleResult.success).toBe(true);

      const creationData = context.getTemporary('character-creation');
      const generatedScores = context.getTemporary('generated-ability-scores');
      const adjustedScores = context.getTemporary('adjusted-ability-scores');

      expect(creationData).toBeDefined();
      expect(generatedScores).toBeDefined();
      expect(adjustedScores).toBeDefined();

      expect(adjustedScores).toEqual(generatedScores);
    });

    it('should create a valid elf magic-user with racial adjustments', async () => {
      mockDiceRolls([4, 2, 6, 4, 3, 6, 3, 2, 6, 5, 4, 6, 5, 3, 6, 4, 3, 6]);

      const command = new CreateCharacterCommand({
        name: 'Elaria Starweaver',
        race: 'Elf',
        characterClass: 'Magic-User',
        abilityScoreMethod: 'standard3d6',
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

      expect(adjustedScores.dexterity).toBe(generatedScores.dexterity + 1);
      expect(adjustedScores.constitution).toBe(generatedScores.constitution - 1);

      expect(adjustedScores.strength).toBe(generatedScores.strength);
      expect(adjustedScores.intelligence).toBe(generatedScores.intelligence);
      expect(adjustedScores.wisdom).toBe(generatedScores.wisdom);
      expect(adjustedScores.charisma).toBe(generatedScores.charisma);
    });

    it('should handle fighter exceptional strength workflow', async () => {
      mockDiceRolls([6, 6, 6, 4, 2, 6, 5, 3, 6, 3, 3, 4, 3, 2, 6, 4, 3, 6]);

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
      expect(generatedScores.strength).toBeGreaterThanOrEqual(9);
    });

    it('should fail for invalid race/class ability combinations', async () => {
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
      mockDiceRolls([5, 4, 6, 4, 2, 6, 5, 3, 6, 3, 3, 4, 3, 2, 6, 4, 3, 6]);

      const command = new CreateCharacterCommand({
        name: 'Dwarf Fighter',
        race: 'Dwarf',
        characterClass: 'Fighter',
        abilityScoreMethod: 'standard3d6',
        alignment: 'Lawful Good',
      });

      await command.execute(context);

      const ruleResult = await ruleChain.execute(command, context);
      expect(ruleResult.success).toBe(true);

      const originalScores = context.getTemporary('generated-ability-scores') as AbilityScores;
      const adjustedScores = context.getTemporary('adjusted-ability-scores') as AbilityScores;

      expect(originalScores).toBeTruthy();
      expect(adjustedScores).toBeTruthy();

      expect(adjustedScores.constitution).toBe(originalScores.constitution + 1);
      expect(adjustedScores.charisma).toBe(originalScores.charisma - 1);

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
        },
        {
          characterClass: 'Magic-User' as const,
          diceRolls: [3, 2, 4, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
        },
        {
          characterClass: 'Cleric' as const,
          diceRolls: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
        },
        {
          characterClass: 'Thief' as const,
          diceRolls: [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
        },
      ];

      for (const testCase of classTestCases) {
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

      expect(context.getTemporary('character-creation')).toBeDefined();
      expect(context.getTemporary('generated-ability-scores')).toBeDefined();

      expect(context.getTemporary('adjusted-ability-scores')).toBeDefined();
    });
  });
});
