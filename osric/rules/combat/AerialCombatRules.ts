import type { Command } from '@osric/core/Command';
import { ContextKeys } from '@osric/core/ContextKeys';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import type { Character as CharacterData } from '@osric/types/character';
import { COMMAND_TYPES } from '@osric/types/constants';
import type { Monster as MonsterData } from '@osric/types/monster';

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

interface AerialCombatContext {
  flyer: CharacterData | MonsterData;
  target?: CharacterData | MonsterData;
  aerialMovement: AerialMovement;
  isDiveAttack?: boolean;
  altitudeAdvantage?: boolean;
}

export class AerialCombatRule extends BaseRule {
  name = 'aerial-combat';

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const aerialContext = context.getTemporary(
      ContextKeys.COMBAT_AERIAL_CONTEXT
    ) as AerialCombatContext;

    if (!aerialContext) {
      return this.createFailureResult('No aerial combat context found');
    }

    const { aerialMovement, isDiveAttack, altitudeAdvantage } = aerialContext;

    const modifiers = this.getAerialCombatModifiers(
      aerialMovement,
      isDiveAttack,
      altitudeAdvantage
    );

    context.setTemporary(ContextKeys.COMBAT_AERIAL_MODIFIERS, modifiers);

    let message = 'Aerial combat modifiers applied: ';
    message += `${modifiers.attackBonus >= 0 ? '+' : ''}${modifiers.attackBonus} attack, `;
    message += `${modifiers.damageMultiplier > 1 ? `${modifiers.damageMultiplier}x` : '1x'} damage`;

    if (modifiers.specialEffects.length > 0) {
      message += `, Special: ${modifiers.specialEffects.join(', ')}`;
    }

    return this.createSuccessResult(message);
  }

  canApply(context: GameContext, command: Command): boolean {
    if (command.type !== COMMAND_TYPES.ATTACK && command.type !== COMMAND_TYPES.AERIAL_COMBAT)
      return false;

    const aerialContext = context.getTemporary(
      ContextKeys.COMBAT_AERIAL_CONTEXT
    ) as AerialCombatContext;
    return aerialContext !== null;
  }

  private getAerialCombatModifiers(
    movement: AerialMovement,
    isDiveAttack = false,
    altitudeAdvantage = false
  ): {
    attackBonus: number;
    damageMultiplier: number;
    specialEffects: string[];
  } {
    let attackBonus = 0;
    let damageMultiplier = 1;
    const specialEffects: string[] = [];

    if (altitudeAdvantage) {
      attackBonus += 2;
      specialEffects.push('altitude advantage');
    }

    if (isDiveAttack && movement.isDiving && movement.diveDistance >= 30) {
      damageMultiplier = 2;
      attackBonus += 1;
      specialEffects.push('dive attack');
    }

    const maneuverabilityBonus = this.getManeuverabilityBonus(movement.currentAgility);
    attackBonus += maneuverabilityBonus;

    if (maneuverabilityBonus !== 0) {
      specialEffects.push(`${movement.maneuverabilityClass} maneuverability`);
    }

    if (movement.currentSpeed < movement.minimumForwardSpeed) {
      attackBonus -= 2;
      specialEffects.push('struggling to maintain altitude');
    }

    if (movement.weatherCondition) {
      const weatherPenalty = this.getWeatherPenalty(movement.weatherCondition);
      attackBonus += weatherPenalty;

      if (weatherPenalty !== 0) {
        specialEffects.push(`${movement.weatherCondition} weather`);
      }
    }

    return {
      attackBonus,
      damageMultiplier,
      specialEffects,
    };
  }

  private getManeuverabilityBonus(agility: AerialAgilityLevel): number {
    switch (agility) {
      case AerialAgilityLevel.Perfect:
        return 2;
      case AerialAgilityLevel.Excellent:
        return 1;
      case AerialAgilityLevel.Good:
        return 0;
      case AerialAgilityLevel.Average:
        return -1;
      case AerialAgilityLevel.Poor:
        return -2;
      case AerialAgilityLevel.Drifting:
        return -3;
      default:
        return 0;
    }
  }

  private getWeatherPenalty(condition: string): number {
    switch (condition) {
      case 'clear':
        return 0;
      case 'rain':
        return -1;
      case 'storm':
        return -2;
      case 'gale':
        return -3;
      case 'hurricane':
        return -4;
      default:
        return 0;
    }
  }
}

export class DiveAttackRule extends BaseRule {
  name = 'dive-attack';

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const aerialContext = context.getTemporary(
      ContextKeys.COMBAT_AERIAL_CONTEXT
    ) as AerialCombatContext;

    if (!aerialContext || !aerialContext.isDiveAttack) {
      return this.createFailureResult('No dive attack context found');
    }

    const { aerialMovement } = aerialContext;

    if (aerialMovement.diveDistance < 9) {
      return this.createFailureResult('Dive attack requires a dive of at least 9 meters');
    }

    const diveEffects = this.calculateDiveAttackEffects(aerialMovement);

    context.setTemporary(ContextKeys.COMBAT_AERIAL_DIVE_EFFECTS, diveEffects);
    context.setTemporary(ContextKeys.COMBAT_AERIAL_DAMAGE_MULTIPLIER, diveEffects.damageMultiplier);

    return this.createSuccessResult(
      `Dive attack executed: ${diveEffects.damageMultiplier}x damage, +${diveEffects.attackBonus} to hit (${aerialMovement.diveDistance} ft dive)`
    );
  }

  canApply(context: GameContext, command: Command): boolean {
    if (command.type !== COMMAND_TYPES.ATTACK && command.type !== COMMAND_TYPES.DIVE_ATTACK)
      return false;

    const aerialContext = context.getTemporary(
      ContextKeys.COMBAT_AERIAL_CONTEXT
    ) as AerialCombatContext;
    return aerialContext !== null && aerialContext.isDiveAttack === true;
  }

  private calculateDiveAttackEffects(movement: AerialMovement): {
    damageMultiplier: number;
    attackBonus: number;
    knockdownChance: number;
  } {
    const baseDamageMultiplier = 2;
    let attackBonus = 1;
    let knockdownChance = 0.5;

    if (movement.diveDistance >= 60) {
      attackBonus += 1;
      knockdownChance = 0.75;
    }

    if (movement.diveDistance >= 100) {
      attackBonus += 1;
      knockdownChance = 0.9;
    }

    if (movement.currentSpeed >= movement.maxSpeed) {
      attackBonus += 1;
    }

    return {
      damageMultiplier: baseDamageMultiplier,
      attackBonus,
      knockdownChance,
    };
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

function applyEnvironmentalEffects(movement: AerialMovement): void {
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

export class AerialMovementRule extends BaseRule {
  name = 'aerial-movement';

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const aerialContext = context.getTemporary(
      ContextKeys.COMBAT_AERIAL_CONTEXT
    ) as AerialCombatContext;

    if (!aerialContext) {
      return this.createFailureResult('No aerial movement context found');
    }

    const { aerialMovement } = aerialContext;
    const direction = context.getTemporary(ContextKeys.COMBAT_AERIAL_MOVEMENT_DIRECTION) as
      | 'ascend'
      | 'descend'
      | 'level';
    const distance = context.getTemporary(ContextKeys.COMBAT_AERIAL_MOVEMENT_DISTANCE) as number;

    if (!direction || !distance) {
      return this.createFailureResult('Movement direction and distance required');
    }

    const newMovement = handleAerialMovement(aerialMovement, direction, distance);

    context.setTemporary(ContextKeys.COMBAT_AERIAL_MOVEMENT, newMovement);

    return this.createSuccessResult(
      `Aerial movement: ${direction} ${distance} ft, now at ${newMovement.currentAltitude} ft altitude, ` +
        `speed ${newMovement.currentSpeed}/${newMovement.maxSpeed}`
    );
  }

  canApply(context: GameContext, command: Command): boolean {
    if (command.type !== COMMAND_TYPES.MOVE && command.type !== COMMAND_TYPES.AERIAL_MOVE)
      return false;

    const aerialContext = context.getTemporary(
      ContextKeys.COMBAT_AERIAL_CONTEXT
    ) as AerialCombatContext;
    return aerialContext !== null;
  }

  private handleAerialMovement(
    movement: AerialMovement,
    direction: 'ascend' | 'descend' | 'level',
    distance: number
  ): AerialMovement {
    const newMovement = { ...movement };
    const movementCapabilities = this.getAerialMovementCapabilities(newMovement.currentAgility);

    if (direction === 'ascend') {
      const climbDistance = Math.min(distance, newMovement.climbingRate);
      newMovement.currentAltitude += climbDistance;

      newMovement.currentSpeed = Math.max(
        newMovement.minimumForwardSpeed,
        newMovement.currentSpeed * 0.75
      );
    } else if (direction === 'descend') {
      if (distance > 30) {
        newMovement.isDiving = true;
        newMovement.diveDistance = distance;

        newMovement.currentSpeed = Math.min(
          newMovement.maxSpeed,
          newMovement.currentSpeed + Math.floor(distance / 30)
        );
      }
      newMovement.currentAltitude = Math.max(0, newMovement.currentAltitude - distance);
    }

    if (!movementCapabilities.canHover) {
      newMovement.currentSpeed = Math.max(
        newMovement.currentSpeed,
        newMovement.minimumForwardSpeed
      );
    }

    this.applyEnvironmentalEffects(newMovement);

    return newMovement;
  }

  private getAerialMovementCapabilities(agility: AerialAgilityLevel): {
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

  private applyEnvironmentalEffects(movement: AerialMovement): void {
    if (movement.windSpeed !== undefined && movement.windDirection !== undefined) {
      const windAngleDiff = Math.abs(
        ((movement.currentFacing - movement.windDirection + 180 + 360) % 360) - 180
      );
      const windFactor = Math.cos((windAngleDiff * Math.PI) / 180);
      const windEffect = windFactor * (movement.windSpeed / 10);

      movement.currentSpeed = Math.max(
        movement.minimumForwardSpeed,
        Math.min(movement.maxSpeed, movement.currentSpeed + windEffect)
      );
    }

    if (movement.weatherCondition) {
      switch (movement.weatherCondition) {
        case 'rain':
          movement.currentSpeed = Math.max(
            movement.minimumForwardSpeed,
            movement.currentSpeed * 0.9
          );
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
}
