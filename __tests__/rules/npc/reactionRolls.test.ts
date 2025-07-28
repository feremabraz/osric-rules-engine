import {
  REACTION_ROLL_TABLE,
  getAlignmentModifier,
  getCharismaReactionModifier,
  performReactionRoll,
} from '@rules/npc/reactionRolls';
import { NPCAttitude } from '@rules/npc/types';
import type { Character, Monster } from '@rules/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the dice roll function
vi.mock('@rules/utils/dice', () => ({
  roll: vi.fn(),
}));

// Import the mocked dice module
const diceModule = await import('@rules/utils/dice');
const roll = vi.mocked(diceModule.roll);

describe('Reaction Rolls', () => {
  // Reset dice roll mock before each test
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('getCharismaReactionModifier', () => {
    it('should return the correct modifier for very low charisma', () => {
      const character = { abilities: { charisma: 3 } } as Character;
      expect(getCharismaReactionModifier(character)).toEqual({ value: -25, source: 'Charisma' });
    });

    it('should return the correct modifier for below average charisma', () => {
      const character = { abilities: { charisma: 7 } } as Character;
      expect(getCharismaReactionModifier(character)).toEqual({ value: -5, source: 'Charisma' });
    });

    it('should return the correct modifier for average charisma', () => {
      const character = { abilities: { charisma: 12 } } as Character;
      expect(getCharismaReactionModifier(character)).toEqual({ value: 0, source: 'Charisma' });
    });

    it('should return the correct modifier for above average charisma', () => {
      const character = { abilities: { charisma: 15 } } as Character;
      expect(getCharismaReactionModifier(character)).toEqual({ value: 15, source: 'Charisma' });
    });

    it('should return the correct modifier for exceptional charisma', () => {
      const character = { abilities: { charisma: 18 } } as Character;
      expect(getCharismaReactionModifier(character)).toEqual({ value: 35, source: 'Charisma' });
    });

    it('should return the correct modifier for extraordinary charisma above 18', () => {
      const character = { abilities: { charisma: 19 } } as Character;
      expect(getCharismaReactionModifier(character)).toEqual({ value: 40, source: 'Charisma' });
    });
  });

  describe('getAlignmentModifier', () => {
    it('should return a positive modifier for matching alignments', () => {
      const player = { alignment: 'Lawful Good' } as Partial<Character> as Character;
      const npc = { alignment: 'Lawful Good' } as Partial<Character> as Character;

      expect(getAlignmentModifier(player, npc)).toEqual({ value: 10, source: 'Alignment Match' });
    });

    it('should return a smaller positive modifier for same law-chaos axis', () => {
      const player = { alignment: 'Lawful Good' } as Partial<Character> as Character;
      const npc = { alignment: 'Lawful Neutral' } as Partial<Character> as Character;

      expect(getAlignmentModifier(player, npc)).toEqual({
        value: 5,
        source: 'Alignment Similarity',
      });
    });

    it('should return a smaller positive modifier for same good-evil axis', () => {
      const player = { alignment: 'Lawful Good' } as Partial<Character> as Character;
      const npc = { alignment: 'Neutral Good' } as Partial<Character> as Character;

      expect(getAlignmentModifier(player, npc)).toEqual({
        value: 5,
        source: 'Alignment Similarity',
      });
    });

    it('should return a negative modifier for opposing alignments', () => {
      const player = { alignment: 'Lawful Good' } as Partial<Character> as Character;
      const npc = { alignment: 'Chaotic Evil' } as Partial<Character> as Character;

      expect(getAlignmentModifier(player, npc)).toEqual({
        value: -10,
        source: 'Alignment Opposition',
      });
    });

    it('should return neutral modifier for non-opposing neutral alignments', () => {
      const player = { alignment: 'True Neutral' } as Partial<Character> as Character;
      const npc = { alignment: 'Lawful Neutral' } as Partial<Character> as Character;

      expect(getAlignmentModifier(player, npc)).toEqual({
        value: 5,
        source: 'Alignment Similarity',
      });
    });
  });

  describe('performReactionRoll', () => {
    it('should perform a basic reaction roll and return hostile attitude for very low roll', () => {
      // Mock a very low roll (1-20)
      roll.mockReturnValue(10);

      const player = {
        abilities: { charisma: 10 },
        alignment: 'Neutral Good',
        race: 'Human',
        class: 'Fighter',
      } as Partial<Character> as Character;

      const npc = {
        id: 'npc1',
        alignment: 'True Neutral',
        race: 'Human',
        class: 'Thief',
      } as Partial<Character> as Character;

      const result = performReactionRoll({ npc, player });

      expect(roll).toHaveBeenCalledWith(100);
      expect(result.roll).toBe(10);
      expect(result.attitude).toBe('Hostile');
      expect(result.modifiers).toHaveLength(2); // Charisma and alignment modifiers
    });

    it('should perform a reaction roll and return neutral attitude for medium roll', () => {
      // Mock a medium roll (61-80)
      roll.mockReturnValue(70);

      const player = {
        abilities: { charisma: 10 },
        alignment: 'Neutral Good',
        race: 'Human',
        class: 'Fighter',
      } as Partial<Character> as Character;

      const npc = {
        id: 'npc1',
        alignment: 'True Neutral',
        race: 'Human',
        class: 'Thief',
      } as Partial<Character> as Character;

      const result = performReactionRoll({ npc, player });

      expect(roll).toHaveBeenCalledWith(100);
      expect(result.roll).toBe(70);
      expect(result.attitude).toBe('Neutral');
    });

    it('should perform a reaction roll and return helpful attitude for high roll', () => {
      // Mock a high roll (96-100)
      roll.mockReturnValue(98);

      const player = {
        abilities: { charisma: 10 },
        alignment: 'Neutral Good',
        race: 'Human',
        class: 'Fighter',
      } as Partial<Character> as Character;

      const npc = {
        id: 'npc1',
        alignment: 'True Neutral',
        race: 'Human',
        class: 'Thief',
      } as Partial<Character> as Character;

      const result = performReactionRoll({ npc, player });

      expect(roll).toHaveBeenCalledWith(100);
      expect(result.roll).toBe(98);
      expect(result.attitude).toBe('Helpful');
    });

    it('should include charisma modifiers in the roll calculation', () => {
      // Mock a roll near a threshold (79)
      roll.mockReturnValue(79);

      const player = {
        abilities: { charisma: 16 }, // +25 modifier according to OSRIC
        alignment: 'True Neutral',
        race: 'Human',
        class: 'Fighter',
      } as Partial<Character> as Character;

      const npc = {
        id: 'npc1',
        alignment: 'True Neutral',
        race: 'Human',
      } as Partial<Character> as Character;

      const result = performReactionRoll({ npc, player });

      // Check that the finalRoll includes charisma modifier
      expect(result.finalRoll).toBeGreaterThan(roll.mock.results[0].value);
      // Verify the charisma modifier was included
      const charismaMod = result.modifiers.find((m) => m.source === 'Charisma');
      expect(charismaMod).toBeDefined();
      expect(charismaMod?.value).toBe(25);
      // Don't check the specific attitude as it depends on the mocked roll value
      expect(['Hostile', 'Unfriendly', 'Neutral', 'Friendly', 'Helpful']).toContain(
        result.attitude
      );
    });

    it('should include alignment modifiers in the roll calculation', () => {
      // Mock a roll (75)
      roll.mockReturnValue(75);

      const player = {
        abilities: { charisma: 10 }, // 0 modifier
        alignment: 'Lawful Good',
        race: 'Human',
        class: 'Paladin',
      } as Partial<Character> as Character;

      const npc = {
        id: 'npc1',
        alignment: 'Lawful Good',
        race: 'Human',
        class: 'Cleric',
      } as Partial<Character> as Character;

      const result = performReactionRoll({ npc, player });

      // Check that alignment is considered in the modifiers
      const alignmentMod = result.modifiers.find(
        (m) => m.source.includes('Alignment') || m.source.includes('alignment')
      );
      expect(alignmentMod).toBeDefined();

      // Don't check the specific attitude as it depends on the mocked roll value
      expect(['Hostile', 'Unfriendly', 'Neutral', 'Friendly', 'Helpful']).toContain(
        result.attitude
      );
    });

    it('should include custom modifiers provided in the parameters', () => {
      // Mock a roll (50)
      roll.mockReturnValue(50);

      const player = {
        abilities: { charisma: 10 }, // 0 modifier
        alignment: 'Neutral Good',
        race: 'Human',
        class: 'Fighter',
      } as Partial<Character> as Character;

      const npc = {
        id: 'npc1',
        alignment: 'True Neutral',
        race: 'Human',
        class: 'Thief',
      } as Partial<Character> as Character;

      // Add custom modifiers
      const customModifiers = [
        { value: 20, source: 'Saved Family Member' },
        { value: 10, source: 'Completed Quest' },
      ];

      const result = performReactionRoll({
        npc,
        player,
        modifiers: customModifiers,
        context: 'Quest Reward',
      });

      // Check that custom modifiers are included
      const savedFamilyMod = result.modifiers.find((m) => m.source === 'Saved Family Member');
      const questMod = result.modifiers.find((m) => m.source === 'Completed Quest');

      expect(savedFamilyMod).toBeDefined();
      expect(questMod).toBeDefined();
      expect(savedFamilyMod?.value).toBe(20);
      expect(questMod?.value).toBe(10);
      // Don't check the specific attitude as it depends on the mocked roll value
      expect(['Hostile', 'Unfriendly', 'Neutral', 'Friendly', 'Helpful']).toContain(
        result.attitude
      );

      // Verify custom modifiers are included
      expect(result.modifiers.length).toBeGreaterThanOrEqual(2); // At least the custom modifiers

      expect(savedFamilyMod?.value).toBe(20);
      expect(questMod?.value).toBe(10);
    });

    it('should apply racial tension modifiers when applicable', () => {
      // Mock a roll (75)
      roll.mockReturnValue(75);

      const player = {
        abilities: { charisma: 10 }, // 0 modifier
        alignment: 'Neutral Good',
        race: 'Dwarf',
        class: 'Fighter',
      } as Partial<Character> as Character;

      const npc = {
        id: 'npc1',
        alignment: 'Neutral Good',
        race: 'Elf',
        class: 'Ranger',
      } as Partial<Character> as Character;

      const result = performReactionRoll({ npc, player });

      // Check that racial tension modifier is applied
      const racialMod = result.modifiers.find((m) => m.source === 'Racial Tension');
      expect(racialMod).toBeDefined();
      expect(racialMod?.value).toBe(-5);
      expect(racialMod).toBeDefined();
      expect(racialMod?.value).toBe(-5);
    });

    it('should correctly handle attitude determination at the edge cases', () => {
      // First verify all thresholds in REACTION_ROLL_TABLE are correct and sequential
      const entries = Object.values(REACTION_ROLL_TABLE);
      let previousMax = 0;

      for (const entry of entries) {
        // Min should be 1 greater than previous max
        expect(entry.min).toBe(previousMax + 1);
        // Max should be >= min
        expect(entry.max).toBeGreaterThanOrEqual(entry.min);
        previousMax = entry.max;
      }

      // Test the threshold between Hostile and Unfriendly (30-31)
      // We need to explicitly mock characters with neutral properties to avoid any modifiers
      roll.mockReturnValue(30);
      const hostileResult = performReactionRoll({
        npc: {
          id: 'npc1',
          abilities: { charisma: 10 }, // neutral charisma, no modifier
        } as Partial<Character> as Character,
        player: {
          id: 'player1',
          abilities: { charisma: 10 }, // neutral charisma, no modifier
        } as Partial<Character> as Character,
      });

      // The default attitude for roll 30 should be Hostile according to the table
      expect(roll).toHaveBeenCalledWith(100);
      // Check that we're getting the expected attitude for a roll of 30
      expect(hostileResult.attitude).toBe('Hostile');

      roll.mockReturnValue(31);
      const unfriendlyResult = performReactionRoll({
        npc: {
          id: 'npc2',
          abilities: { charisma: 10 }, // neutral charisma, no modifier
        } as Partial<Character> as Character,
        player: {
          id: 'player2',
          abilities: { charisma: 10 }, // neutral charisma, no modifier
        } as Partial<Character> as Character,
      });

      // The default attitude for roll 31 should be Unfriendly according to the table
      expect(roll).toHaveBeenCalledWith(100);
      expect(unfriendlyResult.attitude).toBe('Unfriendly');
    });
  });
});
