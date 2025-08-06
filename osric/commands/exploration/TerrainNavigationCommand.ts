/**
 * TerrainNavigationCommand - Navigate through different terrain types
 *
 * Handles terrain-based navigation including:
 * - Movement rate modifications by terrain type
 * - Getting lost in difficult terrain
 * - Route finding and navigation checks
 * - Time calculations for overland travel
 *
 * OSRIC Integration: Complete wilderness navigation system
 */

import { BaseCommand, type CommandResult } from '../../core/Command';
import { rollDice } from '../../core/Dice';
import type { GameContext } from '../../core/GameContext';
import { COMMAND_TYPES } from '../../types/constants';
import type { Character } from '../../types/entities';

export interface TerrainType {
  name: string;
  movementModifier: number; // Multiplier for movement rate (1.0 = normal)
  gettingLostChance: number; // Base percentage chance of getting lost
  visibilityDistance: number; // Maximum visibility in this terrain (in feet)
  description: string;
}

export interface NavigationParameters {
  characterId: string;
  terrainType: TerrainType;
  distance: number; // Distance to travel in miles
  navigationMethod: 'landmark' | 'compass' | 'stars' | 'ranger-tracking' | 'none';
  weatherConditions?: {
    visibility: number; // Current visibility in feet
    movementPenalty: number; // Weather-based movement penalty
  };
  hasMap: boolean;
  timeOfDay: 'dawn' | 'day' | 'dusk' | 'night';
}

export class TerrainNavigationCommand extends BaseCommand {
  readonly type = COMMAND_TYPES.TERRAIN_NAVIGATION;

  constructor(private parameters: NavigationParameters) {
    super(parameters.characterId, []);
  }

  async execute(context: GameContext): Promise<CommandResult> {
    try {
      const {
        characterId,
        terrainType,
        distance,
        navigationMethod,
        weatherConditions,
        hasMap,
        timeOfDay,
      } = this.parameters;

      // Get the character
      const character = context.getEntity<Character>(characterId);
      if (!character) {
        return this.createFailureResult(`Character with ID "${characterId}" not found`);
      }

      // Calculate movement rate with terrain and weather modifiers
      const baseMovementRate = character.movementRate;
      let effectiveMovementRate = baseMovementRate * terrainType.movementModifier;

      if (weatherConditions) {
        effectiveMovementRate *= 1 + weatherConditions.movementPenalty / 100;
      }

      // Calculate travel time
      const travelTime = this.calculateTravelTime(distance, effectiveMovementRate);

      // Check for getting lost
      const navigationResult = this.checkNavigation(
        character,
        terrainType,
        navigationMethod,
        weatherConditions,
        hasMap,
        timeOfDay
      );

      // Calculate actual distance covered (may be longer if lost)
      const actualDistance = navigationResult.gotLost
        ? distance * navigationResult.extraDistanceMultiplier
        : distance;
      const actualTime = navigationResult.gotLost
        ? {
            hours: travelTime.hours * navigationResult.extraDistanceMultiplier,
            description: `${Math.round(travelTime.hours * navigationResult.extraDistanceMultiplier * 10) / 10} hours (got lost)`,
          }
        : travelTime;

      // Generate encounters or interesting events
      const events = this.generateTravelEvents(character, terrainType, actualTime);

      // Apply fatigue if applicable
      const updatedCharacter = this.applyTravelFatigue(character, actualTime, terrainType);
      if (updatedCharacter !== character) {
        context.setEntity(characterId, updatedCharacter);
      }

      // Generate descriptive message
      const message = this.createNavigationMessage(
        character,
        terrainType,
        distance,
        actualDistance,
        travelTime,
        actualTime,
        navigationResult,
        events
      );

      // Prepare result data
      const resultData = {
        characterId,
        terrainType: terrainType.name,
        plannedDistance: distance,
        actualDistance,
        plannedTime: travelTime,
        actualTime,
        effectiveMovementRate,
        navigationResult,
        events,
        weatherImpact: weatherConditions ? 'affected' : 'none',
      };

      return this.createSuccessResult(
        message,
        resultData,
        events.map((e) => e.description)
      );
    } catch (error) {
      return this.createFailureResult(
        `Failed to navigate terrain: ${error instanceof Error ? error.message : String(error)}`
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
   * Calculate travel time based on distance and movement rate
   */
  private calculateTravelTime(
    distance: number,
    movementRate: number
  ): { hours: number; description: string } {
    // OSRIC: Standard overland movement is 24 miles per day for humans
    // Movement rate affects this proportionally
    const baseHumanRate = 120; // 12" movement rate for humans
    const dailyDistance = 24 * (movementRate / baseHumanRate);

    const hours = (distance / dailyDistance) * 24;

    let description: string;
    if (hours < 1) {
      description = `${Math.round(hours * 60)} minutes`;
    } else if (hours < 24) {
      description = `${Math.round(hours * 10) / 10} hours`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = Math.round(hours % 24);
      description = `${days} day${days > 1 ? 's' : ''}${remainingHours > 0 ? ` and ${remainingHours} hours` : ''}`;
    }

    return { hours, description };
  }

  /**
   * Check for navigation success and getting lost
   */
  private checkNavigation(
    character: Character,
    terrain: TerrainType,
    method: string,
    weather?: NavigationParameters['weatherConditions'],
    hasMap = false,
    timeOfDay = 'day'
  ): {
    gotLost: boolean;
    extraDistanceMultiplier: number;
    navigationBonus: number;
    details: string;
  } {
    const baseChance = terrain.gettingLostChance;
    let navigationBonus = 0;

    // Apply navigation method modifiers
    switch (method) {
      case 'compass':
        navigationBonus += 25;
        break;
      case 'stars':
        if (timeOfDay === 'night') {
          navigationBonus += 20;
        } else {
          navigationBonus -= 10; // Can't use stars during day
        }
        break;
      case 'landmark':
        navigationBonus += 15;
        break;
      case 'ranger-tracking':
        if (character.class === 'Ranger') {
          navigationBonus += 30;
        } else {
          navigationBonus += 10; // Basic tracking knowledge
        }
        break;
      case 'none':
        navigationBonus -= 20;
        break;
    }

    // Map bonus
    if (hasMap) {
      navigationBonus += 20;
    }

    // Wisdom modifier
    const wisdomMod = Math.floor((character.abilities.wisdom - 10) / 2);
    navigationBonus += wisdomMod * 5;

    // Weather penalties
    if (weather) {
      if (weather.visibility < 1000) {
        navigationBonus -= 20;
      } else if (weather.visibility < 3000) {
        navigationBonus -= 10;
      }
    }

    // Time of day penalties
    if (timeOfDay === 'night' && method !== 'stars') {
      navigationBonus -= 15;
    } else if (timeOfDay === 'dusk' || timeOfDay === 'dawn') {
      navigationBonus -= 5;
    }

    // Calculate final chance of getting lost
    const finalChance = Math.max(1, Math.min(95, baseChance - navigationBonus));

    // Roll for getting lost
    const roll = rollDice(1, 100).result;
    const gotLost = roll <= finalChance;

    // If lost, determine how much extra distance
    let extraDistanceMultiplier = 1.0;
    if (gotLost) {
      const severity = rollDice(1, 6).result;
      extraDistanceMultiplier = 1.0 + severity * 0.2; // 1.2x to 2.2x distance
    }

    const details = gotLost
      ? `Lost in ${terrain.name} (rolled ${roll} vs ${finalChance}), extra distance: ${Math.round((extraDistanceMultiplier - 1) * 100)}%`
      : `Successfully navigated (rolled ${roll} vs ${finalChance})`;

    return { gotLost, extraDistanceMultiplier, navigationBonus, details };
  }

  /**
   * Generate random travel events based on terrain and time
   */
  private generateTravelEvents(
    character: Character,
    terrain: TerrainType,
    travelTime: { hours: number }
  ): Array<{ type: string; description: string }> {
    const events: Array<{ type: string; description: string }> = [];

    // Chance for events increases with travel time
    const eventChance = Math.min(50, travelTime.hours * 2);

    if (rollDice(1, 100).result <= eventChance) {
      const eventType = this.determineEventType(terrain);
      events.push(this.generateEvent(character, terrain, eventType));
    }

    return events;
  }

  /**
   * Determine what type of event occurs based on terrain
   */
  private determineEventType(terrain: TerrainType): string {
    const roll = rollDice(1, 20).result;

    // Event tables vary by terrain type
    if (terrain.name.toLowerCase().includes('forest')) {
      if (roll <= 5) return 'animal-encounter';
      if (roll <= 8) return 'natural-obstacle';
      if (roll <= 12) return 'weather-change';
      if (roll <= 15) return 'discovery';
      return 'peaceful-travel';
    }

    if (terrain.name.toLowerCase().includes('mountain')) {
      if (roll <= 4) return 'dangerous-path';
      if (roll <= 7) return 'altitude-effects';
      if (roll <= 10) return 'weather-change';
      if (roll <= 13) return 'animal-encounter';
      if (roll <= 16) return 'discovery';
      return 'peaceful-travel';
    }

    if (terrain.name.toLowerCase().includes('desert')) {
      if (roll <= 6) return 'heat-exhaustion';
      if (roll <= 9) return 'sandstorm';
      if (roll <= 12) return 'oasis-discovery';
      if (roll <= 15) return 'mirage';
      return 'peaceful-travel';
    }

    // Plains, roads, etc.
    if (roll <= 3) return 'animal-encounter';
    if (roll <= 6) return 'weather-change';
    if (roll <= 10) return 'discovery';
    if (roll <= 13) return 'fellow-travelers';
    return 'peaceful-travel';
  }

  /**
   * Generate a specific event based on type
   */
  private generateEvent(
    _character: Character,
    terrain: TerrainType,
    eventType: string
  ): { type: string; description: string } {
    switch (eventType) {
      case 'animal-encounter':
        return {
          type: eventType,
          description: `Encountered wildlife typical of ${terrain.name}. Roll for reaction.`,
        };

      case 'natural-obstacle':
        return {
          type: eventType,
          description: 'Path blocked by fallen trees or rockslide. Requires detour or removal.',
        };

      case 'weather-change':
        return {
          type: eventType,
          description: 'Weather conditions change significantly during travel.',
        };

      case 'discovery':
        return {
          type: eventType,
          description: `Found interesting landmark or minor feature in ${terrain.name}.`,
        };

      case 'dangerous-path':
        return {
          type: eventType,
          description: 'Treacherous mountain path requires careful navigation or climbing.',
        };

      case 'heat-exhaustion':
        return {
          type: eventType,
          description: 'Extreme heat causes fatigue. Constitution check required.',
        };

      case 'fellow-travelers':
        return {
          type: eventType,
          description: 'Met other travelers on the road. Roll for reaction and news.',
        };

      default:
        return {
          type: 'peaceful-travel',
          description: `Uneventful travel through ${terrain.name}.`,
        };
    }
  }

  /**
   * Apply fatigue effects from long travel
   */
  private applyTravelFatigue(
    character: Character,
    travelTime: { hours: number },
    terrain: TerrainType
  ): Character {
    // No fatigue for short trips
    if (travelTime.hours < 8) {
      return character;
    }

    // Calculate fatigue based on time and terrain difficulty
    const fatigueHours = travelTime.hours - 8; // First 8 hours are free
    const terrainDifficulty = 2.0 - terrain.movementModifier; // Higher number = more difficult
    const fatiguePoints = Math.floor(fatigueHours * terrainDifficulty);

    if (fatiguePoints > 0) {
      // In a real implementation, this would apply temporary ability score penalties
      // For now, we'll just note the fatigue in the character's temporary conditions
      return {
        ...character,
        // This would need a proper fatigue system implementation
        hitPoints: {
          ...character.hitPoints,
          current: Math.max(1, character.hitPoints.current - Math.floor(fatiguePoints / 2)),
        },
      };
    }

    return character;
  }

  /**
   * Create descriptive message for navigation result
   */
  private createNavigationMessage(
    character: Character,
    terrain: TerrainType,
    plannedDistance: number,
    actualDistance: number,
    _plannedTime: { hours: number; description: string },
    actualTime: { hours: number; description: string },
    navigationResult: ReturnType<typeof this.checkNavigation>,
    events: Array<{ type: string; description: string }>
  ): string {
    let message = `${character.name} travels ${plannedDistance} miles through ${terrain.name}. `;

    if (navigationResult.gotLost) {
      message += `Got lost and actually traveled ${Math.round(actualDistance * 10) / 10} miles in ${actualTime.description}. `;
    } else {
      message += `Successfully navigated in ${actualTime.description}. `;
    }

    if (events.length > 0) {
      message += `Events: ${events.map((e) => e.description).join('; ')}.`;
    }

    return message;
  }

  /**
   * Predefined terrain types with OSRIC-authentic values
   */
  static readonly TERRAIN_TYPES: Record<string, TerrainType> = {
    road: {
      name: 'Road',
      movementModifier: 1.5, // Roads increase movement speed
      gettingLostChance: 5,
      visibilityDistance: 3000,
      description: 'Well-maintained road with clear path',
    },
    plains: {
      name: 'Plains',
      movementModifier: 1.0,
      gettingLostChance: 10,
      visibilityDistance: 6000,
      description: 'Open grassland with few landmarks',
    },
    forest: {
      name: 'Forest',
      movementModifier: 0.5,
      gettingLostChance: 30,
      visibilityDistance: 300,
      description: 'Dense woodland with limited visibility',
    },
    hills: {
      name: 'Hills',
      movementModifier: 0.75,
      gettingLostChance: 20,
      visibilityDistance: 1200,
      description: 'Rolling hills with moderate terrain',
    },
    mountains: {
      name: 'Mountains',
      movementModifier: 0.33,
      gettingLostChance: 40,
      visibilityDistance: 9000,
      description: 'Steep mountain terrain requiring careful navigation',
    },
    desert: {
      name: 'Desert',
      movementModifier: 0.67,
      gettingLostChance: 35,
      visibilityDistance: 12000,
      description: 'Arid wasteland with shifting sands',
    },
    swamp: {
      name: 'Swamp',
      movementModifier: 0.25,
      gettingLostChance: 50,
      visibilityDistance: 150,
      description: 'Treacherous wetland with poor footing',
    },
    jungle: {
      name: 'Jungle',
      movementModifier: 0.25,
      gettingLostChance: 60,
      visibilityDistance: 60,
      description: 'Dense tropical forest with extremely limited visibility',
    },
  };
}
