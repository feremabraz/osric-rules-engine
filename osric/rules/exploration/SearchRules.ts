import type { Command } from '@osric/core/Command';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, isFailure, isSuccess } from '@osric/core/Rule';
import type { RuleResult } from '@osric/core/Rule';
import type { CharacterId } from '@osric/types';
import type { Character } from '@osric/types/character';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';

interface SearchRequest {
  characterId: string | CharacterId;
  searchType: 'secret_doors' | 'hidden_objects' | 'traps' | 'tracks' | 'general';
  area: string;
  timeSpent: number;
  thoroughness: 'hasty' | 'normal' | 'careful' | 'meticulous';
  assistingCharacterIds?: Array<string | CharacterId>;
}

interface SearchResult {
  kind: 'success' | 'failure';
  foundItems: string[];
  timeRequired: number;
  discoveryDetails: string[];
  fatigueGained: number;
  message: string;
}

export class SearchRule extends BaseRule {
  readonly name = RULE_NAMES.SEARCH_MECHANICS;

  canApply(context: GameContext, command: Command): boolean {
    if (command.type !== COMMAND_TYPES.SEARCH) {
      return false;
    }

    const data = context.getTemporary<SearchRequest>('search-request-params');
    if (!data?.characterId || !data?.searchType) {
      return false;
    }

    const character = context.getEntity<Character>(data.characterId);
    return character !== undefined;
  }

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const data = context.getTemporary<SearchRequest>('search-request-params');

    if (!data) {
      return this.createFailureResult('No search request data provided');
    }

    const character = context.getEntity<Character>(data.characterId);

    if (!character) {
      return this.createFailureResult('Character not found');
    }

    const validation = this.validateSearch(character, data);
    if (isFailure(validation)) {
      return this.createFailureResult(validation.message);
    }

    const result = this.performSearch(character, data, context);

    if (isSuccess(result)) {
      this.applySearchEffects(character, result, context);
    }

    return this.createSuccessResult(result.message, { result });
  }

  private validateSearch(
    character: Character,
    data: SearchRequest
  ): { kind: 'success' | 'failure'; message: string } {
    if (character.hitPoints.current <= 0) {
      return { kind: 'failure', message: 'Character is unconscious or dead' };
    }

    const hinderingEffects =
      character.statusEffects?.filter(
        (effect) =>
          effect.name.includes('blind') ||
          effect.name.includes('charm') ||
          effect.name.includes('confus')
      ) || [];

    if (hinderingEffects.length > 0) {
      return {
        kind: 'failure',
        message: `Cannot search effectively due to: ${hinderingEffects.map((e) => e.name).join(', ')}`,
      };
    }

    const minTime = this.getMinimumSearchTime(data.searchType, data.thoroughness);
    if (data.timeSpent < minTime) {
      return {
        kind: 'failure',
        message: `${data.searchType} requires at least ${minTime} rounds for ${data.thoroughness} search`,
      };
    }

    return { kind: 'success', message: 'Search is valid' };
  }

  private performSearch(
    character: Character,
    data: SearchRequest,
    context: GameContext
  ): SearchResult {
    const baseChance = this.getBaseSearchChance(character, data.searchType);
    const racialModifier = this.getRacialSearchModifier(character, data.searchType);
    const classModifier = this.getClassSearchModifier(character, data.searchType);
    const thoroughnessModifier = this.getThoroughnessModifier(data.thoroughness);
    const timeModifier = this.getTimeModifier(data.timeSpent, data.searchType);
    const assistanceModifier = this.getAssistanceModifier(data.assistingCharacterIds, context);

    const totalModifier =
      racialModifier + classModifier + thoroughnessModifier + timeModifier + assistanceModifier;
    const finalChance = Math.min(95, Math.max(5, baseChance + totalModifier));

    const roll = Math.random() * 100;
    const succeeded = roll <= finalChance;

    const timeRequired = this.calculateActualSearchTime(data.timeSpent, data.thoroughness);
    const fatigueGained = this.calculateSearchFatigue(character, timeRequired);

    if (succeeded) {
      const foundItems = this.determineFoundItems(data.searchType, data.area);
      const discoveryDetails = this.generateDiscoveryDetails(foundItems, data.searchType);

      return {
        kind: 'success',
        foundItems,
        timeRequired,
        discoveryDetails,
        fatigueGained,
        message: `Search successful! Found: ${foundItems.join(', ')}`,
      };
    }

    return {
      kind: 'failure',
      foundItems: [],
      timeRequired,
      discoveryDetails: ['No significant discoveries made'],
      fatigueGained,
      message: 'Search completed but nothing of interest was found',
    };
  }

  private getBaseSearchChance(character: Character, searchType: string): number {
    const baseChances: Record<string, number> = {
      secret_doors: 16.67,
      hidden_objects: 25,
      traps: 16.67,
      tracks: 25,
      general: 50,
    };

    const baseChance = baseChances[searchType] || 25;

    const intModifier = this.getIntelligenceSearchModifier(character.abilities.intelligence);

    return baseChance + intModifier;
  }

  private getIntelligenceSearchModifier(intelligence: number): number {
    if (intelligence >= 18) return 15;
    if (intelligence >= 16) return 10;
    if (intelligence >= 14) return 5;
    if (intelligence >= 9) return 0;
    if (intelligence >= 7) return -5;
    return -10;
  }

  private getRacialSearchModifier(character: Character, searchType: string): number {
    const modifiers: Record<string, Record<string, number>> = {
      Elf: {
        secret_doors: 50,
        hidden_objects: 20,
      },
      'Half-Elf': {
        secret_doors: 25,
        hidden_objects: 10,
      },
      Dwarf: {
        traps: 20,
        secret_doors: 10,
      },
      Halfling: {
        hidden_objects: 15,
        traps: 10,
      },
      Gnome: {
        traps: 15,
        hidden_objects: 10,
      },
    };

    return modifiers[character.race]?.[searchType] || 0;
  }

  private getClassSearchModifier(character: Character, searchType: string): number {
    const modifiers: Record<string, Record<string, number>> = {
      Thief: {
        traps: 40,
        hidden_objects: 25,
        secret_doors: 15,
      },
      Assassin: {
        traps: 30,
        hidden_objects: 20,
        secret_doors: 10,
      },
      Ranger: {
        tracks: 60,
        hidden_objects: 15,
        traps: 10,
      },
      Paladin: {
        hidden_objects: 10,
        secret_doors: 5,
      },
    };

    return modifiers[character.class]?.[searchType] || 0;
  }

  private getThoroughnessModifier(thoroughness: string): number {
    const modifiers: Record<string, number> = {
      hasty: -20,
      normal: 0,
      careful: 15,
      meticulous: 25,
    };

    return modifiers[thoroughness] || 0;
  }

  private getTimeModifier(timeSpent: number, searchType: string): number {
    const baseTime = this.getMinimumSearchTime(searchType, 'normal');
    const timeRatio = timeSpent / baseTime;

    if (timeRatio >= 3) return 20;
    if (timeRatio >= 2) return 10;
    if (timeRatio >= 1.5) return 5;
    if (timeRatio >= 1) return 0;
    return -15;
  }

  private getAssistanceModifier(assistingIds: string[] | undefined, context: GameContext): number {
    if (!assistingIds || assistingIds.length === 0) {
      return 0;
    }

    let bonus = 0;
    const maxAssistants = 3;
    const actualAssistants = Math.min(assistingIds.length, maxAssistants);

    for (let i = 0; i < actualAssistants; i++) {
      const assistant = context.getEntity<Character>(assistingIds[i]);
      if (assistant) {
        bonus += Math.floor(10 / (i + 1));
      }
    }

    return bonus;
  }

  private getMinimumSearchTime(searchType: string, thoroughness: string): number {
    const baseTimes: Record<string, number> = {
      secret_doors: 10,
      hidden_objects: 3,
      traps: 10,
      tracks: 5,
      general: 3,
    };

    const thoroughnessMultipliers: Record<string, number> = {
      hasty: 0.5,
      normal: 1.0,
      careful: 2.0,
      meticulous: 4.0,
    };

    const baseTime = baseTimes[searchType] || 3;
    const multiplier = thoroughnessMultipliers[thoroughness] || 1.0;

    return Math.ceil(baseTime * multiplier);
  }

  private calculateActualSearchTime(timeSpent: number, thoroughness: string): number {
    const efficiency: Record<string, number> = {
      hasty: 0.8,
      normal: 1.0,
      careful: 1.2,
      meticulous: 1.5,
    };

    return Math.ceil(timeSpent * (efficiency[thoroughness] || 1.0));
  }

  private calculateSearchFatigue(character: Character, timeRequired: number): number {
    const baseFatigue = Math.floor(timeRequired / 10);

    const conModifier = this.getConstitutionFatigueModifier(character.abilities.constitution);

    return Math.max(0, baseFatigue - conModifier);
  }

  private getConstitutionFatigueModifier(constitution: number): number {
    if (constitution >= 18) return 2;
    if (constitution >= 16) return 1;
    if (constitution >= 14) return 0;
    if (constitution >= 9) return 0;
    return -1;
  }

  private determineFoundItems(searchType: string, _area: string): string[] {
    const exampleFinds: Record<string, string[]> = {
      secret_doors: ['Hidden door behind tapestry', 'Concealed passage in wall'],
      hidden_objects: ['Small gem in crevice', 'Hidden compartment', 'Buried coin pouch'],
      traps: ['Pressure plate trap', 'Tripwire mechanism', 'Poisoned needle'],
      tracks: ['Fresh goblin tracks', 'Day-old human footprints', 'Disturbed vegetation'],
      general: ['Unusual marking on wall', 'Loose stone', 'Strange odor'],
    };

    const possibleFinds = exampleFinds[searchType] || [];

    if (possibleFinds.length === 0) return [];

    const numFinds = Math.random() < 0.7 ? 1 : 2;
    const shuffled = [...possibleFinds].sort(() => Math.random() - 0.5);

    return shuffled.slice(0, Math.min(numFinds, possibleFinds.length));
  }

  private generateDiscoveryDetails(foundItems: string[], searchType: string): string[] {
    if (foundItems.length === 0) {
      return [`Thorough ${searchType} search revealed nothing of interest`];
    }

    return foundItems.map((item) => {
      switch (searchType) {
        case 'secret_doors':
          return `Detected ${item} through careful examination of the stonework`;
        case 'traps':
          return `Spotted ${item} by noticing subtle mechanical signs`;
        case 'tracks':
          return `Identified ${item} from disturbances in the ground`;
        default:
          return `Discovered ${item} through methodical searching`;
      }
    });
  }

  private applySearchEffects(
    _character: Character,
    _result: SearchResult,
    _context: GameContext
  ): void {}
}
