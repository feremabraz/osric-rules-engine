import type { Character } from '@rules/types';
import { roll } from '@rules/utils/dice';

/**
 * Different planes of existence
 */
export enum Plane {
  PrimeMaterial = 'Prime Material',
  Astral = 'Astral',
  Ethereal = 'Ethereal',
  ElementalAir = 'Elemental Air',
  ElementalEarth = 'Elemental Earth',
  ElementalFire = 'Elemental Fire',
  ElementalWater = 'Elemental Water',
  PositiveEnergy = 'Positive Energy',
  NegativeEnergy = 'Negative Energy',
  Abyss = 'The Abyss',
  NineHells = 'Nine Hells',
  MountCelestia = 'Mount Celestia',
  Outlands = 'Outlands',
  Limbo = 'Limbo',
  Mechanus = 'Mechanus',
  Arcadia = 'Arcadia',
  Ysgard = 'Ysgard',
  Beastlands = 'Beastlands',
  Arborea = 'Arborea',
  Elysium = 'Elysium',
  Hades = 'Hades',
  Gehenna = 'Gehenna',
  Carceri = 'Carceri',
  Pandemonium = 'Pandemonium',
}

/**
 * Information about a plane
 */
export interface PlaneInfo {
  name: string;
  alignment: string[];
  gravity: 'Normal' | 'Subjective Directional' | 'Heavy' | 'Light' | 'None' | 'Special';
  time: 'Normal' | 'Erratic' | 'Flowing' | 'Timeless' | 'Timeless (Magic)';
  size: 'Finite' | 'Infinite' | 'Self-Contained' | 'Shape and Size';
  morphic: 'Alterable' | 'Divinely Morphic' | 'Static' | 'Sentient';
  description: string;
  dangers: string[];
}

/**
 * Information about planar travel methods
 */
export interface PlanarTravelMethod {
  name: string;
  spellLevel: number;
  casterLevel: number;
  range: string;
  duration: string;
  areaOfEffect: string;
  components: string[];
  savingThrow: string;
  description: string;
  baseSuccessChance: number;
  mishapChance: number;
}

/**
 * Standard planar travel spells
 */
export const PlanarTravelSpells: Record<string, PlanarTravelMethod> = {
  astralProjection: {
    name: 'Astral Projection',
    spellLevel: 9,
    casterLevel: 18,
    range: 'Touch',
    duration: 'Special',
    areaOfEffect: 'Caster + up to 7 others',
    components: ['V', 'S', 'M'],
    savingThrow: 'None',
    description: 'Projects the caster and companions onto the Astral Plane as astral forms.',
    baseSuccessChance: 95,
    mishapChance: 5,
  },
  planeShift: {
    name: 'Plane Shift',
    spellLevel: 5,
    casterLevel: 9,
    range: 'Touch',
    duration: 'Instantaneous',
    areaOfEffect: 'Caster + up to 7 others',
    components: ['V', 'S', 'F'],
    savingThrow: 'Negates',
    description:
      'Transports creatures to another plane of existence. Requires a forked metal rod attuned to the destination plane.',
    baseSuccessChance: 85,
    mishapChance: 15,
  },
  gate: {
    name: 'Gate',
    spellLevel: 9,
    casterLevel: 18,
    range: '30m',
    duration: 'Concentration + 1 round/level',
    areaOfEffect: '6m radius',
    components: ['V', 'S'],
    savingThrow: 'None',
    description:
      'Creates a portal to another plane, which may allow creatures to pass through in both directions.',
    baseSuccessChance: 90,
    mishapChance: 10,
  },
  etherealness: {
    name: 'Etherealness',
    spellLevel: 7,
    casterLevel: 13,
    range: 'Touch',
    duration: '1 turn/level',
    areaOfEffect: 'Caster + up to 3 others',
    components: ['V', 'S'],
    savingThrow: 'None',
    description: 'Transports the caster and companions to the Ethereal Plane.',
    baseSuccessChance: 90,
    mishapChance: 5,
  },
};

/**
 * Result of a planar travel attempt
 */
export interface PlanarTravelResult {
  success: boolean;
  destination: Plane;
  timeDifference: number; // Multiplier for time passage relative to Material Plane
  sideEffects: string[];
  mishap: boolean;
  mishapEffect?: string;
  message: string;
}

/**
 * Attempts to travel between planes using a spell
 */
export function attemptPlanarTravel(
  caster: Character,
  spell: PlanarTravelMethod,
  targetPlane: Plane,
  currentPlane: Plane = Plane.PrimeMaterial,
  hasFocus = false,
  isFamiliar = false // If the caster is familiar with the destination
): PlanarTravelResult {
  // Base chance of success
  let successChance = spell.baseSuccessChance;

  // Adjust for caster level
  const levelDifference = caster.level - spell.casterLevel;
  successChance += levelDifference * 2; // +2% per level above minimum

  // Adjust for familiarity
  if (!isFamiliar) successChance -= 20;

  // Check if focus is required and present
  if (spell.components.includes('F') && !hasFocus) {
    successChance = 0; // Can't cast without focus
  }

  // Cap success chance
  successChance = Math.max(5, Math.min(95, successChance));

  // Roll for success
  const rollResult = roll(100);

  // Type is explicit for documentation
  const success = rollResult <= successChance;

  // Check for mishap
  // Type is explicit for documentation
  const isMishap = rollResult >= 100 - spell.mishapChance;

  // Determine result
  if (!success) {
    return {
      success: false,
      destination: currentPlane,
      timeDifference: 1,
      sideEffects: ['Disorientation', 'Temporary weakness'],
      mishap: isMishap,
      mishapEffect: isMishap ? getRandomMishap() : undefined,
      message: isMishap
        ? `The spell backfires horribly! ${getRandomMishap()}`
        : 'The spell fails to transport you.',
    };
  }

  // Successful travel
  const timeDifference = calculateTimeDifference(currentPlane, targetPlane);

  return {
    success: true,
    destination: targetPlane,
    timeDifference,
    sideEffects: getPlanarSideEffects(targetPlane),
    mishap: false,
    message: `You successfully travel to the ${targetPlane} plane.`,
  };
}

/**
 * Calculates time difference between planes
 */
// _from is intentionally unused as we only need the destination plane
/**
 * Calculate time difference between planes
 * @param _from - The plane traveling from (intentionally unused)
 * @param to - The plane traveling to
 */
export function calculateTimeDifference(_from: Plane, to: Plane): number {
  // _from parameter is intentionally unused as we only need the destination plane
  // _from parameter is intentionally unused as we only need the destination plane
  // Prime Material is the reference (1.0)
  if (_from === to) return 1.0;

  // Planes with different time flow
  const timeMultipliers: Record<Plane, number> = {
    [Plane.PrimeMaterial]: 1.0,
    [Plane.Astral]: 0, // Timeless
    [Plane.Ethereal]: 1.0, // Same as Material
    [Plane.ElementalAir]: 1.5,
    [Plane.ElementalFire]: 2.0,
    [Plane.ElementalWater]: 0.75,
    [Plane.ElementalEarth]: 0.5,
    [Plane.Abyss]: 1.5,
    [Plane.NineHells]: 1.25,
    [Plane.MountCelestia]: 0.75,
    [Plane.Limbo]: 2.0,
    [Plane.Mechanus]: 1.0,
    [Plane.Arcadia]: 0.9,
    [Plane.Ysgard]: 1.1,
    [Plane.Beastlands]: 1.0,
    [Plane.Arborea]: 1.25,
    [Plane.Elysium]: 0.8,
    [Plane.Hades]: 1.3,
    [Plane.Gehenna]: 1.4,
    [Plane.Carceri]: 1.5,
    [Plane.Pandemonium]: 1.7,
    [Plane.PositiveEnergy]: 2.0,
    [Plane.NegativeEnergy]: 2.0,
    [Plane.Outlands]: 1.0,
  };

  return timeMultipliers[to] ?? 1.0;
}

/**
 * Gets side effects for a plane
 */
export function getPlanarSideEffects(plane: Plane): string[] {
  const effects: Record<string, string[]> = {
    [Plane.Astral]: [
      'Astral projection form',
      'Silver cord connection',
      'Can move by thought alone',
    ],
    [Plane.Ethereal]: [
      'Ethereal form',
      'Can see into Material Plane',
      'Can pass through solid objects',
    ],
    [Plane.ElementalAir]: [
      'Constant wind',
      'Requires feather fall or flight',
      'Breathable atmosphere',
    ],
    [Plane.ElementalFire]: ['Extreme heat', 'Fire resistance required', 'No breathable air'],
    [Plane.Abyss]: [
      'Chaotic alignment shift risk',
      'Random demon encounters',
      'Twisted landscapes',
    ],
    [Plane.NineHells]: ['Lawful evil influence', 'Devilish contracts', 'Oppressive atmosphere'],
    [Plane.MountCelestia]: [
      'Lawful good aura',
      'Healing effects enhanced',
      'Evil creatures weakened',
    ],
  };

  return effects[plane] || ['No immediate side effects detected'];
}

/**
 * Gets a random planar mishap
 */
export function getRandomMishap(): string {
  const mishaps = [
    'You arrive at the correct plane but 1d10x100 miles off target.',
    'You arrive on a parallel version of the target plane.',
    'You arrive at the correct location but 1d10x10 years in the past or future.',
    'You arrive on the correct plane but in the middle of a dangerous location.',
    'You are separated from your companions (1d4 rounds).',
    'You arrive with half your hit points temporarily drained.',
    'You are temporarily ethereal for 1d6 turns.',
    'You are followed by an extraplanar entity.',
    'Your equipment is scattered across the plane (1d4 items lost).',
    'You gain a temporary madness from the planar transition.',
  ];

  return mishaps[Math.floor(Math.random() * mishaps.length)];
}

/**
 * Handles time passage when returning from another plane
 */
export function calculateTimePassage(
  timeSpent: number,
  planeTimeRatio: number
): { materialTime: number; message: string } {
  if (planeTimeRatio === 0) {
    // Timeless plane
    return {
      materialTime: 0,
      message: 'No time has passed on the Material Plane while you were away.',
    };
  }

  const materialTime = Math.round(timeSpent * planeTimeRatio * 10) / 10;

  return {
    materialTime,
    message: `While you spent ${timeSpent} ${timeSpent === 1 ? 'hour' : 'hours'} on the plane, ${materialTime} ${materialTime === 1 ? 'hour has' : 'hours have'} passed on the Material Plane`,
  };
}
