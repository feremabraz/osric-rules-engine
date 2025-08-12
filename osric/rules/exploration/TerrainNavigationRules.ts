import type { Command } from '@osric/core/Command';
import { DiceEngine } from '@osric/core/Dice';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import type { Character } from '@osric/types/character';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';

export class TerrainNavigationRule extends BaseRule {
  readonly name = RULE_NAMES.TERRAIN_NAVIGATION;
  readonly priority = 10;

  canApply(_context: GameContext, command: Command): boolean {
    return command.type === COMMAND_TYPES.TERRAIN_NAVIGATION;
  }

  async apply(context: GameContext, command: Command): Promise<RuleResult> {
    const params = command.parameters as unknown as {
      characterId: string;
      terrainType: { movementModifier: number; gettingLostChance: number };
      distance: number;
      navigationMethod: 'landmark' | 'compass' | 'stars' | 'ranger-tracking' | 'none';
      weatherConditions?: { visibility: number; movementPenalty: number };
      hasMap: boolean;
      timeOfDay: 'dawn' | 'day' | 'dusk' | 'night';
    };
    const character = context.getEntity<Character>(params.characterId);
    if (!character) return this.createFailureResult('Character not found', undefined, true);

    const baseMovementRate = character.movementRate;
    let effectiveMovementRate = baseMovementRate * params.terrainType.movementModifier;
    if (params.weatherConditions) {
      effectiveMovementRate *= 1 + params.weatherConditions.movementPenalty / 100;
    }

    const dailyDistance = (effectiveMovementRate / 120) * 24;
    const hours = (params.distance / dailyDistance) * 24;

    const wisdomMod = Math.floor((character.abilities.wisdom - 10) / 2);
    let navigationBonus = wisdomMod * 5;

    switch (params.navigationMethod) {
      case 'compass':
        navigationBonus += 25;
        break;
      case 'stars':
        navigationBonus += params.timeOfDay === 'night' ? 20 : -10;
        break;
      case 'landmark':
        navigationBonus += 15;
        break;
      case 'ranger-tracking':
        navigationBonus += character.class === 'Ranger' ? 30 : 10;
        break;
      case 'none':
        navigationBonus -= 20;
        break;
    }

    if (params.hasMap) navigationBonus += 20;
    if (params.weatherConditions) {
      const visibility = params.weatherConditions.visibility;
      if (visibility < 1000) navigationBonus -= 20;
      else if (visibility < 3000) navigationBonus -= 10;
    }
    if (params.timeOfDay === 'night' && params.navigationMethod !== 'stars') navigationBonus -= 15;
    if (params.timeOfDay === 'dawn' || params.timeOfDay === 'dusk') navigationBonus -= 5;

    const finalChance = Math.max(
      1,
      Math.min(95, params.terrainType.gettingLostChance - navigationBonus)
    );
    const roll = DiceEngine.roll('1d100').total;
    const gotLost = roll <= finalChance;
    let extraDistanceMultiplier = 1.0;
    if (gotLost) {
      const severity = DiceEngine.roll('1d6').total;
      extraDistanceMultiplier = 1.0 + severity * 0.2;
    }

    const actualDistance = gotLost ? params.distance * extraDistanceMultiplier : params.distance;
    const actualHours = gotLost ? hours * extraDistanceMultiplier : hours;

    return this.createSuccessResult('Terrain navigation resolved', {
      characterId: params.characterId,
      effectiveMovementRate,
      plannedDistance: params.distance,
      actualDistance,
      plannedHours: hours,
      actualHours,
      gotLost,
      roll,
      finalChance,
    });
  }
}
