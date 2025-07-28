import type { Character, LightingCondition } from '@rules/types';

/**
 * Light source types and their properties
 */
export interface LightSource {
  name: string;
  radius: number; // Light radius in meters
  duration: number; // Duration in turns (10 minutes)
  bright: boolean; // Whether it provides bright or dim light
  requiresHands: boolean; // Whether it requires a hand to hold
  description: string;
}

/**
 * Standard light sources available in OSRIC
 */
export const LightSources: Record<string, LightSource> = {
  Torch: {
    name: 'Torch',
    radius: 9, // 9m radius
    duration: 6, // 1 hour (6 turns)
    bright: true,
    requiresHands: true,
    description: 'A wooden stick wrapped with oil-soaked cloth.',
  },
  'Lantern, Hooded': {
    name: 'Lantern, Hooded',
    radius: 9, // 9m radius
    duration: 24, // 4 hours (24 turns)
    bright: true,
    requiresHands: true,
    description: 'A lantern with adjustable shutters to control light output.',
  },
  "Lantern, Bull's-eye": {
    name: "Lantern, Bull's-eye",
    radius: 18, // 18m cone
    duration: 24, // 4 hours (24 turns)
    bright: true,
    requiresHands: true,
    description: 'A lantern with a focusing lens that projects light in a narrow beam.',
  },
  Candle: {
    name: 'Candle',
    radius: 1.5, // 1.5m radius
    duration: 30, // 5 hours (30 turns)
    bright: false,
    requiresHands: true,
    description: 'A simple wax candle with a wick.',
  },
  'Continual Light spell': {
    name: 'Continual Light spell',
    radius: 18, // 18m radius
    duration: Number.POSITIVE_INFINITY, // Permanent until dispelled
    bright: true,
    requiresHands: false,
    description: 'A magical light created by the Continual Light spell.',
  },
  'Light spell': {
    name: 'Light spell',
    radius: 6, // 6m radius
    duration: 60, // 10 hours (60 turns, 1 turn per level at level 6)
    bright: true,
    requiresHands: false,
    description: 'A magical light created by the Light spell.',
  },
};

/**
 * Visibility ranges by lighting condition in meters
 */
export const VisibilityRanges: Record<LightingCondition, number> = {
  Bright: 30, // 30m visibility range
  Dim: 9, // 9m visibility range
  Darkness: 0,
};

/**
 * Structure to track active light sources
 */
export interface ActiveLightSource {
  source: LightSource;
  remainingDuration: number;
  isActive: boolean;
}

/**
 * Check if a character has an active light source
 */
export function hasActiveLightSource(character: Character): boolean {
  // Check inventory for active light sources
  // Note: In a real implementation, we'd need to track active light sources separately
  // For now, we'll check if character has any light source items
  return character.inventory.some((item) =>
    Object.values(LightSources).some((source) => source.name === item.name && item.equipped)
  );
}

/**
 * Get the current light radius for a character
 */
export function getLightRadius(character: Character): number {
  // Find the equipped light source with the largest radius
  const lightSourceItem = character.inventory.find((item) =>
    Object.values(LightSources).some((source) => source.name === item.name && item.equipped)
  );

  if (!lightSourceItem) return 0;

  // Find the matching light source
  const lightSource = Object.values(LightSources).find(
    (source) => source.name === lightSourceItem.name
  );

  return lightSource ? lightSource.radius : 0;
}

/**
 * Create an active light source with full duration
 */
export function createActiveLightSource(sourceName: string): ActiveLightSource | null {
  const source = LightSources[sourceName];
  if (!source) return null;

  return {
    source,
    remainingDuration: source.duration,
    isActive: true,
  };
}

/**
 * Update remaining duration of light sources after a turn passes
 */
export function updateLightSourceDuration(
  lightSource: ActiveLightSource,
  turnsElapsed = 1
): ActiveLightSource {
  // Check if the light source has infinite duration
  if (lightSource.source.duration === Number.POSITIVE_INFINITY) {
    return lightSource;
  }

  // Update remaining duration
  const remainingDuration = Math.max(0, lightSource.remainingDuration - turnsElapsed);

  // Check if light source has been consumed
  const isActive = remainingDuration > 0;

  return {
    ...lightSource,
    remainingDuration,
    isActive,
  };
}

/**
 * Calculate visibility based on lighting conditions and light sources
 */
export function calculateVisibility(
  baseCondition: LightingCondition,
  lightSources: ActiveLightSource[] = []
): number {
  // Start with base visibility for the lighting condition
  const visibility = VisibilityRanges[baseCondition];

  // If there are active light sources, use the largest radius
  const activeSourceRadius = lightSources
    .filter((ls) => ls.isActive)
    .reduce((maxRadius, ls) => Math.max(maxRadius, ls.source.radius), 0);

  // In darkness, visibility is limited to light source radius
  if (baseCondition === 'Darkness' && activeSourceRadius > 0) {
    return activeSourceRadius;
  }

  // In dim light, light sources extend visibility
  if (baseCondition === 'Dim' && activeSourceRadius > 0) {
    return Math.max(visibility, activeSourceRadius);
  }

  return visibility;
}

/**
 * Determine if a target at a given distance is visible
 */
export function isTargetVisible(
  distance: number,
  baseCondition: LightingCondition,
  lightSources: ActiveLightSource[] = [],
  targetHasLightSource = false
): boolean {
  // Calculate viewer's visibility radius
  const visibilityRadius = calculateVisibility(baseCondition, lightSources);

  // Target is visible if within viewer's visibility radius
  if (distance <= visibilityRadius) {
    return true;
  }

  // If target has their own light source and we're in darkness or dim light,
  // they might be visible beyond our normal visibility radius
  if (targetHasLightSource && baseCondition !== 'Bright') {
    // In darkness, can see light sources from 2x their radius
    // (e.g., can see a torch with 9m radius from 18m away)
    const targetLightVisibility =
      baseCondition === 'Darkness' ? LightSources.Torch.radius * 2 : LightSources.Torch.radius;

    return distance <= targetLightVisibility;
  }

  return false;
}
