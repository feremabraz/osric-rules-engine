import type { Character, Environment, TerrainType } from '@rules/types';

/**
 * Movement rate multipliers by terrain type
 */
export const TerrainMovementMultipliers: Record<TerrainType, number> = {
  Normal: 1.0,
  Difficult: 0.75,
  'Very Difficult': 0.5,
  Impassable: 0.0,
};

/**
 * Environment-specific terrain effects on movement
 */
export const EnvironmentTerrainEffects: Record<Environment, Record<string, number>> = {
  Dungeon: {
    stairs: 0.75,
    'narrow passage': 0.75,
    'slippery floor': 0.5,
    rubble: 0.5,
    'water (ankle-deep)': 0.75,
    'water (knee-deep)': 0.5,
    'water (waist-deep)': 0.25,
  },
  Wilderness: {
    trail: 1.25,
    road: 1.5,
    'tall grass': 0.75,
    'dense brush': 0.5,
    marsh: 0.5,
    'snow (light)': 0.75,
    'snow (heavy)': 0.5,
    mud: 0.75,
  },
  Urban: {
    'crowded street': 0.75,
    market: 0.5,
    alley: 0.75,
    road: 1.25,
    'main avenue': 1.5,
  },
  Underwater: {
    'open water': 0.5,
    'kelp forest': 0.25,
    'coral reef': 0.25,
    'strong current': 0.25,
  },
  Aerial: {
    'calm air': 1.0,
    'light wind': 1.25,
    'strong wind (favorable)': 1.5,
    'strong wind (opposing)': 0.5,
    storm: 0.25,
  },
  Mountain: {
    path: 1.0,
    'steep incline': 0.5,
    'cliff face': 0.25,
    scree: 0.5,
    'snow-covered': 0.5,
  },
  Forest: {
    trail: 1.0,
    'light undergrowth': 0.75,
    'dense undergrowth': 0.5,
    deadfall: 0.5,
  },
  Desert: {
    'hard sand': 0.75,
    'loose sand': 0.5,
    dunes: 0.25,
    rocky: 0.75,
  },
  Swamp: {
    'firm ground': 0.75,
    mud: 0.5,
    bog: 0.25,
    'shallow water': 0.5,
  },
  Plains: {
    'open grassland': 1.0,
    'tall grass': 0.75,
    farmland: 0.75,
    road: 1.5,
  },
  Arctic: {
    ice: 0.75,
    'snow (packed)': 0.75,
    'snow (deep)': 0.25,
    'frozen lake': 1.0,
  },
};

/**
 * Get terrain multiplier for a specific terrain type
 */
export function getTerrainMultiplier(terrainType: TerrainType): number {
  return TerrainMovementMultipliers[terrainType];
}

/**
 * Get specific environmental feature multiplier
 */
export function getEnvironmentFeatureMultiplier(environment: Environment, feature: string): number {
  const environmentEffects = EnvironmentTerrainEffects[environment];
  return environmentEffects[feature] || 1.0;
}

/**
 * Calculate terrain-adjusted movement rate
 */
export function calculateTerrainAdjustedMovement(
  baseMovementRate: number,
  terrainType: TerrainType,
  environment: Environment,
  environmentalFeature?: string
): number {
  // Apply base terrain type multiplier
  let adjustedRate = baseMovementRate * getTerrainMultiplier(terrainType);

  // Apply specific environmental feature multiplier if provided
  if (environmentalFeature) {
    adjustedRate *= getEnvironmentFeatureMultiplier(environment, environmentalFeature);
  }

  // Round to nearest whole number
  return Math.round(adjustedRate);
}

/**
 * Check if terrain is navigable by a specific movement type
 */
export function isTerrainNavigable(terrainType: TerrainType, movementType: string): boolean {
  // Impassable terrain cannot be navigated by normal walking
  if (terrainType === 'Impassable' && movementType === 'Walk') {
    return false;
  }

  // Flying can navigate all terrain except in enclosed spaces
  if (movementType === 'Fly') {
    return true;
  }

  // Swimming requires water
  if (movementType === 'Swim') {
    // Would need more context about the terrain to determine if swimming is possible
    return false;
  }

  // Default to true for other cases
  return true;
}

/**
 * Get daily movement distance based on terrain and environment
 * Returns distance in kilometers per day
 */
export function calculateDailyMovement(
  character: Character,
  terrainType: TerrainType,
  environment: Environment,
  environmentalFeature?: string,
  forcedMarch = false
): number {
  // Base movement rate in meters per turn (10 minutes)
  const baseMovementRate = character.movementRate;

  // Adjust for terrain
  const terrainAdjustedRate = calculateTerrainAdjustedMovement(
    baseMovementRate,
    terrainType,
    environment,
    environmentalFeature
  );

  // Convert to kilometers per day (8-hour travel day)
  // A turn is 10 minutes, so 6 turns per hour * 8 hours = 48 turns per day
  // Movement rate is in meters per turn, so multiply by 48 for meters per day
  // Then convert meters to kilometers
  let kilometersPerDay = (terrainAdjustedRate * 48) / 1000;

  // Adjust for forced march (increase distance by 50% but with risk of exhaustion)
  if (forcedMarch) {
    kilometersPerDay *= 1.5;
  }

  return Math.round(kilometersPerDay * 10) / 10; // Round to 1 decimal place
}
