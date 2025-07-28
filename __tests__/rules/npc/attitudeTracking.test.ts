import type { Character } from '@/rules/types';
import {
  NPCAttitudeManager,
  describeAttitude,
  getAttitudeBasedDialogue,
} from '@rules/npc/attitudeTracking';
import { performReactionRoll } from '@rules/npc/reactionRolls';
import type { NPCAttitude } from '@rules/npc/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the performReactionRoll function
vi.mock('@rules/npc/reactionRolls', () => ({
  performReactionRoll: vi.fn(),
}));

// Mock the Date.now function to return a predictable value
const mockDate = new Date('2025-01-01T12:00:00Z');
const mockTimestamp = mockDate.getTime();

describe('NPCAttitudeManager', () => {
  let attitudeManager: NPCAttitudeManager;

  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();

    // Mock Date.now
    vi.spyOn(Date, 'now').mockImplementation(() => mockTimestamp);

    // Create a fresh attitude manager for each test
    attitudeManager = new NPCAttitudeManager();
  });

  describe('setAttitude', () => {
    it('should create a new attitude record when none exists', () => {
      const record = attitudeManager.setAttitude('npc1', 'player1', 'Friendly', 'First meeting');

      expect(record).toEqual({
        npcId: 'npc1',
        targetId: 'player1',
        attitude: 'Friendly',
        notes: 'First meeting',
        lastInteractionTime: mockTimestamp,
      });
    });

    it('should update an existing attitude record', () => {
      // Create initial record
      attitudeManager.setAttitude('npc1', 'player1', 'Neutral', 'Initial meeting');

      // Update the record
      const updatedRecord = attitudeManager.setAttitude(
        'npc1',
        'player1',
        'Friendly',
        'After receiving gift'
      );

      expect(updatedRecord).toEqual({
        npcId: 'npc1',
        targetId: 'player1',
        attitude: 'Friendly',
        notes: 'After receiving gift',
        lastInteractionTime: mockTimestamp,
      });
    });

    it('should preserve notes when updating without new notes', () => {
      // Create initial record with notes
      attitudeManager.setAttitude('npc1', 'player1', 'Neutral', 'Initial meeting');

      // Update attitude without changing notes
      const updatedRecord = attitudeManager.setAttitude('npc1', 'player1', 'Friendly');

      expect(updatedRecord.attitude).toBe('Friendly');
      expect(updatedRecord.notes).toBe('Initial meeting'); // Original notes preserved
    });
  });

  describe('getAttitude', () => {
    it('should return the correct attitude for an NPC and target', () => {
      attitudeManager.setAttitude('npc1', 'player1', 'Friendly');

      const attitude = attitudeManager.getAttitude('npc1', 'player1');

      expect(attitude).toBe('Friendly');
    });

    it('should return null when no attitude record exists', () => {
      const attitude = attitudeManager.getAttitude('nonexistent', 'player1');

      expect(attitude).toBeNull();
    });
  });

  describe('getAllAttitudesForNPC', () => {
    it('should return all attitude records for a specific NPC', () => {
      // Set up multiple attitudes for an NPC
      attitudeManager.setAttitude('npc1', 'player1', 'Friendly');
      attitudeManager.setAttitude('npc1', 'player2', 'Unfriendly');
      attitudeManager.setAttitude('npc2', 'player1', 'Hostile');

      const npc1Attitudes = attitudeManager.getAllAttitudesForNPC('npc1');

      expect(npc1Attitudes).toHaveLength(2);
      expect(npc1Attitudes.find((r) => r.targetId === 'player1')?.attitude).toBe('Friendly');
      expect(npc1Attitudes.find((r) => r.targetId === 'player2')?.attitude).toBe('Unfriendly');
    });

    it('should return an empty array when no attitudes exist for the NPC', () => {
      const attitudes = attitudeManager.getAllAttitudesForNPC('nonexistent');

      expect(attitudes).toEqual([]);
    });
  });

  describe('getNPCsWithAttitude', () => {
    it('should return all NPCs with a specific attitude toward a target', () => {
      // Set up multiple NPCs with attitudes toward a player
      attitudeManager.setAttitude('npc1', 'player1', 'Friendly');
      attitudeManager.setAttitude('npc2', 'player1', 'Friendly');
      attitudeManager.setAttitude('npc3', 'player1', 'Hostile');

      const friendlyNPCs = attitudeManager.getNPCsWithAttitude('player1', 'Friendly');

      expect(friendlyNPCs).toContain('npc1');
      expect(friendlyNPCs).toContain('npc2');
      expect(friendlyNPCs).not.toContain('npc3');
      expect(friendlyNPCs).toHaveLength(2);
    });

    it('should return an empty array when no NPCs have the specified attitude', () => {
      // Set up NPCs with attitudes
      attitudeManager.setAttitude('npc1', 'player1', 'Friendly');
      attitudeManager.setAttitude('npc2', 'player1', 'Neutral');

      const hostileNPCs = attitudeManager.getNPCsWithAttitude('player1', 'Hostile');

      expect(hostileNPCs).toEqual([]);
    });
  });

  describe('initializeAttitude', () => {
    it('should perform a reaction roll and set the resulting attitude', () => {
      // Mock reaction roll result
      const mockReactionResult = {
        roll: 85,
        modifiers: [{ value: 10, source: 'Charisma' }],
        finalRoll: 95,
        attitude: 'Friendly' as NPCAttitude,
        description: 'Quite friendly and supportive',
      };

      vi.mocked(performReactionRoll).mockReturnValue(mockReactionResult);

      // Create mock characters
      const mockNPC = { id: 'npc1', abilities: { charisma: 12 }, alignment: 'Neutral Good' };
      const mockPlayer = { id: 'player1', abilities: { charisma: 16 }, alignment: 'Lawful Good' };

      // Initialize attitude
      const result = attitudeManager.initializeAttitude(
        mockNPC as Character,
        mockPlayer as Character,
        [{ value: 5, source: 'Quest Progress' }]
      );

      // Verify reaction roll was called with correct params
      expect(performReactionRoll).toHaveBeenCalledWith({
        npc: mockNPC,
        player: mockPlayer,
        modifiers: [{ value: 5, source: 'Quest Progress' }],
        context: 'First Meeting',
      });

      // Verify attitude was set correctly
      expect(result).toBe('Friendly');
      expect(attitudeManager.getAttitude('npc1', 'player1')).toBe('Friendly');
    });
  });

  describe('adjustAttitude', () => {
    it('should adjust attitude up the scale based on positive adjustments', () => {
      // Start with Neutral
      attitudeManager.setAttitude('npc1', 'player1', 'Neutral');

      // Adjust +1 (should become Friendly)
      const result = attitudeManager.adjustAttitude('npc1', 'player1', 1, 'Completed quest');

      expect(result).toBe('Friendly');
      expect(attitudeManager.getAttitude('npc1', 'player1')).toBe('Friendly');
    });

    it('should adjust attitude down the scale based on negative adjustments', () => {
      // Start with Neutral
      attitudeManager.setAttitude('npc1', 'player1', 'Neutral');

      // Adjust -1 (should become Unfriendly)
      const result = attitudeManager.adjustAttitude('npc1', 'player1', -1, 'Failed quest');

      expect(result).toBe('Unfriendly');
      expect(attitudeManager.getAttitude('npc1', 'player1')).toBe('Unfriendly');
    });

    it('should not adjust beyond the highest attitude level', () => {
      // Start with Helpful (highest level)
      attitudeManager.setAttitude('npc1', 'player1', 'Helpful');

      // Try to adjust +1 (should remain Helpful)
      const result = attitudeManager.adjustAttitude('npc1', 'player1', 1, 'Saved life');

      expect(result).toBe('Helpful');
      expect(attitudeManager.getAttitude('npc1', 'player1')).toBe('Helpful');
    });

    it('should not adjust below the lowest attitude level', () => {
      // Start with Hostile (lowest level)
      attitudeManager.setAttitude('npc1', 'player1', 'Hostile');

      // Try to adjust -1 (should remain Hostile)
      const result = attitudeManager.adjustAttitude('npc1', 'player1', -1, 'Attacked ally');

      expect(result).toBe('Hostile');
      expect(attitudeManager.getAttitude('npc1', 'player1')).toBe('Hostile');
    });

    it('should default to Neutral when adjusting a non-existent attitude', () => {
      // Adjust without existing attitude (should start from Neutral)
      const result = attitudeManager.adjustAttitude('npc1', 'player1', 1, 'First impression');

      expect(result).toBe('Friendly');
      expect(attitudeManager.getAttitude('npc1', 'player1')).toBe('Friendly');
    });

    it('should append the reason to existing notes', () => {
      // Start with existing notes
      attitudeManager.setAttitude('npc1', 'player1', 'Neutral', 'First meeting');

      // Adjust with new reason
      attitudeManager.adjustAttitude('npc1', 'player1', 1, 'Completed quest');

      // Get the record to check notes
      const record = attitudeManager.getAllAttitudesForNPC('npc1')[0];

      expect(record.notes).toBe('First meeting; Completed quest');
    });
  });

  describe('getPreviousInteractionModifier', () => {
    it('should return the correct modifier based on previous attitude', () => {
      // Set attitudes for testing
      attitudeManager.setAttitude('npc1', 'player1', 'Friendly');
      attitudeManager.setAttitude('npc2', 'player1', 'Hostile');
      attitudeManager.setAttitude('npc3', 'player1', 'Neutral');

      // Check modifiers
      expect(attitudeManager.getPreviousInteractionModifier('npc1', 'player1')).toEqual({
        value: 10,
        source: 'Previous Friendship',
      });

      expect(attitudeManager.getPreviousInteractionModifier('npc2', 'player1')).toEqual({
        value: -25,
        source: 'Previous Hostility',
      });

      expect(attitudeManager.getPreviousInteractionModifier('npc3', 'player1')).toEqual({
        value: 0,
        source: 'Previous Neutrality',
      });
    });

    it('should return zero modifier when no previous interaction exists', () => {
      const modifier = attitudeManager.getPreviousInteractionModifier('nonexistent', 'player1');

      expect(modifier).toEqual({
        value: 0,
        source: 'No Prior Interaction',
      });
    });
  });
});

describe('describeAttitude', () => {
  it('should return the correct description for each attitude', () => {
    expect(describeAttitude('Hostile')).toBe('visibly hostile and aggressive toward you');
    expect(describeAttitude('Unfriendly')).toBe('cold and distrustful of your presence');
    expect(describeAttitude('Neutral')).toBe('neither friendly nor unfriendly toward you');
    expect(describeAttitude('Friendly')).toBe('warm and receptive to your presence');
    expect(describeAttitude('Helpful')).toBe('eager to assist you in your endeavors');
  });
});

describe('getAttitudeBasedDialogue', () => {
  it('should return dialogue matching the attitude and context', () => {
    // Test a few combinations of attitudes and contexts
    const hostileGreeting = getAttitudeBasedDialogue('Hostile', 'Greeting');
    expect(typeof hostileGreeting).toBe('string');
    expect(hostileGreeting.length).toBeGreaterThan(0);

    const friendlyRequest = getAttitudeBasedDialogue('Friendly', 'Request');
    expect(typeof friendlyRequest).toBe('string');
    expect(friendlyRequest.length).toBeGreaterThan(0);

    // Default to greeting if no context specified
    const helpfulDefault = getAttitudeBasedDialogue('Helpful');
    expect(typeof helpfulDefault).toBe('string');
    expect(helpfulDefault.length).toBeGreaterThan(0);
  });
});
