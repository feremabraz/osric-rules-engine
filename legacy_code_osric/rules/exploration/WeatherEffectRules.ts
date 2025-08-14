import type { Command } from '@osric/core/Command';
import { DiceEngine } from '@osric/core/Dice';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import type { Character } from '@osric/types/character';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';

export interface WeatherCondition {
  type:
    | 'clear'
    | 'overcast'
    | 'light-rain'
    | 'heavy-rain'
    | 'drizzle'
    | 'fog'
    | 'light-snow'
    | 'heavy-snow'
    | 'blizzard'
    | 'wind'
    | 'storm';
  intensity: 'light' | 'moderate' | 'heavy' | 'severe';
  duration: number;
  temperature: 'freezing' | 'cold' | 'cool' | 'mild' | 'warm' | 'hot' | 'scorching';
}

interface WeatherEffects {
  movementMultiplier: number;
  visibilityRange: number;
  combatPenalty: number;
  spellcastingPenalty: number;
  rangedAttackPenalty: number;
  fireResistance: boolean;
  coldDamage: boolean;
  heatDamage: boolean;
}

export class WeatherEffectsRules extends BaseRule {
  readonly name = RULE_NAMES.WEATHER_EFFECTS;
  readonly priority = 10;

  canApply(_context: GameContext, command: Command): boolean {
    return command.type === COMMAND_TYPES.WEATHER_CHECK;
  }

  async apply(context: GameContext, command: Command): Promise<RuleResult> {
    const {
      characterId,
      currentWeather,
      activityType,
      exposureTime = 1,
    } = command.parameters as unknown as {
      characterId: string;
      currentWeather: WeatherCondition;
      activityType: string;
      exposureTime?: number;
    };

    const character = context.getEntity<Character>(characterId);
    if (!character) {
      return this.createFailureResult(
        `Character with ID "${characterId}" not found`,
        undefined,
        true
      );
    }

    const base = this.calculateWeatherEffects(currentWeather);
    const modified = this.applyActivityModifications(base, activityType);
    const damage = this.calculateWeatherDamage(character, currentWeather, exposureTime);

    if (damage > 0) {
      const updated = {
        ...character,
        hitPoints: {
          ...character.hitPoints,
          current: Math.max(0, character.hitPoints.current - damage),
        },
      };
      context.setEntity(character.id, updated);
    }

    return this.createSuccessResult('Weather effects calculated', {
      characterId,
      effects: modified,
      damage,
      exposureTime,
    });
  }

  private calculateWeatherEffects(weather: WeatherCondition): WeatherEffects {
    const baseEffects: WeatherEffects = {
      movementMultiplier: 1.0,
      visibilityRange: 0,
      combatPenalty: 0,
      spellcastingPenalty: 0,
      rangedAttackPenalty: 0,
      fireResistance: false,
      coldDamage: false,
      heatDamage: false,
    };

    switch (weather.type) {
      case 'clear':
        break;
      case 'overcast':
        baseEffects.visibilityRange = 1200;
        break;
      case 'light-rain':
      case 'drizzle':
        baseEffects.movementMultiplier = 0.9;
        baseEffects.rangedAttackPenalty = -1;
        baseEffects.fireResistance = true;
        break;
      case 'heavy-rain':
        baseEffects.movementMultiplier = 0.75;
        baseEffects.visibilityRange = 600;
        baseEffects.rangedAttackPenalty = -4;
        baseEffects.spellcastingPenalty = -1;
        baseEffects.fireResistance = true;
        break;
      case 'fog':
        baseEffects.movementMultiplier = 0.5;
        baseEffects.visibilityRange =
          weather.intensity === 'light' ? 120 : weather.intensity === 'moderate' ? 60 : 30;
        baseEffects.combatPenalty = -2;
        baseEffects.rangedAttackPenalty = -6;
        break;
      case 'light-snow':
        baseEffects.movementMultiplier = 0.8;
        baseEffects.visibilityRange = 900;
        baseEffects.rangedAttackPenalty = -2;
        baseEffects.fireResistance = true;
        break;
      case 'heavy-snow':
        baseEffects.movementMultiplier = 0.5;
        baseEffects.visibilityRange = 300;
        baseEffects.combatPenalty = -2;
        baseEffects.rangedAttackPenalty = -6;
        baseEffects.spellcastingPenalty = -2;
        baseEffects.fireResistance = true;
        break;
      case 'blizzard':
        baseEffects.movementMultiplier = 0.25;
        baseEffects.visibilityRange = 60;
        baseEffects.combatPenalty = -4;
        baseEffects.spellcastingPenalty = -3;
        baseEffects.rangedAttackPenalty = -8;
        baseEffects.fireResistance = true;
        baseEffects.coldDamage = true;
        break;
      case 'wind': {
        const windPenalty =
          weather.intensity === 'light'
            ? -1
            : weather.intensity === 'moderate'
              ? -2
              : weather.intensity === 'heavy'
                ? -3
                : -4;
        baseEffects.rangedAttackPenalty = windPenalty * 2;
        baseEffects.spellcastingPenalty = Math.abs(windPenalty) >= 3 ? -1 : 0;
        if (weather.intensity === 'severe') {
          baseEffects.movementMultiplier = 0.8;
          baseEffects.combatPenalty = -1;
        }
        break;
      }
      case 'storm':
        baseEffects.movementMultiplier = 0.3;
        baseEffects.visibilityRange = 300;
        baseEffects.combatPenalty = -3;
        baseEffects.spellcastingPenalty = -2;
        baseEffects.rangedAttackPenalty = -8;
        baseEffects.fireResistance = true;
        break;
    }

    return baseEffects;
  }

  private applyActivityModifications(
    effects: WeatherEffects,
    activityType: string
  ): WeatherEffects {
    const modified: WeatherEffects = { ...effects };
    switch (activityType) {
      case 'spellcasting':
        modified.spellcastingPenalty *= 2;
        break;
      case 'rest':
        modified.combatPenalty = Math.floor(modified.combatPenalty / 2);
        modified.spellcastingPenalty = Math.floor(modified.spellcastingPenalty / 2);
        break;
      case 'foraging':
        modified.combatPenalty *= 2;
        break;
    }
    return modified;
  }

  private calculateWeatherDamage(
    character: Character,
    weather: WeatherCondition,
    exposureTime: number
  ): number {
    let damage = 0;
    if (weather.temperature === 'freezing' && exposureTime >= 2) {
      const hasProtection = this.hasWeatherProtection(character, 'cold');
      if (!hasProtection) damage += DiceEngine.roll('1d4').total;
    }
    if (weather.temperature === 'scorching' && exposureTime >= 4) {
      const hasProtection = this.hasWeatherProtection(character, 'heat');
      if (!hasProtection) damage += DiceEngine.roll('1d6').total;
    }
    if (weather.type === 'blizzard' && exposureTime >= 1) {
      damage += Math.floor(exposureTime / 2);
    }
    return damage;
  }

  private hasWeatherProtection(character: Character, type: 'cold' | 'heat'): boolean {
    return character.inventory.some((item) => {
      if (type === 'cold') {
        return (
          item.name.toLowerCase().includes('cloak') ||
          item.name.toLowerCase().includes('fur') ||
          (item.magicBonus && item.name.toLowerCase().includes('resist'))
        );
      }
      return (
        item.name.toLowerCase().includes('hat') ||
        (item.magicBonus && item.name.toLowerCase().includes('resist'))
      );
    });
  }
}
