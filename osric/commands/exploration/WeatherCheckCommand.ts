/**
 * WeatherCheckCommand - Check weather effects on character activities
 *
 * Handles weather condition impacts on various activities:
 * - Travel speed modifications
 * - Combat penalties in adverse weather
 * - Spellcasting difficulties
 * - Environmental damage from extreme weather
 *
 * OSRIC Integration: Complete weather effect system from AD&D 1st Edition
 */

import { BaseCommand, type CommandResult } from '../../core/Command';
import { rollDice } from '../../core/Dice';
import type { GameContext } from '../../core/GameContext';
import { COMMAND_TYPES } from '../../types/constants';
import type { Character } from '../../types/entities';

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
  duration: number; // in hours
  temperature: 'freezing' | 'cold' | 'cool' | 'mild' | 'warm' | 'hot' | 'scorching';
}

export interface WeatherEffects {
  movementMultiplier: number; // 1.0 = normal, 0.5 = half speed
  visibilityRange: number; // in feet, 0 = normal outdoor visibility
  combatPenalty: number; // penalty to attack rolls
  spellcastingPenalty: number; // penalty to spell success
  rangedAttackPenalty: number; // additional penalty for ranged attacks
  fireResistance: boolean; // rain/snow provides fire resistance
  coldDamage: boolean; // freezing weather causes damage
  heatDamage: boolean; // scorching weather causes damage
}

export interface WeatherCheckParameters {
  characterId: string;
  currentWeather: WeatherCondition;
  activityType: 'travel' | 'combat' | 'spellcasting' | 'ranged-attack' | 'rest' | 'foraging';
  exposureTime?: number; // hours exposed to weather
}

export class WeatherCheckCommand extends BaseCommand {
  readonly type = COMMAND_TYPES.WEATHER_CHECK;

  constructor(private parameters: WeatherCheckParameters) {
    super(parameters.characterId, []);
  }

  async execute(context: GameContext): Promise<CommandResult> {
    try {
      const { characterId, currentWeather, activityType, exposureTime = 1 } = this.parameters;

      // Get the character
      const character = context.getEntity<Character>(characterId);
      if (!character) {
        return this.createFailureResult(`Character with ID "${characterId}" not found`);
      }

      // Calculate weather effects
      const effects = this.calculateWeatherEffects(currentWeather);

      // Apply activity-specific modifications
      const modifiedEffects = this.applyActivityModifications(effects, activityType);

      // Check for weather-related damage
      const weatherDamage = this.calculateWeatherDamage(character, currentWeather, exposureTime);

      // Determine status effects
      const statusEffects = this.determineStatusEffects(currentWeather, exposureTime);

      // Calculate modified movement rate
      const movementRate = character.movementRate * modifiedEffects.movementMultiplier;

      // Apply any damage to character
      let updatedCharacter = character;
      if (weatherDamage > 0) {
        updatedCharacter = {
          ...character,
          hitPoints: {
            ...character.hitPoints,
            current: Math.max(0, character.hitPoints.current - weatherDamage),
          },
        };
        context.setEntity(characterId, updatedCharacter);
      }

      // Generate descriptive message
      const message = this.createWeatherMessage(
        character,
        currentWeather,
        activityType,
        modifiedEffects,
        weatherDamage
      );

      // Prepare result data
      const resultData = {
        characterId,
        weather: currentWeather,
        activityType,
        effects: modifiedEffects,
        damage: weatherDamage,
        statusEffects,
        modifiedMovementRate: movementRate,
        exposureTime,
      };

      return this.createSuccessResult(message, resultData, statusEffects);
    } catch (error) {
      return this.createFailureResult(
        `Failed to check weather effects: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  canExecute(context: GameContext): boolean {
    const character = context.getEntity(this.parameters.characterId);
    return character !== null;
  }

  getRequiredRules(): string[] {
    return []; // This command implements its own logic
  }

  /**
   * Calculate base weather effects according to OSRIC rules
   */
  private calculateWeatherEffects(weather: WeatherCondition): WeatherEffects {
    const baseEffects: WeatherEffects = {
      movementMultiplier: 1.0,
      visibilityRange: 0, // 0 means normal visibility
      combatPenalty: 0,
      spellcastingPenalty: 0,
      rangedAttackPenalty: 0,
      fireResistance: false,
      coldDamage: false,
      heatDamage: false,
    };

    switch (weather.type) {
      case 'clear':
        // No penalties
        break;

      case 'overcast':
        baseEffects.visibilityRange = 1200; // Reduced visibility
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

  /**
   * Apply activity-specific modifications to weather effects
   */
  private applyActivityModifications(
    effects: WeatherEffects,
    activityType: string
  ): WeatherEffects {
    const modified = { ...effects };

    switch (activityType) {
      case 'travel':
        // Movement penalties apply fully
        break;

      case 'combat':
        // Combat penalties are the primary concern
        break;

      case 'spellcasting':
        // Double spellcasting penalties for focused casting
        modified.spellcastingPenalty *= 2;
        break;

      case 'ranged-attack':
        // Ranged attack penalties are critical
        break;

      case 'rest':
        // Halve most penalties during rest
        modified.combatPenalty = Math.floor(modified.combatPenalty / 2);
        modified.spellcastingPenalty = Math.floor(modified.spellcastingPenalty / 2);
        break;

      case 'foraging':
        // Weather severely impacts foraging success
        modified.combatPenalty *= 2; // Using combat penalty as general difficulty
        break;
    }

    return modified;
  }

  /**
   * Calculate weather-related damage from exposure
   */
  private calculateWeatherDamage(
    character: Character,
    weather: WeatherCondition,
    exposureTime: number
  ): number {
    let damage = 0;

    // Cold damage from freezing weather
    if (weather.temperature === 'freezing' && exposureTime >= 2) {
      const hasProtection = this.hasWeatherProtection(character, 'cold');
      if (!hasProtection) {
        damage += rollDice(1, 4).result; // 1d4 cold damage per exposure period
      }
    }

    // Heat damage from scorching weather
    if (weather.temperature === 'scorching' && exposureTime >= 4) {
      const hasProtection = this.hasWeatherProtection(character, 'heat');
      if (!hasProtection) {
        damage += rollDice(1, 6).result; // 1d6 heat damage per exposure period
      }
    }

    // Additional damage from severe weather conditions
    if (weather.type === 'blizzard' && exposureTime >= 1) {
      damage += Math.floor(exposureTime / 2); // Gradual damage from blizzard exposure
    }

    return damage;
  }

  /**
   * Check if character has appropriate weather protection
   */
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

  /**
   * Determine status effects from weather exposure
   */
  private determineStatusEffects(weather: WeatherCondition, exposureTime: number): string[] {
    const effects: string[] = [];

    if (weather.temperature === 'freezing' && exposureTime >= 4) {
      effects.push('Numb from Cold (-1 to all rolls)');
    }

    if (weather.temperature === 'scorching' && exposureTime >= 6) {
      effects.push('Heat Exhaustion (-2 to Strength and Dexterity)');
    }

    if (weather.type === 'fog' && weather.intensity === 'heavy') {
      effects.push('Disoriented (50% chance to move in wrong direction)');
    }

    if (weather.type === 'blizzard') {
      effects.push('Snow Blind (-4 to all sight-based actions)');
    }

    return effects;
  }

  /**
   * Create descriptive message for weather effects
   */
  private createWeatherMessage(
    character: Character,
    weather: WeatherCondition,
    activityType: string,
    effects: WeatherEffects,
    damage: number
  ): string {
    let message = `${character.name} is affected by ${weather.type} weather during ${activityType}. `;

    const penalties: string[] = [];
    if (effects.movementMultiplier < 1.0) {
      const reduction = Math.round((1.0 - effects.movementMultiplier) * 100);
      penalties.push(`movement reduced by ${reduction}%`);
    }

    if (effects.combatPenalty < 0) {
      penalties.push(`combat ${effects.combatPenalty}`);
    }

    if (effects.rangedAttackPenalty < 0) {
      penalties.push(`ranged attacks ${effects.rangedAttackPenalty}`);
    }

    if (effects.spellcastingPenalty < 0) {
      penalties.push(`spellcasting ${effects.spellcastingPenalty}`);
    }

    if (penalties.length > 0) {
      message += `Penalties: ${penalties.join(', ')}.`;
    }

    if (damage > 0) {
      message += ` Takes ${damage} weather damage.`;
    }

    if (effects.fireResistance) {
      message += ' Fire attacks are less effective.';
    }

    return message;
  }
}
