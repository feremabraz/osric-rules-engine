import {
  calculateBaseSearchChance,
  calculateSearchTime,
  createSearchAction,
  performSearch,
} from '@rules/exploration/search';
import type { SearchArea, SearchMethod } from '@rules/exploration/types';
import type { Character } from '@rules/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the dice roll function
vi.mock('@rules/utils/dice', () => ({
  roll: vi.fn(),
}));

// Import the mocked dice module
const diceModule = await import('@rules/utils/dice');
const roll = vi.mocked(diceModule.roll);

describe('Search System', () => {
  // Reset dice roll mock before each test
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // Sample character and area for testing
  const testCharacter: Character = {
    id: 'test-searcher',
    name: 'Test Searcher',
    race: 'Human',
    class: 'Fighter',
    level: 5,
    abilities: {
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 12,
      wisdom: 10,
      charisma: 10,
    },
    thiefSkills: null,
    alignment: 'Neutral Good',
  } as Character;

  const testArea: SearchArea = {
    size: { width: 30, height: 30 },
    description: 'A room with secrets',
    hasSecretDoors: true,
    hasTraps: true,
    secretDoorLocations: ['north wall', 'east wall'],
    trapLocations: ['floor center', 'treasure chest'],
  };

  describe('calculateBaseSearchChance', () => {
    it('should return base chance for standard human search', () => {
      const chance = calculateBaseSearchChance(testCharacter, 'Standard');
      expect(chance).toBeCloseTo(16.67);
    });

    it('should return higher chance for elves', () => {
      const elfCharacter = { ...testCharacter, race: 'Elf' as const };
      const chance = calculateBaseSearchChance(elfCharacter, 'Standard');
      expect(chance).toBeCloseTo(33.33);
    });

    it('should return higher chance for half-elves', () => {
      const halfElfCharacter = { ...testCharacter, race: 'Half-Elf' as const };
      const chance = calculateBaseSearchChance(halfElfCharacter, 'Standard');
      expect(chance).toBeCloseTo(33.33);
    });

    it('should return higher chance for dwarves using dwarf-enhanced method', () => {
      const dwarfCharacter = { ...testCharacter, race: 'Dwarf' as const };
      const standardChance = calculateBaseSearchChance(dwarfCharacter, 'Standard');
      const enhancedChance = calculateBaseSearchChance(dwarfCharacter, 'Dwarf-Enhanced');
      expect(enhancedChance).toBeGreaterThan(standardChance);
      expect(enhancedChance).toBeCloseTo(33.33);
    });

    it('should use thief skills for thieves using specialized method', () => {
      const thiefCharacter = {
        ...testCharacter,
        class: 'Thief' as const,
        thiefSkills: {
          pickPockets: 0,
          openLocks: 0,
          findTraps: 50,
          removeTraps: 0,
          moveSilently: 0,
          hideInShadows: 0,
          hearNoise: 0,
          climbWalls: 0,
          readLanguages: null,
        },
      };
      const chance = calculateBaseSearchChance(thiefCharacter, 'Thief-Specialized');
      expect(chance).toBe(50);
    });

    it('should use default thief chance if no thief skills defined', () => {
      const thiefCharacter = {
        ...testCharacter,
        class: 'Thief' as const,
        thiefSkills: null,
      };
      const chance = calculateBaseSearchChance(thiefCharacter, 'Thief-Specialized');
      expect(chance).toBe(25);
    });

    it('should provide bonus for detailed searches', () => {
      const standardChance = calculateBaseSearchChance(testCharacter, 'Standard');
      const detailedChance = calculateBaseSearchChance(testCharacter, 'Detailed');
      expect(detailedChance).toBeGreaterThan(standardChance);
      expect(detailedChance).toBeCloseTo(standardChance + 8.33);
    });

    it('should provide bonus for negotiated searches', () => {
      const standardChance = calculateBaseSearchChance(testCharacter, 'Standard');
      const negotiatedChance = calculateBaseSearchChance(testCharacter, 'Negotiated');
      expect(negotiatedChance).toBeGreaterThan(standardChance);
      expect(negotiatedChance).toBeCloseTo(standardChance + 16.67);
    });
  });

  describe('calculateSearchTime', () => {
    it('should calculate base search time based on area size', () => {
      const smallArea: SearchArea = {
        size: { width: 10, height: 10 },
        description: 'A small room',
        hasSecretDoors: false,
        hasTraps: false,
      };

      const largeArea: SearchArea = {
        size: { width: 30, height: 30 },
        description: 'A large room',
        hasSecretDoors: false,
        hasTraps: false,
      };

      const smallTime = calculateSearchTime(smallArea, 'Standard');
      const largeTime = calculateSearchTime(largeArea, 'Standard');

      expect(smallTime).toBeLessThan(largeTime);
    });

    it('should take longer for detailed searches', () => {
      const standardTime = calculateSearchTime(testArea, 'Standard');
      const detailedTime = calculateSearchTime(testArea, 'Detailed');

      expect(detailedTime).toBe(standardTime * 2);
    });

    it('should take longer for negotiated searches', () => {
      const standardTime = calculateSearchTime(testArea, 'Standard');
      const negotiatedTime = calculateSearchTime(testArea, 'Negotiated');

      expect(negotiatedTime).toBe(standardTime * 3);
    });

    it('should be faster for thief-specialized searches', () => {
      const standardTime = calculateSearchTime(testArea, 'Standard');
      const thiefTime = calculateSearchTime(testArea, 'Thief-Specialized');

      expect(thiefTime).toBe(standardTime * 0.5);
    });

    it('should ensure search takes at least 1 turn', () => {
      const tinyArea: SearchArea = {
        size: { width: 5, height: 5 },
        description: 'A tiny closet',
        hasSecretDoors: false,
        hasTraps: false,
      };

      const fastMethod: SearchMethod = 'Thief-Specialized';
      const time = calculateSearchTime(tinyArea, fastMethod);

      expect(time).toBeGreaterThanOrEqual(1);
    });
  });

  describe('performSearch', () => {
    it('should find nothing if roll fails', () => {
      // Mock a failed roll
      roll.mockReturnValue(100);

      const result = performSearch(testCharacter, testArea, 'Standard');

      expect(roll).toHaveBeenCalledTimes(4); // 2 secret doors + 2 trap locations
      expect(result.success).toBe(false);
      expect(result.discoveredItems).toHaveLength(0);
      expect(result.timeElapsed).toBeGreaterThan(0);
    });

    it('should find secret doors when roll succeeds', () => {
      // First two rolls succeed (for secret doors), second two fail (for traps)
      roll
        .mockReturnValueOnce(10)
        .mockReturnValueOnce(10)
        .mockReturnValueOnce(100)
        .mockReturnValueOnce(100);

      const result = performSearch(testCharacter, testArea, 'Standard');

      expect(roll).toHaveBeenCalledTimes(4);
      expect(result.success).toBe(true);
      expect(result.discoveredItems).toHaveLength(2);
      expect(result.discoveredItems[0]).toContain('Secret door');
      expect(result.discoveredItems[1]).toContain('Secret door');
    });

    it('should find traps when roll succeeds', () => {
      // First two rolls fail (for secret doors), second two succeed (for traps)
      roll
        .mockReturnValueOnce(100)
        .mockReturnValueOnce(100)
        .mockReturnValueOnce(10)
        .mockReturnValueOnce(10);

      const result = performSearch(testCharacter, testArea, 'Standard');

      expect(roll).toHaveBeenCalledTimes(4);
      expect(result.success).toBe(true);
      expect(result.discoveredItems).toHaveLength(2);
      expect(result.discoveredItems[0]).toContain('Trap');
      expect(result.discoveredItems[1]).toContain('Trap');
    });

    it('should give bonuses to dwarves and gnomes for finding traps', () => {
      // We'll test this by verifying the trap check uses a different chance
      // than the door check for dwarves
      roll.mockImplementation(() => 30); // Return 30 for all rolls

      const dwarfCharacter = { ...testCharacter, race: 'Dwarf' as const };
      const result = performSearch(dwarfCharacter, testArea, 'Standard');

      // With our mock returning 30 and dwarves getting a trap detection bonus,
      // we expect to find traps but not secret doors (since 30 > 16.67 base chance)
      expect(result.discoveredItems.filter((item) => item.includes('Trap'))).toHaveLength(2);
    });

    it('should increase monster chance for longer searches', () => {
      roll.mockReturnValue(100); // No discoveries to focus on search time

      // Create a large area that would take more than 2 turns
      const largeArea: SearchArea = {
        size: { width: 50, height: 50 },
        description: 'A large area',
        hasSecretDoors: true,
        hasTraps: true,
        secretDoorLocations: ['north'],
        trapLocations: ['south'],
      };

      const result = performSearch(testCharacter, largeArea, 'Detailed'); // Detailed takes twice as long
      expect(result.increasedMonsterChance).toBe(true);
    });
  });

  describe('createSearchAction', () => {
    it('should create a valid search action with correct structure', () => {
      roll.mockReturnValue(10); // Success

      const action = createSearchAction(testCharacter, testArea, 'Standard');

      expect(action).toHaveProperty('actor', testCharacter);
      expect(action).toHaveProperty('area', testArea);
      expect(action).toHaveProperty('method', 'Standard');
      expect(action).toHaveProperty('timeSpent');
      expect(action).toHaveProperty('result');
      expect(action.result).toHaveProperty('success');
      expect(action.result).toHaveProperty('discoveredItems');
      expect(action.result).toHaveProperty('timeElapsed');
      expect(action.result).toHaveProperty('increasedMonsterChance');
      expect(action.timeSpent).toBe(action.result.timeElapsed);
    });
  });
});
