import type { Action, ActionResult, Character, Monster } from '@rules/types';
import { AerialAgilityLevel } from './mountedCombat';

/**
 * Represents a flying creature or mounted unit's aerial movement state
 * Based on OSRIC's aerial combat rules
 */
export interface AerialMovement {
  // Core movement properties
  currentAltitude: number; // in feet
  currentSpeed: number; // current movement rate
  maxSpeed: number; // maximum movement rate
  currentAgility: AerialAgilityLevel; // maneuverability class (A-E)

  // Diving state
  isDiving: boolean; // whether currently in a dive
  diveDistance: number; // distance fallen in current dive

  // OSRIC-specific aerial properties
  maneuverabilityClass: 'A' | 'B' | 'C' | 'D' | 'E'; // A is best, E is worst
  currentFacing: number; // current facing direction in degrees (0-360)
  minimumForwardSpeed: number; // minimum speed to maintain altitude
  climbingRate: number; // vertical climb rate in feet/round
  divingRate: number; // vertical dive rate in feet/round

  // Environmental factors (optional, for advanced rules)
  windSpeed?: number; // wind speed in mph
  windDirection?: number; // wind direction in degrees (0-360)
  weatherCondition?: 'clear' | 'rain' | 'storm' | 'gale' | 'hurricane';
}

/**
 * Calculates movement rate based on aerial agility level
 */
export function getAerialMovementRate(agility: AerialAgilityLevel): {
  accelerationRounds: number;
  turnAngle: number;
  canHover: boolean;
  instantAcceleration: boolean;
} {
  switch (agility) {
    case AerialAgilityLevel.Drifting:
      return { accelerationRounds: 0, turnAngle: 0, canHover: true, instantAcceleration: true }; // No acceleration, can't turn
    case AerialAgilityLevel.Poor:
      return { accelerationRounds: 5, turnAngle: 30, canHover: false, instantAcceleration: false };
    case AerialAgilityLevel.Average:
      return { accelerationRounds: 2, turnAngle: 60, canHover: false, instantAcceleration: false };
    case AerialAgilityLevel.Good:
      return { accelerationRounds: 1, turnAngle: 90, canHover: false, instantAcceleration: false };
    case AerialAgilityLevel.Excellent:
      return {
        accelerationRounds: 0.25,
        turnAngle: 120,
        canHover: true,
        instantAcceleration: false,
      }; // 1 segment to reach full speed
    case AerialAgilityLevel.Perfect:
      return { accelerationRounds: 0, turnAngle: 180, canHover: true, instantAcceleration: true };
    default:
      return { accelerationRounds: 0, turnAngle: 0, canHover: false, instantAcceleration: false };
  }
}

/**
 * Handles aerial movement and positioning according to OSRIC rules
 * @param movement Current aerial movement state
 * @param direction Direction of movement ('ascend', 'descend', or 'level')
 * @param distance Distance to move in feet
 * @returns Updated aerial movement state
 */
export function handleAerialMovement(
  movement: AerialMovement,
  direction: 'ascend' | 'descend' | 'level',
  distance: number
): AerialMovement {
  const newMovement = { ...movement };
  const { canHover } = getAerialMovementRate(newMovement.currentAgility);

  // Calculate effective movement distance after accounting for altitude changes
  const effectiveDistance = (() => {
    if (direction === 'ascend') {
      // Climbing reduces forward movement by climbing rate
      const climbDistance = Math.min(distance, newMovement.climbingRate);
      newMovement.currentAltitude += climbDistance;
      // Reduce forward movement by climb ratio (OSRIC uses 1:1 for simplicity)
      return Math.max(0, distance - climbDistance);
    }

    if (direction === 'descend') {
      // Diving allows faster movement
      if (distance > 30) {
        newMovement.isDiving = true;
        newMovement.diveDistance = distance;
        // Diving increases speed up to diving rate
        newMovement.currentSpeed = Math.min(
          newMovement.maxSpeed,
          newMovement.currentSpeed + newMovement.divingRate / 10
        );
      }
      // Descend at controlled rate
      newMovement.currentAltitude = Math.max(0, newMovement.currentAltitude - distance);
    }

    return distance;
  })();

  // Use effectiveDistance for any remaining movement calculations
  // (currently not used, but kept for future expansion)
  void effectiveDistance; // Mark as used

  // Update speed based on maneuverability class and minimum forward speed
  if (!canHover) {
    // Must maintain minimum forward speed to stay aloft
    newMovement.currentSpeed = Math.max(newMovement.currentSpeed, newMovement.minimumForwardSpeed);

    // Apply deceleration if below minimum speed
    if (newMovement.currentSpeed < newMovement.minimumForwardSpeed) {
      newMovement.currentSpeed = newMovement.minimumForwardSpeed;
    }
  }

  // Apply wind effects if any
  if (newMovement.windSpeed !== undefined && newMovement.windDirection !== undefined) {
    const windAngleDiff = Math.abs(
      ((newMovement.currentFacing - newMovement.windDirection + 180 + 360) % 360) - 180
    );

    // Calculate wind effect factor (0-1) based on angle
    const windFactor = Math.cos((windAngleDiff * Math.PI) / 180);

    // Apply wind effect - stronger effect with higher wind speeds
    const windEffect = windFactor * (newMovement.windSpeed / 10);

    // Update speed with wind effect, but don't go below minimum speed
    newMovement.currentSpeed = Math.max(
      newMovement.minimumForwardSpeed,
      Math.min(newMovement.maxSpeed, newMovement.currentSpeed + windEffect)
    );

    // Update facing direction based on crosswind
    if (windAngleDiff > 90 && windAngleDiff < 270 && Math.abs(windFactor) > 0.3) {
      // Strong crosswind can cause drift
      const driftDirection = Math.sign(
        ((newMovement.windDirection - newMovement.currentFacing + 540) % 360) - 180
      );
      newMovement.currentFacing = (newMovement.currentFacing + driftDirection * 5) % 360;
    }
  }

  // Handle weather conditions
  if (newMovement.weatherCondition) {
    switch (newMovement.weatherCondition) {
      case 'rain':
        // Slight reduction in visibility and maneuverability
        newMovement.currentSpeed = Math.max(
          newMovement.minimumForwardSpeed,
          newMovement.currentSpeed * 0.9
        );
        break;
      case 'storm':
        // Significant reduction in speed and control
        newMovement.currentSpeed = Math.max(
          newMovement.minimumForwardSpeed * 1.5, // Need more speed to stay aloft
          newMovement.currentSpeed * 0.7
        );
        break;
      case 'gale':
      case 'hurricane':
        // Extreme conditions - maximum speed required to maintain control
        newMovement.currentSpeed = newMovement.maxSpeed;
        break;
    }
  }

  return newMovement;
}

/**
 * Calculates dive attack bonus
 */
export function getDiveAttackBonus(attacker: AerialMovement): number {
  if (!attacker.isDiving || attacker.diveDistance < 30) {
    return 0;
  }

  // Double damage for dives > 30ft
  return 2; // This is a multiplier that will be applied to damage
}

/**
 * Handles mounting a flying creature
 */
export function mountFlyingCreature(mount: {
  flyingAgility: AerialAgilityLevel | null;
}): AerialAgilityLevel | null {
  if (!mount.flyingAgility) {
    return null;
  }

  // Return the mount's base flying agility
  return mount.flyingAgility;
}
