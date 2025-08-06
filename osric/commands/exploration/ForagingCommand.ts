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
  timeSpent: number;
  groupSize: number;
  weatherConditions?: {
    type: string;
    impactsForaging: boolean;
  };
  hasForagingTools: boolean;
}

export interface ForagingResult {
  foodFound: number;
  waterFound: number;
  waterQuality: 'fresh' | 'brackish' | 'stagnant' | 'none';
  timeRequired: number;
  encountersRisked: boolean;
  specialFinds: string[];
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

      const character = context.getEntity<Character>(characterId);
      if (!character) {
        return this.createFailureResult(`Character with ID "${characterId}" not found`);
      }

      const modifiers = this.calculateForagingModifiers(
        character,
        terrain,
        season,
        weatherConditions,
        hasForagingTools
      );

      const foragingResult = this.performForaging(
        character,
        forageType,
        terrain,
        season,
        timeSpent,
        groupSize,
        modifiers
      );

      const encounterCheck = this.checkForEncounters(
        timeSpent,
        terrain,
        foragingResult.encountersRisked
      );

      const updatedCharacter = this.applyForagingFatigue(character, foragingResult.timeRequired);
      if (updatedCharacter !== character) {
        context.setEntity(characterId, updatedCharacter);
      }

      const message = this.createForagingMessage(
        character,
        foragingResult,
        terrain,
        season,
        encounterCheck
      );

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
    return [];
  }

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

    modifiers.wisdom = Math.floor((character.abilities.wisdom - 10) / 2) * 5;

    switch (character.class) {
      case 'Ranger':
        modifiers.class = 30;
        break;
      case 'Druid':
        modifiers.class = 25;
        break;
      case 'Fighter':
      case 'Paladin':
        modifiers.class = 5;
        break;
      default:
        modifiers.class = 0;
    }

    const terrainMods: Record<string, number> = {
      forest: 20,
      jungle: 25,
      plains: 10,
      hills: 15,
      mountains: 0,
      desert: -30,
      swamp: 10,
      road: -20,
    };
    modifiers.terrain = terrainMods[terrain.toLowerCase()] || 0;

    const seasonMods: Record<string, number> = {
      spring: 10,
      summer: 20,
      autumn: 15,
      winter: -25,
    };
    modifiers.season = seasonMods[season.toLowerCase()] || 0;

    if (weather?.impactsForaging) {
      modifiers.weather = -15;
    }

    if (hasTools) {
      modifiers.tools = 15;
    }

    const total = Object.values(modifiers).reduce((sum, val) => sum + val, 0);

    return { total, breakdown: modifiers };
  }

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

    const baseFoodChance = 40;
    const baseWaterChance = 60;

    const foodChance = Math.max(5, Math.min(95, baseFoodChance + modifiers.total));
    const waterChance = Math.max(5, Math.min(95, baseWaterChance + modifiers.total));

    if (forageType === 'food' || forageType === 'both') {
      const foodRoll = rollDice(1, 100).result;
      if (foodRoll <= foodChance) {
        result.foodFound = this.calculateFoodYield(
          terrain,
          season,
          timeSpent,
          character.abilities.wisdom
        );

        if (rollDice(1, 20).result <= 3) {
          result.specialFinds.push(this.generateSpecialFind(terrain, season));
        }
      }
    }

    if (forageType === 'water' || forageType === 'both') {
      const waterRoll = rollDice(1, 100).result;
      if (waterRoll <= waterChance) {
        const waterResult = this.calculateWaterYield(terrain, season, timeSpent);
        result.waterFound = waterResult.amount;
        result.waterQuality = waterResult.quality;
      }
    }

    result.encountersRisked = timeSpent >= 4 || (forageType === 'both' && timeSpent >= 2);

    if ((forageType === 'food' || forageType === 'both') && result.foodFound === 0) {
      result.timeRequired += 1;
    }

    return result;
  }

  private calculateFoodYield(
    terrain: string,
    season: string,
    timeSpent: number,
    wisdom: number
  ): number {
    let baseYield = 0.2;

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

    const seasonYields: Record<string, number> = {
      spring: 0.8,
      summer: 1.3,
      autumn: 1.5,
      winter: 0.3,
    };
    baseYield *= seasonYields[season.toLowerCase()] || 1.0;

    const wisdomBonus = Math.max(0, Math.floor((wisdom - 10) / 2)) * 0.1;
    baseYield += wisdomBonus;

    const totalYield = baseYield * timeSpent;

    const variance = rollDice(1, 6).result / 10;

    return Math.round(totalYield * (0.7 + variance) * 10) / 10;
  }

  private calculateWaterYield(
    terrain: string,
    season: string,
    timeSpent: number
  ): { amount: number; quality: 'fresh' | 'brackish' | 'stagnant' } {
    let baseAmount = 2;
    let quality: 'fresh' | 'brackish' | 'stagnant' = 'fresh';

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

  private checkForEncounters(
    timeSpent: number,
    terrain: string,
    risked: boolean
  ): { encounterOccurred: boolean; description: string } {
    if (!risked) {
      return { encounterOccurred: false, description: 'No encounter risk' };
    }

    const baseChance = Math.min(30, timeSpent * 3);

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

  private applyForagingFatigue(character: Character, timeSpent: number): Character {
    if (timeSpent < 6) {
      return character;
    }

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
