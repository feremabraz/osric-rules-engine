import { roll } from '@rules/utils/dice';
import type { Character } from '../types';
import type { MapArea, MappingAction, MappingResult } from './types';

interface MappingChanceResult {
  cappedChance: number;
  rawChance: number;
}

/**
 * Pure function that calculates both raw and capped mapping chance
 */
function calculateMappingChanceInternal(
  character: Character,
  area: MapArea,
  hasLight: boolean,
  hasTools: boolean
): MappingChanceResult {
  // Base success chance
  let baseChance = 75; // 75% chance of accurate mapping

  // Intelligence modifier
  const intelligenceBonus = calculateIntelligenceBonus(character);
  baseChance += intelligenceBonus;

  // Complexity modifiers
  switch (area.complexity) {
    case 'Simple':
      baseChance += 15;
      break;
    case 'Moderate':
      // No modifier for moderate complexity
      break;
    case 'Complex':
      baseChance -= 15;
      break;
    case 'Very Complex':
      baseChance -= 30;
      break;
  }

  // Light and tools modifiers
  if (!hasLight) {
    baseChance -= 50; // Very difficult to map without light
  }

  if (!hasTools) {
    baseChance -= 25; // Difficult to map without proper tools
  }

  // Race modifiers
  if (character.race === 'Dwarf') {
    baseChance += 5; // Dwarves have an innate sense of direction underground
  }

  // Experience matters
  baseChance += character.level * 2; // +2% per level

  // Ensure the chance is between 5% and 95% for actual gameplay
  const cappedChance = Math.min(Math.max(baseChance, 5), 95);

  return {
    rawChance: baseChance,
    cappedChance,
  };
}

/**
 * Calculate mapping chance for production use (returns only the capped value)
 */
export function calculateMappingChance(
  character: Character,
  area: MapArea,
  hasLight: boolean,
  hasTools: boolean
): number {
  return calculateMappingChanceInternal(character, area, hasLight, hasTools).cappedChance;
}

/**
 * Calculate mapping chance for testing (returns both raw and capped values)
 * @internal Test only
 */
export function _calculateMappingChanceForTest(
  character: Character,
  area: MapArea,
  hasLight: boolean,
  hasTools: boolean
): MappingChanceResult {
  return calculateMappingChanceInternal(character, area, hasLight, hasTools);
}

/**
 * Calculate bonus from intelligence for mapping
 */
function calculateIntelligenceBonus(character: Character): number {
  const intelligence = character.abilities.intelligence;

  if (intelligence >= 16) return 15;
  if (intelligence >= 13) return 10;
  if (intelligence >= 9) return 5; // 9-12
  if (intelligence <= 6) return -10; // 3-6
  if (intelligence <= 8) return -5; // 7-8

  return 0; // Shouldn't happen as all cases are covered
}

/**
 * Calculate the time required for a mapping action
 */
export function calculateMappingTime(area: MapArea): number {
  // Standard mapping: 1 turn per 20x20 ft area
  const areaSizeInSquareFeet = area.size.width * area.size.height;
  const standardTurns = Math.ceil(areaSizeInSquareFeet / 400);

  let timeMultiplier = 1;

  // Complexity modifiers
  switch (area.complexity) {
    case 'Simple':
      timeMultiplier = 0.75; // 25% faster
      break;
    case 'Moderate':
      timeMultiplier = 1; // Standard time
      break;
    case 'Complex':
      timeMultiplier = 1.5; // 50% longer
      break;
    case 'Very Complex':
      timeMultiplier = 2.5; // 2.5 times as long
      break;
  }

  // Minimum 1 turn
  return Math.max(1, Math.ceil(standardTurns * timeMultiplier));
}

/**
 * Perform a mapping action
 */
export function performMapping(
  character: Character,
  area: MapArea,
  hasLight: boolean,
  hasTools: boolean
): MappingResult {
  const successChance = calculateMappingChance(character, area, hasLight, hasTools);
  const timeElapsed = calculateMappingTime(area);

  // Roll for mapping success
  const accuracyRoll = roll(100);

  // Base accuracy is determined by how much the roll succeeds or fails by
  let accuracy = Math.max(0, 100 - Math.abs(accuracyRoll - successChance));

  // Accuracy can't exceed 95% or fall below 10% due to human error
  accuracy = Math.min(Math.max(accuracy, 10), 95);

  // Determine if the mapping increases wandering monster chance
  // Longer mapping activities increase the chance of random encounters
  const increasedMonsterChance = timeElapsed > 2;

  return {
    success: accuracyRoll <= successChance,
    accuracy,
    timeElapsed,
    increasedMonsterChance,
  };
}

/**
 * Create a mapping action
 */
export function createMappingAction(
  mapper: Character,
  area: MapArea,
  hasLight: boolean,
  hasTools: boolean
): MappingAction {
  const result = performMapping(mapper, area, hasLight, hasTools);

  return {
    mapper,
    area,
    hasLight,
    hasTools,
    result,
  };
}
