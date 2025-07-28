import type { Character, Monster } from '@rules/types';
import type { Environment, TerrainType } from '@rules/types';
import { AerialAgilityLevel } from '../combat/mountedCombat';

/**
 * Aerial movement rates in meters per round
 */
export const AerialMovementRates = {
  // Base movement rates by creature size and type (meters/round)
  TINY: 18, // e.g., small birds, imps
  SMALL: 24, // e.g., hawks, pixies
  MEDIUM: 30, // e.g., humans on flying mounts
  LARGE: 36, // e.g., griffons, hippogriffs
  HUGE: 42, // e.g., dragons
  GARGANTUAN: 48, // e.g., rocs, ancient dragons
} as const;

/**
 * Wind conditions and their effects on flight
 */
export const WindConditions = {
  CALM: {
    name: 'Calm',
    speed: 0, // m/s
    effect: 'No effect on flight',
    speedModifier: 1.0,
    controlDC: 0,
  },
  LIGHT_BREEZE: {
    name: 'Light Breeze',
    speed: 2, // 2 m/s (7.2 km/h)
    effect: 'Slight drift, no penalty',
    speedModifier: 1.0,
    controlDC: 5,
  },
  MODERATE_WIND: {
    name: 'Moderate Wind',
    speed: 5, // 5 m/s (18 km/h)
    effect: 'Noticeable resistance, -1 to hit with ranged attacks',
    speedModifier: 0.9,
    controlDC: 10,
  },
  STRONG_WIND: {
    name: 'Strong Wind',
    speed: 10, // 10 m/s (36 km/h)
    effect: 'Difficult flight, -2 to hit with ranged attacks',
    speedModifier: 0.75,
    controlDC: 15,
  },
  STORM: {
    name: 'Storm',
    speed: 20, // 20 m/s (72 km/h)
    effect: 'Dangerous conditions, -4 to hit with ranged attacks',
    speedModifier: 0.5,
    controlDC: 20,
  },
  HURRICANE: {
    name: 'Hurricane',
    speed: 30, // 30+ m/s (108+ km/h)
    effect: 'Extremely dangerous, flying not recommended',
    speedModifier: 0.25,
    controlDC: 25,
  },
} as const;

/**
 * Aerial movement state
 */
export interface AerialMovementState {
  // Current state
  currentAltitude: number; // meters
  currentSpeed: number; // meters per round
  currentDirection: number; // degrees (0-359)
  isHovering: boolean;
  isDiving: boolean;

  // Flight characteristics
  maxSpeed: number; // meters per round
  climbRate: number; // meters per round (45° climb)
  diveSpeed: number; // meters per round (60° dive)
  agility: AerialAgilityLevel;

  // Environmental factors
  windSpeed: number; // meters per second
  windDirection: number; // degrees (0-359)
  weatherCondition: keyof typeof WindConditions;
}

/**
 * Calculates aerial movement based on creature type and conditions
 */
export function calculateAerialMovement(
  baseSpeed: number,
  agility: AerialAgilityLevel,
  altitude: number,
  windCondition: keyof typeof WindConditions,
  isDiving = false
): AerialMovementState {
  const wind = WindConditions[windCondition];

  // Calculate base movement based on creature size and agility
  let movementRate = baseSpeed;
  let maxMovementRate = baseSpeed; // Max speed is same as base speed, no agility modifier

  // Current speed is always base speed unless modified by other factors
  movementRate = baseSpeed;

  // Apply wind effects to max speed
  maxMovementRate = Math.floor(maxMovementRate * wind.speedModifier);
  movementRate = Math.min(movementRate, maxMovementRate);

  // Calculate climb and dive rates
  const climbRate = Math.floor(maxMovementRate * 0.5); // 45° climb at half speed
  const diveSpeed = Math.floor(maxMovementRate * 2); // 60° dive at double speed

  return {
    currentAltitude: altitude,
    currentSpeed: movementRate,
    maxSpeed: maxMovementRate,
    currentDirection: 0, // Facing north by default
    isHovering: false,
    isDiving,
    climbRate,
    diveSpeed,
    agility,
    windSpeed: wind.speed,
    windDirection: 0, // Wind from north by default
    weatherCondition: windCondition,
  };
}

/**
 * Updates aerial movement for a flying creature
 */
export function updateAerialMovement(
  currentState: AerialMovementState,
  action: 'ascend' | 'descend' | 'level' | 'turn' | 'hover',
  value?: number // degrees for turn, meters for altitude change
): AerialMovementState {
  const newState = { ...currentState };

  switch (action) {
    case 'ascend':
      if (newState.agility >= AerialAgilityLevel.Excellent || !newState.isHovering) {
        const altitudeChange = value ?? newState.climbRate;
        newState.currentAltitude += altitudeChange;
        newState.currentSpeed = Math.max(
          newState.maxSpeed * 0.5,
          newState.currentSpeed - altitudeChange / 2
        );
      }
      break;

    case 'descend': {
      const descent = value ?? newState.climbRate;
      newState.currentAltitude = Math.max(0, newState.currentAltitude - descent);
      newState.currentSpeed = Math.min(
        newState.maxSpeed * 1.5,
        newState.currentSpeed + descent / 2
      );
      newState.isDiving = (value ?? 0) > newState.climbRate * 1.5;
      break;
    }

    case 'turn':
      if (value) {
        const maxTurn = getMaxTurnAngle(newState.agility);
        const turnAmount = Math.min(Math.abs(value), maxTurn) * Math.sign(value);
        newState.currentDirection = (newState.currentDirection + turnAmount + 360) % 360;
      }
      break;

    case 'hover':
      newState.isHovering = true;
      newState.currentSpeed = 0;
      break;

    case 'level':
      newState.isHovering = false;
      newState.isDiving = false;
      break;

    default:
      // Handle unknown action
      break;
  }

  return newState;
}

/**
 * Gets maximum turn angle based on agility
 */
export function getMaxTurnAngle(agility: AerialAgilityLevel): number {
  switch (agility) {
    case AerialAgilityLevel.Perfect:
      return 180;
    case AerialAgilityLevel.Excellent:
      return 120;
    case AerialAgilityLevel.Good:
      return 90;
    case AerialAgilityLevel.Average:
      return 60;
    case AerialAgilityLevel.Poor:
      return 30;
    case AerialAgilityLevel.Drifting:
      return 0;
    default:
      return 60;
  }
}

/**
 * Calculates daily aerial travel distance in kilometers
 */
export function calculateDailyAerialTravel(
  movementState: AerialMovementState,
  travelHours = 8,
  terrainType: TerrainType = 'Normal',
  environment: Environment = 'Wilderness'
): number {
  // Convert movement rate from meters/round to km/h
  // 1 round = 10 seconds (6 rounds per minute)
  // 1 meter = 0.001 km
  const baseSpeedKph = movementState.currentSpeed * 6 * 60 * 0.001;

  // Apply terrain and environment modifiers
  const terrainModifier = terrainType === 'Very Difficult' ? 0.8 : 1.0;
  const environmentModifier = environment === 'Urban' ? 0.9 : 1.0;

  // Calculate effective speed
  const effectiveSpeed = baseSpeedKph * terrainModifier * environmentModifier;

  // Calculate daily distance
  return Math.round(effectiveSpeed * travelHours * 10) / 10; // Round to 1 decimal place
}

/**
 * Checks if a flying creature can maintain flight
 */
export function checkFlightMaintenance(
  movementState: AerialMovementState,
  strengthScore: number,
  isEncumbered: boolean
): { canContinue: boolean; message: string } {
  const wind = WindConditions[movementState.weatherCondition];

  // Check against wind conditions
  if (wind.controlDC > 0) {
    const strengthCheck = Math.floor((strengthScore - 10) / 2);
    const roll = Math.floor(Math.random() * 20) + 1 + strengthCheck;

    if (roll < wind.controlDC) {
      return {
        canContinue: false,
        message: `Failed to maintain control in ${wind.name.toLowerCase()} conditions.`,
      };
    }
  }

  // Check encumbrance for non-magical flight
  if (isEncumbered && movementState.agility < AerialAgilityLevel.Excellent) {
    return {
      canContinue: false,
      message: 'too encumbered to maintain flight.',
    };
  }

  return {
    canContinue: true,
    message: 'Flight maintained.',
  };
}
