/**
 * ForagingCommand - Search for food and water in the wilderness
 *
 * Handles wilderness survival foraging including:
 * - Food gathering based on terrain and season
 * - Water location and quality assessment
 * - Foraging time and success rates
 * - Seasonal and terrain modifiers
 *
 * OSRIC Integration: Complete wilderness survival system
 */

import { BaseCommand, type CommandResult } from '../../core/Command';
import { rollDice } from '../../core/Dice';
import type { GameContext } from '../../core/GameContext';
import { COMMAND_TYPES } from '../../types/constants';
import type { Character } from '../../types/entities';

export interface ForagingParameters {
  characterId: string;
  forageType: 'food' | 'water' | 'both';
  terrain: string;
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  timeSpent: number; // hours spent foraging
  groupSize: number; // number of people to feed
  weatherConditions?: {
    type: string;
    impactsForaging: boolean;
  };
  hasForagingTools: boolean; // Snares, fishing equipment, etc.
}

export interface ForagingResult {
  foodFound: number; // days of food for one person
  waterFound: number; // gallons of water
  waterQuality: 'fresh' | 'brackish' | 'stagnant' | 'none';
  timeRequired: number; // actual time spent
  encountersRisked: boolean; // whether foraging attracted attention
  specialFinds: string[]; // herbs, medicinal plants, etc.
}

export class ForagingCommand extends BaseCommand {
  readonly type = COMMAND_TYPES.FORAGING;

  constructor(private parameters: ForagingParameters) {
    super(parameters.characterId, []);
  }

  async execute(context: GameContext): Promise<CommandResult> {
    try {
      const {
        characterId,
        forageType,
        terrain,
        season,
        timeSpent,
        groupSize,
        weatherConditions,
        hasForagingTools,
      } = this.parameters;

      // Get the character
      const character = context.getEntity<Character>(characterId);
      if (!character) {
        return this.createFailureResult(`Character with ID "${characterId}" not found`);
      }

      // Calculate foraging modifiers
      const modifiers = this.calculateForagingModifiers(
        character,
        terrain,
        season,
        weatherConditions,
        hasForagingTools
      );

      // Perform foraging attempts
      const foragingResult = this.performForaging(
        character,
        forageType,
        terrain,
        season,
        timeSpent,
        groupSize,
        modifiers
      );

      // Check for random encounters (foraging can attract attention)
      const encounterCheck = this.checkForEncounters(
        timeSpent,
        terrain,
        foragingResult.encountersRisked
      );

      // Apply fatigue if applicable
      const updatedCharacter = this.applyForagingFatigue(character, foragingResult.timeRequired);
      if (updatedCharacter !== character) {
        context.setEntity(characterId, updatedCharacter);
      }

      // Generate descriptive message
      const message = this.createForagingMessage(
        character,
        foragingResult,
        terrain,
        season,
        encounterCheck
      );

      // Prepare result data
      const resultData = {
        characterId,
        forageType,
        terrain,
        season,
        timeSpent: foragingResult.timeRequired,
        groupSize,
        result: foragingResult,
        modifiers,
        encounterRisk: encounterCheck,
      };

      const effects = [...foragingResult.specialFinds];
      if (encounterCheck.encounterOccurred) {
        effects.push(encounterCheck.description);
      }

      return this.createSuccessResult(message, resultData, effects);
    } catch (error) {
      return this.createFailureResult(
        `Failed to forage: ${error instanceof Error ? error.message : String(error)}`
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
   * Calculate modifiers for foraging success
   */
  private calculateForagingModifiers(
    character: Character,
    terrain: string,
    season: string,
    weather?: ForagingParameters['weatherConditions'],
    hasTools = false
  ): { total: number; breakdown: Record<string, number> } {
    const modifiers = {
      wisdom: 0,
      class: 0,
      terrain: 0,
      season: 0,
      weather: 0,
      tools: 0,
    };

    // Wisdom modifier
    modifiers.wisdom = Math.floor((character.abilities.wisdom - 10) / 2) * 5;

    // Class modifiers
    switch (character.class) {
      case 'Ranger':
        modifiers.class = 30; // Rangers are excellent foragers
        break;
      case 'Druid':
        modifiers.class = 25; // Druids know nature well
        break;
      case 'Fighter':
      case 'Paladin':
        modifiers.class = 5; // Basic outdoor training
        break;
      default:
        modifiers.class = 0; // Most classes have no special training
    }

    // Terrain modifiers
    const terrainMods: Record<string, number> = {
      forest: 20, // Rich in food and water sources
      jungle: 25, // Abundant but dangerous
      plains: 10, // Some food, limited water
      hills: 15, // Moderate resources
      mountains: 0, // Sparse resources
      desert: -30, // Very limited resources
      swamp: 10, // Water abundant, food questionable
      road: -20, // Heavily traveled areas are picked clean
    };
    modifiers.terrain = terrainMods[terrain.toLowerCase()] || 0;

    // Season modifiers
    const seasonMods: Record<string, number> = {
      spring: 10, // Growing season starts
      summer: 20, // Peak growing season
      autumn: 15, // Harvest time, nuts and fruits
      winter: -25, // Most food sources dormant
    };
    modifiers.season = seasonMods[season.toLowerCase()] || 0;

    // Weather modifiers
    if (weather?.impactsForaging) {
      modifiers.weather = -15; // Bad weather makes foraging harder
    }

    // Tools bonus
    if (hasTools) {
      modifiers.tools = 15; // Proper tools help significantly
    }

    const total = Object.values(modifiers).reduce((sum, val) => sum + val, 0);

    return { total, breakdown: modifiers };
  }

  /**
   * Perform the actual foraging attempt
   */
  private performForaging(
    character: Character,
    forageType: string,
    terrain: string,
    season: string,
    timeSpent: number,
    _groupSize: number,
    modifiers: { total: number }
  ): ForagingResult {
    const result: ForagingResult = {
      foodFound: 0,
      waterFound: 0,
      waterQuality: 'none',
      timeRequired: timeSpent,
      encountersRisked: false,
      specialFinds: [],
    };

    // Base success rates
    const baseFoodChance = 40;
    const baseWaterChance = 60;

    // Calculate final success chances
    const foodChance = Math.max(5, Math.min(95, baseFoodChance + modifiers.total));
    const waterChance = Math.max(5, Math.min(95, baseWaterChance + modifiers.total));

    // Food foraging
    if (forageType === 'food' || forageType === 'both') {
      const foodRoll = rollDice(1, 100).result;
      if (foodRoll <= foodChance) {
        // Success! Calculate amount found
        result.foodFound = this.calculateFoodYield(
          terrain,
          season,
          timeSpent,
          character.abilities.wisdom
        );

        // Check for special finds (herbs, medicinal plants, etc.)
        if (rollDice(1, 20).result <= 3) {
          result.specialFinds.push(this.generateSpecialFind(terrain, season));
        }
      }
    }

    // Water foraging
    if (forageType === 'water' || forageType === 'both') {
      const waterRoll = rollDice(1, 100).result;
      if (waterRoll <= waterChance) {
        // Success! Calculate amount and quality
        const waterResult = this.calculateWaterYield(terrain, season, timeSpent);
        result.waterFound = waterResult.amount;
        result.waterQuality = waterResult.quality;
      }
    }

    // Determine if foraging attracted unwanted attention
    result.encountersRisked = timeSpent >= 4 || (forageType === 'both' && timeSpent >= 2);

    // Adjust time based on success/failure
    if ((forageType === 'food' || forageType === 'both') && result.foodFound === 0) {
      result.timeRequired += 1; // Extra time spent on failed attempts
    }

    return result;
  }

  /**
   * Calculate amount of food found
   */
  private calculateFoodYield(
    terrain: string,
    season: string,
    timeSpent: number,
    wisdom: number
  ): number {
    // Base yield per hour of foraging
    let baseYield = 0.2; // 0.2 days worth of food per hour

    // Terrain modifiers
    const terrainYields: Record<string, number> = {
      forest: 1.5,
      jungle: 2.0,
      plains: 1.0,
      hills: 1.2,
      mountains: 0.5,
      desert: 0.2,
      swamp: 0.8,
    };
    baseYield *= terrainYields[terrain.toLowerCase()] || 1.0;

    // Season modifiers
    const seasonYields: Record<string, number> = {
      spring: 0.8,
      summer: 1.3,
      autumn: 1.5,
      winter: 0.3,
    };
    baseYield *= seasonYields[season.toLowerCase()] || 1.0;

    // Wisdom bonus
    const wisdomBonus = Math.max(0, Math.floor((wisdom - 10) / 2)) * 0.1;
    baseYield += wisdomBonus;

    // Calculate total yield
    const totalYield = baseYield * timeSpent;

    // Add some randomness
    const variance = rollDice(1, 6).result / 10; // 0.1 to 0.6

    return Math.round(totalYield * (0.7 + variance) * 10) / 10;
  }

  /**
   * Calculate water found and its quality
   */
  private calculateWaterYield(
    terrain: string,
    season: string,
    timeSpent: number
  ): { amount: number; quality: 'fresh' | 'brackish' | 'stagnant' } {
    let baseAmount = 2; // gallons per hour
    let quality: 'fresh' | 'brackish' | 'stagnant' = 'fresh';

    // Terrain affects both amount and quality
    switch (terrain.toLowerCase()) {
      case 'forest':
        baseAmount = 3;
        quality = 'fresh';
        break;
      case 'jungle':
        baseAmount = 4;
        quality = rollDice(1, 6).result <= 2 ? 'stagnant' : 'fresh';
        break;
      case 'plains':
        baseAmount = 1;
        quality = 'fresh';
        break;
      case 'hills':
        baseAmount = 2;
        quality = 'fresh';
        break;
      case 'mountains':
        baseAmount = 1.5;
        quality = 'fresh';
        break;
      case 'desert':
        baseAmount = 0.2;
        quality = rollDice(1, 6).result <= 4 ? 'brackish' : 'fresh';
        break;
      case 'swamp':
        baseAmount = 5;
        quality = rollDice(1, 6).result <= 3 ? 'stagnant' : 'brackish';
        break;
    }

    // Season affects availability
    const seasonMultipliers: Record<string, number> = {
      spring: 1.3,
      summer: 0.8,
      autumn: 1.0,
      winter: 0.6,
    };
    baseAmount *= seasonMultipliers[season.toLowerCase()] || 1.0;

    const totalAmount = baseAmount * timeSpent;
    return { amount: Math.round(totalAmount * 10) / 10, quality };
  }

  /**
   * Generate special finds during foraging
   */
  private generateSpecialFind(terrain: string, season: string): string {
    const finds: Record<string, string[]> = {
      forest: ['Healing herbs', 'Edible mushrooms', 'Wild honey', 'Medicinal bark'],
      jungle: ['Exotic fruits', 'Poison antidote plants', 'Rare spices', 'Climbing vines'],
      plains: [
        'Wild grains',
        'Prairie flowers',
        'Small game trail signs',
        'Dried grass for tinder',
      ],
      hills: [
        'Cave shelter location',
        'Mineral deposits',
        'Rocky outcrop vantage point',
        'Wild berries',
      ],
      mountains: [
        'Mountain spring source',
        'Shelter cave',
        'Climbing route markers',
        'Rare alpine plants',
      ],
      desert: [
        'Cactus fruit',
        'Underground water signs',
        'Shade shelter location',
        'Salt deposits',
      ],
      swamp: ['Edible roots', 'Waterproof materials', 'Dry ground location', 'Useful marsh plants'],
    };

    const terrainFinds = finds[terrain.toLowerCase()] || finds.plains;
    const randomFind = terrainFinds[rollDice(1, terrainFinds.length).result - 1];

    return `Found: ${randomFind} (${season})`;
  }

  /**
   * Check for encounters during foraging
   */
  private checkForEncounters(
    timeSpent: number,
    terrain: string,
    risked: boolean
  ): { encounterOccurred: boolean; description: string } {
    if (!risked) {
      return { encounterOccurred: false, description: 'No encounter risk' };
    }

    // Base encounter chance increases with time
    const baseChance = Math.min(30, timeSpent * 3);

    // Terrain modifiers
    const terrainMods: Record<string, number> = {
      jungle: 10,
      forest: 5,
      swamp: 8,
      mountains: 3,
      hills: 2,
      plains: 1,
      desert: 4,
    };

    const encounterChance = baseChance + (terrainMods[terrain.toLowerCase()] || 0);

    const roll = rollDice(1, 100).result;
    const occurred = roll <= encounterChance;

    return {
      encounterOccurred: occurred,
      description: occurred
        ? `Foraging attracted unwanted attention (${terrain})`
        : 'Foraged safely',
    };
  }

  /**
   * Apply fatigue from extended foraging
   */
  private applyForagingFatigue(character: Character, timeSpent: number): Character {
    if (timeSpent < 6) {
      return character; // No fatigue for short foraging
    }

    // Foraging is tiring work
    const fatiguePoints = Math.floor((timeSpent - 4) / 2);

    if (fatiguePoints > 0) {
      return {
        ...character,
        hitPoints: {
          ...character.hitPoints,
          current: Math.max(1, character.hitPoints.current - fatiguePoints),
        },
      };
    }

    return character;
  }

  /**
   * Create descriptive message for foraging results
   */
  private createForagingMessage(
    character: Character,
    result: ForagingResult,
    terrain: string,
    season: string,
    encounter: { encounterOccurred: boolean; description: string }
  ): string {
    let message = `${character.name} spends ${result.timeRequired} hours foraging in ${terrain} during ${season}. `;

    if (result.foodFound > 0) {
      message += `Found ${result.foodFound} days worth of food. `;
    } else {
      message += 'Found no usable food. ';
    }

    if (result.waterFound > 0) {
      message += `Located ${result.waterFound} gallons of ${result.waterQuality} water. `;
    } else if (result.waterQuality !== 'none') {
      message += 'Found no water sources. ';
    }

    if (result.specialFinds.length > 0) {
      message += `Special discoveries: ${result.specialFinds.join(', ')}. `;
    }

    if (encounter.encounterOccurred) {
      message += encounter.description;
    }

    return message;
  }

  /**
   * Predefined terrain types for foraging calculations
   */
  static readonly FORAGING_TERRAIN_DATA = {
    forest: { foodAbundance: 'high', waterAvailability: 'high', dangerLevel: 'moderate' },
    jungle: { foodAbundance: 'very high', waterAvailability: 'high', dangerLevel: 'high' },
    plains: { foodAbundance: 'moderate', waterAvailability: 'low', dangerLevel: 'low' },
    hills: { foodAbundance: 'moderate', waterAvailability: 'moderate', dangerLevel: 'low' },
    mountains: { foodAbundance: 'low', waterAvailability: 'moderate', dangerLevel: 'moderate' },
    desert: { foodAbundance: 'very low', waterAvailability: 'very low', dangerLevel: 'high' },
    swamp: { foodAbundance: 'low', waterAvailability: 'high', dangerLevel: 'high' },
    road: { foodAbundance: 'very low', waterAvailability: 'low', dangerLevel: 'low' },
  };
}
