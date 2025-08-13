// Shared types and helpers for aerial combat rules
export enum AerialAgilityLevel {
  Drifting = 1,
  Poor = 2,
  Average = 3,
  Good = 4,
  Excellent = 5,
  Perfect = 6,
}

export interface AerialMovement {
  currentAltitude: number;
  currentSpeed: number;
  maxSpeed: number;
  currentAgility: AerialAgilityLevel;

  isDiving: boolean;
  diveDistance: number;

  maneuverabilityClass: 'A' | 'B' | 'C' | 'D' | 'E';
  currentFacing: number;
  minimumForwardSpeed: number;
  climbingRate: number;
  divingRate: number;

  windSpeed?: number;
  windDirection?: number;
  weatherCondition?: 'clear' | 'rain' | 'storm' | 'gale' | 'hurricane';
}

export function getAerialMovementRate(agility: AerialAgilityLevel): {
  accelerationRounds: number;
  turnAngle: number;
  canHover: boolean;
  instantAcceleration: boolean;
} {
  switch (agility) {
    case AerialAgilityLevel.Drifting:
      return { accelerationRounds: 0, turnAngle: 0, canHover: true, instantAcceleration: true };
    case AerialAgilityLevel.Poor:
      return {
        accelerationRounds: 5,
        turnAngle: 30,
        canHover: false,
        instantAcceleration: false,
      };
    case AerialAgilityLevel.Average:
      return {
        accelerationRounds: 2,
        turnAngle: 60,
        canHover: false,
        instantAcceleration: false,
      };
    case AerialAgilityLevel.Good:
      return {
        accelerationRounds: 1,
        turnAngle: 90,
        canHover: false,
        instantAcceleration: false,
      };
    case AerialAgilityLevel.Excellent:
      return {
        accelerationRounds: 0.25,
        turnAngle: 120,
        canHover: true,
        instantAcceleration: false,
      };
    case AerialAgilityLevel.Perfect:
      return { accelerationRounds: 0, turnAngle: 180, canHover: true, instantAcceleration: true };
    default:
      return { accelerationRounds: 0, turnAngle: 0, canHover: false, instantAcceleration: false };
  }
}

export function applyEnvironmentalEffects(movement: AerialMovement): void {
  if (
    movement.windSpeed !== undefined &&
    movement.windDirection !== undefined &&
    movement.windSpeed > 0
  ) {
    const windAngleDiff = Math.abs(
      ((movement.currentFacing - movement.windDirection + 180 + 360) % 360) - 180
    );
    const windFactor = Math.cos((windAngleDiff * Math.PI) / 180);
    const windEffect = windFactor * (movement.windSpeed / 10);

    if (Math.abs(windAngleDiff - 90) < 30 || Math.abs(windAngleDiff - 270) < 30) {
      const driftAngle = (movement.windSpeed / 20) * (windAngleDiff > 180 ? -1 : 1);
      movement.currentFacing = (movement.currentFacing + driftAngle + 360) % 360;
    }

    const newSpeed = movement.currentSpeed + windEffect;
    const movementCapabilities = getAerialMovementRate(movement.currentAgility);

    if (!movementCapabilities.canHover || movement.currentSpeed > 0) {
      movement.currentSpeed = Math.max(
        movement.minimumForwardSpeed,
        Math.min(movement.maxSpeed, newSpeed)
      );
    } else {
      movement.currentSpeed = Math.max(0, Math.min(movement.maxSpeed, newSpeed));
    }
  }

  if (movement.weatherCondition) {
    switch (movement.weatherCondition) {
      case 'rain':
        movement.currentSpeed = Math.max(movement.minimumForwardSpeed, movement.currentSpeed * 0.9);
        break;
      case 'storm':
        movement.currentSpeed = Math.max(
          movement.minimumForwardSpeed * 1.5,
          movement.currentSpeed * 0.7
        );
        break;
      case 'gale':
      case 'hurricane':
        movement.currentSpeed = movement.maxSpeed;
        break;
    }
  }
}

export function handleAerialMovement(
  movement: AerialMovement,
  direction: 'ascend' | 'descend' | 'level',
  distance: number
): AerialMovement {
  const newMovement = { ...movement };
  const movementCapabilities = getAerialMovementRate(newMovement.currentAgility);

  if (direction === 'ascend') {
    const climbDistance = Math.min(distance, newMovement.climbingRate);
    newMovement.currentAltitude += climbDistance;

    newMovement.currentSpeed = Math.max(
      newMovement.minimumForwardSpeed,
      newMovement.currentSpeed * 0.75
    );
  } else if (direction === 'descend') {
    const isDivingCondition = distance >= 50 && newMovement.maxSpeed > 300;

    if (isDivingCondition) {
      newMovement.isDiving = true;
      newMovement.diveDistance = distance;

      newMovement.currentSpeed = Math.min(
        newMovement.maxSpeed,
        newMovement.currentSpeed + Math.floor(distance / 30)
      );
    } else {
      newMovement.isDiving = false;
      newMovement.diveDistance = 0;
    }

    const actualDescentDistance = distance < 40 ? distance * 0.9 : distance;
    newMovement.currentAltitude = Math.max(0, newMovement.currentAltitude - actualDescentDistance);
  }

  if (!movementCapabilities.canHover) {
    newMovement.currentSpeed = Math.max(newMovement.currentSpeed, newMovement.minimumForwardSpeed);
  } else {
    if (direction === 'level' && distance === 0) {
      newMovement.currentSpeed = 0;
    }
  }

  applyEnvironmentalEffects(newMovement);

  return newMovement;
}

export function getDiveAttackBonus(movement: AerialMovement): number {
  if (!movement.isDiving || movement.diveDistance < 9) {
    return 0;
  }
  return 2;
}

export function mountFlyingCreature(mount: {
  flyingAgility: AerialAgilityLevel | null;
}): AerialAgilityLevel | null {
  return mount.flyingAgility;
}
