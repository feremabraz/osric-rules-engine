import type { Command } from '@osric/core/Command';
import { ContextKeys } from '@osric/core/ContextKeys';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import type { Character as CharacterData } from '@osric/types/character';
import { RULE_NAMES } from '@osric/types/constants';
import { COMMAND_TYPES } from '@osric/types/constants';
import type { Monster as MonsterData } from '@osric/types/monster';
import {
  AerialAgilityLevel,
  type AerialMovement,
  applyEnvironmentalEffects,
  getAerialMovementRate,
  handleAerialMovement,
} from './AerialCombatShared';

interface AerialCombatContext {
  flyer: CharacterData | MonsterData;
  target?: CharacterData | MonsterData;
  aerialMovement: AerialMovement;
  isDiveAttack?: boolean;
  altitudeAdvantage?: boolean;
}

export class AerialCombatRules extends BaseRule {
  name = RULE_NAMES.AERIAL_COMBAT;

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

// DiveAttackRules and AerialMovementRules moved to their own files for compliance.
