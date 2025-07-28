// Export all movement and exploration related functions and types
export * from './movement';
export * from './terrain';
export * from './lighting';
export * from './maritime';
export * from './planar';

// Import and re-export the AerialMovementState type
import type { AerialMovementState } from './aerial';
export type { AerialMovementState };

// Combined functions for easy access
import type { Character, Environment, LightingCondition, TerrainType } from '@rules/types';
import type { ActiveLightSource } from './lighting';
import { calculateVisibility } from './lighting';
import { updateEncumbranceAndMovement } from './movement';
import { calculateDailyMovement, calculateTerrainAdjustedMovement } from './terrain';

/**
 * Maritime travel state
 */
export interface MaritimeTravelState {
  shipType: string;
  currentCrew: number;
  currentHull: number;
  supplies: number; // days of supplies remaining
  seaCondition: string;
  currentCourse: {
    bearing: number; // degrees
    destination: string;
    distance: number; // km to destination
  };
  navigationBonus: number; // Bonus to navigation checks
}

/**
 * Planar travel state
 */
export interface PlanarTravelState {
  currentPlane: string;
  timeDifference: number; // Multiplier for time passage
  planarEffects: string[];
  returnMethod?: {
    type: 'spell' | 'portal' | 'item';
    remainingUses: number;
  };
}

/**
 * Main exploration data structure to track exploration state
 */
export interface ExplorationState {
  // Core state
  character: Character;
  environment: Environment;
  terrain: TerrainType;
  lightingCondition: LightingCondition;
  activeLightSources: ActiveLightSource[];
  environmentalFeature?: string;
  visibility: number;
  turnsElapsed: number;
  kilometersPerDay: number;
  currentPosition: {
    x: number;
    y: number;
    z: number;
  };

  // Travel type specific states
  maritime?: MaritimeTravelState;
  planar?: PlanarTravelState;
  aerial?: AerialMovementState;
}

/**
 * Initialize exploration state for a character
 */
export function initializeExplorationState(
  character: Character,
  environment: Environment,
  terrain: TerrainType,
  lightingCondition: LightingCondition,
  environmentalFeature?: string
): ExplorationState {
  // Update character's encumbrance and movement rate
  const updatedCharacter = updateEncumbranceAndMovement(character);

  // Create exploration state
  const state: ExplorationState = {
    character: updatedCharacter,
    environment,
    terrain,
    lightingCondition,
    activeLightSources: [], // Start with no active light sources
    environmentalFeature,
    visibility: calculateVisibility(lightingCondition, []),
    turnsElapsed: 0,
    kilometersPerDay: calculateDailyMovement(
      updatedCharacter,
      terrain,
      environment,
      environmentalFeature
    ),
    currentPosition: {
      x: 0,
      y: 0,
      z: 0,
    },
  };

  return state;
}

/**
 * Update exploration state after a turn passes
 */
export function advanceExplorationTurn(
  state: ExplorationState,
  turnsToAdvance = 1
): ExplorationState {
  // Update light sources
  const updatedLightSources = state.activeLightSources.map((source) => {
    const updated = { ...source };
    // Update duration
    if (updated.source.duration !== Number.POSITIVE_INFINITY) {
      updated.remainingDuration = Math.max(0, updated.remainingDuration - turnsToAdvance);
      updated.isActive = updated.remainingDuration > 0;
    }
    return updated;
  });

  // Calculate new visibility based on updated light sources
  const newVisibility = calculateVisibility(state.lightingCondition, updatedLightSources);

  // Create updated state
  return {
    ...state,
    activeLightSources: updatedLightSources,
    visibility: newVisibility,
    turnsElapsed: state.turnsElapsed + turnsToAdvance,
  };
}

/**
 * Main function to move a character through terrain
 */
export function moveCharacter(
  state: ExplorationState,
  distance: number,
  direction: { x: number; y: number; z: number }
): ExplorationState {
  // Get base movement rate
  const baseRate = state.character.movementRate;

  // Get adjusted movement rate for terrain
  const adjustedRate = calculateTerrainAdjustedMovement(
    baseRate,
    state.terrain,
    state.environment,
    state.environmentalFeature
  );

  // Calculate movement capabilities - in meters per turn
  const maxDistancePerTurn = adjustedRate;

  // Calculate how many turns it takes to move the requested distance
  const turnsRequired = Math.max(1, Math.ceil(distance / maxDistancePerTurn));

  // Normalize direction vector
  const magnitude = Math.sqrt(
    direction.x * direction.x + direction.y * direction.y + direction.z * direction.z
  );

  const normalizedDirection = {
    x: direction.x / magnitude,
    y: direction.y / magnitude,
    z: direction.z / magnitude,
  };

  // Calculate new position
  const newPosition = {
    x: state.currentPosition.x + normalizedDirection.x * distance,
    y: state.currentPosition.y + normalizedDirection.y * distance,
    z: state.currentPosition.z + normalizedDirection.z * distance,
  };

  // Advance time by required turns
  const updatedState = advanceExplorationTurn(state, turnsRequired);

  // Return updated state with new position
  return {
    ...updatedState,
    currentPosition: newPosition,
  };
}
