import type { MapArea, MapComplexity } from '@rules/exploration/types';
import type { Character } from '@rules/types';
import { CharacterRaces } from '@rules/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  _calculateMappingChanceForTest,
  calculateMappingChance,
  calculateMappingTime,
  createMappingAction,
  performMapping,
} from '../../../rules/exploration/mapping';

// Mock the dice roll function
vi.mock('@rules/utils/dice', () => ({
  roll: vi.fn(),
}));

// Import the mocked dice module
const diceModule = await import('@rules/utils/dice');
const roll = vi.mocked(diceModule.roll);

describe('Mapping System', () => {
  // Reset dice roll mock before each test
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // Sample character and area for testing
  const testCharacter: Character = {
    id: 'test-character',
    name: 'Test Mapper',
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
    abilityModifiers: {},
    alignment: 'Neutral Good',
  } as Character;

  const simpleArea: MapArea = {
    size: { width: 100, height: 100 },
    complexity: 'Simple',
    description: 'A simple square room',
  };

  const complexArea: MapArea = {
    size: { width: 200, height: 200 },
    complexity: 'Complex',
    description: 'A complex series of winding tunnels',
  };

  describe('calculateMappingChance', () => {
    it('should calculate base chance correctly for average intelligence', () => {
      const chance = calculateMappingChance(testCharacter, simpleArea, true, true);
      expect(chance).toBeGreaterThan(0);
      expect(chance).toBeLessThanOrEqual(95);
    });

    it('should apply intelligence bonuses correctly', () => {
      calculateMappingChance(
        { ...testCharacter, abilities: { ...testCharacter.abilities, intelligence: 6 } },
        simpleArea,
        true,
        true
      );
      calculateMappingChance(testCharacter, simpleArea, true, true);
      calculateMappingChance(
        { ...testCharacter, abilities: { ...testCharacter.abilities, intelligence: 16 } },
        simpleArea,
        true,
        true
      );

      // Get the raw values for comparison
      const highResult = _calculateMappingChanceForTest(
        { ...testCharacter, abilities: { ...testCharacter.abilities, intelligence: 16 } },
        simpleArea,
        true,
        true
      );
      const normalResult = _calculateMappingChanceForTest(testCharacter, simpleArea, true, true);
      const lowResult = _calculateMappingChanceForTest(
        { ...testCharacter, abilities: { ...testCharacter.abilities, intelligence: 6 } },
        simpleArea,
        true,
        true
      );

      const highRaw = highResult.rawChance;
      const normalRaw = normalResult.rawChance;
      const lowRaw = lowResult.rawChance;

      // Now we can safely compare the numbers
      expect(highRaw).toBeGreaterThan(normalRaw);
      expect(normalRaw).toBeGreaterThan(lowRaw);
    });

    it('should apply area complexity modifiers correctly', () => {
      const simpleChance = calculateMappingChance(testCharacter, simpleArea, true, true);
      const complexChance = calculateMappingChance(testCharacter, complexArea, true, true);

      expect(simpleChance).toBeGreaterThan(complexChance);
    });

    it('should apply light and tools penalties correctly', () => {
      const fullChance = calculateMappingChance(testCharacter, simpleArea, true, true);
      const noLightChance = calculateMappingChance(testCharacter, simpleArea, false, true);
      const noToolsChance = calculateMappingChance(testCharacter, simpleArea, true, false);
      const neitherChance = calculateMappingChance(testCharacter, simpleArea, false, false);

      expect(fullChance).toBeGreaterThan(noLightChance);
      expect(fullChance).toBeGreaterThan(noToolsChance);
      expect(noLightChance).toBeGreaterThan(neitherChance);
      expect(noToolsChance).toBeGreaterThan(neitherChance);
    });

    it('should apply racial bonuses correctly', () => {
      calculateMappingChance(testCharacter, simpleArea, true, true);
      calculateMappingChance({ ...testCharacter, race: 'Dwarf' }, simpleArea, true, true);

      // Get the raw values for comparison
      const dwarfResult = _calculateMappingChanceForTest(
        { ...testCharacter, race: 'Dwarf' },
        simpleArea,
        true,
        true
      );
      const humanResult = _calculateMappingChanceForTest(testCharacter, simpleArea, true, true);

      const dwarfRaw = dwarfResult.rawChance;
      const humanRaw = humanResult.rawChance;

      // Now we can safely compare the numbers
      expect(dwarfRaw).toBeGreaterThan(humanRaw);
    });

    it('should apply level bonuses correctly', () => {
      calculateMappingChance({ ...testCharacter, level: 1 }, simpleArea, true, true);
      calculateMappingChance(testCharacter, simpleArea, true, true);
      calculateMappingChance({ ...testCharacter, level: 10 }, simpleArea, true, true);

      // Get the raw values for comparison
      const highLevelResult = _calculateMappingChanceForTest(
        { ...testCharacter, level: 10 },
        simpleArea,
        true,
        true
      );
      const normalResult = _calculateMappingChanceForTest(testCharacter, simpleArea, true, true);
      const lowLevelResult = _calculateMappingChanceForTest(
        { ...testCharacter, level: 1 },
        simpleArea,
        true,
        true
      );

      const highLevelRaw = highLevelResult.rawChance;
      const normalRaw = normalResult.rawChance;
      const lowLevelRaw = lowLevelResult.rawChance;

      // Now we can safely compare the numbers
      expect(highLevelRaw).toBeGreaterThan(normalRaw);
      expect(normalRaw).toBeGreaterThan(lowLevelRaw);
    });

    it('should clamp chances between 5% and 95%', () => {
      // Create a character with very poor mapping abilities
      const poorMapper = {
        ...testCharacter,
        abilities: { ...testCharacter.abilities, intelligence: 3 },
        level: 1,
      };

      // Create a character with excellent mapping abilities
      const excellentMapper = {
        ...testCharacter,
        abilities: { ...testCharacter.abilities, intelligence: 18 },
        race: CharacterRaces[1], // 'Dwarf'
        level: 20,
      };

      const poorChance = calculateMappingChance(poorMapper, complexArea, false, false);
      const excellentChance = calculateMappingChance(excellentMapper, simpleArea, true, true);

      expect(poorChance).toBeGreaterThanOrEqual(5);
      expect(excellentChance).toBeLessThanOrEqual(95);
    });
  });

  describe('calculateMappingTime', () => {
    it('should calculate basic mapping time based on area size', () => {
      const smallArea: MapArea = {
        size: { width: 20, height: 20 },
        complexity: 'Moderate',
        description: 'A small room',
      };

      const largeArea: MapArea = {
        size: { width: 40, height: 40 },
        complexity: 'Moderate',
        description: 'A large room',
      };

      const smallTime = calculateMappingTime(smallArea);
      const largeTime = calculateMappingTime(largeArea);

      expect(smallTime).toBeLessThan(largeTime);
    });

    it('should apply complexity modifiers to mapping time', () => {
      const areas = ['Simple', 'Moderate', 'Complex', 'Very Complex'].map(
        (complexity) =>
          ({
            size: { width: 20, height: 20 },
            complexity: complexity as MapComplexity,
            description: `A ${complexity.toLowerCase()} room`,
          }) as MapArea
      );

      const times = areas.map((area) => calculateMappingTime(area));

      // Times should increase with complexity
      expect(times[0]).toBeLessThanOrEqual(times[1]); // Simple <= Moderate
      expect(times[1]).toBeLessThan(times[2]); // Moderate < Complex
      expect(times[2]).toBeLessThan(times[3]); // Complex < Very Complex
    });

    it('should ensure mapping takes at least 1 turn', () => {
      const tinyArea: MapArea = {
        size: { width: 5, height: 5 },
        complexity: 'Simple',
        description: 'A tiny closet',
      };

      const time = calculateMappingTime(tinyArea);
      expect(time).toBeGreaterThanOrEqual(1);
    });
  });

  describe('performMapping', () => {
    it('should perform successful mapping when roll is below success chance', () => {
      // Mock a successful roll
      roll.mockReturnValue(50);

      const result = performMapping(testCharacter, simpleArea, true, true);

      expect(roll).toHaveBeenCalledWith(100);
      expect(result.success).toBe(true);
      expect(result.accuracy).toBeGreaterThan(0);
      expect(result.timeElapsed).toBeGreaterThan(0);
      expect(typeof result.increasedMonsterChance).toBe('boolean');
    });

    it('should perform failed mapping when roll is above success chance', () => {
      // Mock a failed roll
      roll.mockReturnValue(90);

      // Adjust the setup to make the mapping chance very low
      const result = performMapping(
        { ...testCharacter, abilities: { ...testCharacter.abilities, intelligence: 3 } },
        complexArea,
        false,
        false
      );

      expect(roll).toHaveBeenCalledWith(100);
      expect(result.success).toBe(false);
      expect(result.accuracy).toBeGreaterThan(0); // Even failed maps have some accuracy
      expect(result.timeElapsed).toBeGreaterThan(0);
    });

    it('should increase monster chance for longer mapping times', () => {
      roll.mockReturnValue(50);

      // Create a large area that would take more than 2 turns
      const largeArea: MapArea = {
        size: { width: 100, height: 100 },
        complexity: 'Complex',
        description: 'A large complex area',
      };

      const result = performMapping(testCharacter, largeArea, true, true);
      expect(result.increasedMonsterChance).toBe(true);
    });

    it('should limit accuracy between 10% and 95%', () => {
      roll.mockReturnValue(50);

      const result = performMapping(testCharacter, simpleArea, true, true);
      expect(result.accuracy).toBeGreaterThanOrEqual(10);
      expect(result.accuracy).toBeLessThanOrEqual(95);
    });
  });

  describe('createMappingAction', () => {
    it('should create a valid mapping action with correct structure', () => {
      roll.mockReturnValue(50);

      const action = createMappingAction(testCharacter, simpleArea, true, true);

      expect(action).toHaveProperty('mapper', testCharacter);
      expect(action).toHaveProperty('area', simpleArea);
      expect(action).toHaveProperty('hasLight', true);
      expect(action).toHaveProperty('hasTools', true);
      expect(action).toHaveProperty('result');
      expect(action.result).toHaveProperty('success');
      expect(action.result).toHaveProperty('accuracy');
      expect(action.result).toHaveProperty('timeElapsed');
      expect(action.result).toHaveProperty('increasedMonsterChance');
    });
  });
});
