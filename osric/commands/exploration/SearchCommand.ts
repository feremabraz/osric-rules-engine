import { SearchValidator } from '@osric/commands/exploration/validators/SearchValidator';
import { BaseCommand, type CommandResult, type EntityId } from '@osric/core/Command';
import { DiceEngine } from '@osric/core/Dice';
import type { GameContext } from '@osric/core/GameContext';
import { formatValidationErrors } from '@osric/core/ValidationPrimitives';
import type { CharacterId } from '@osric/types';
import type { Character } from '@osric/types/character';
import { COMMAND_TYPES } from '@osric/types/constants';

export interface SearchParameters {
  characterId: string | CharacterId;
  searchType: 'secret-doors' | 'traps' | 'hidden-objects' | 'general';
  target?: {
    area: string;
    specificTarget?: string;
  };
  timeSpent: number;
  thoroughness: 'quick' | 'normal' | 'careful' | 'meticulous';
}

export class SearchCommand extends BaseCommand<SearchParameters> {
  readonly type = COMMAND_TYPES.SEARCH;
  readonly parameters: SearchParameters;

  constructor(parameters: SearchParameters, actorId: EntityId, targetIds: EntityId[] = []) {
    super(parameters, actorId, targetIds);
    this.parameters = parameters;
  }

  protected validateParameters(): void {
    const result = SearchValidator.validate(this.parameters);
    if (!result.valid) {
      const msgs = formatValidationErrors(result.errors);
      throw new Error(`Parameter validation failed: ${msgs.join(', ')}`);
    }
  }

  async execute(context: GameContext): Promise<CommandResult> {
    try {
      const { characterId, searchType, target, timeSpent, thoroughness } = this.parameters;

      const character = context.getEntity<Character>(characterId);
      if (!character) {
        return this.createFailureResult(`Character with ID "${characterId}" not found`);
      }

      // Set standardized context for rule processing (legacy/ad-hoc)
      context.setTemporary('exploration:search:context', {
        character,
        searchType,
        target,
        timeSpent,
        thoroughness,
      });

      // Also set normalized params for SearchRule chain compatibility
      const normalizedType =
        searchType === 'secret-doors'
          ? 'secret_doors'
          : searchType === 'hidden-objects'
            ? 'hidden_objects'
            : (searchType as 'traps' | 'general');
      const normalizedThoroughness =
        thoroughness === 'quick' ? 'hasty' : (thoroughness as 'normal' | 'careful' | 'meticulous');

      context.setTemporary('search-request-params', {
        characterId,
        searchType: normalizedType,
        area: target?.area ?? 'unknown',
        timeSpent,
        thoroughness: normalizedThoroughness,
        assistingCharacterIds: undefined,
      });

      const searchModifiers = this.calculateSearchModifiers(character, searchType, thoroughness);

      const baseChance = this.getBaseSearchChance(character, searchType);

      const finalChance = Math.min(95, Math.max(5, baseChance + searchModifiers.total));

      const searchRoll = DiceEngine.roll('1d100');
      const isSuccessful = searchRoll.total <= finalChance;

      const actualTime = this.calculateSearchTime(timeSpent, thoroughness, isSuccessful);

      const searchResults = this.generateSearchResults(
        character,
        searchType,
        isSuccessful,
        searchModifiers,
        target
      );

      const updatedCharacter = this.applySearchEffects(character, actualTime);

      context.setEntity(characterId, updatedCharacter);

      const resultData = {
        characterId,
        searchType,
        target,
        isSuccessful,
        searchRoll: searchRoll.total,
        finalChance,
        modifiers: searchModifiers,
        timeTaken: actualTime,
        findings: searchResults.findings,
        consequences: searchResults.consequences,
      };

      const message = this.createSearchMessage(
        character,
        searchType,
        isSuccessful,
        actualTime,
        searchResults
      );

      return this.createSuccessResult(
        message,
        resultData,
        searchResults.consequences.map((c) => c.description)
      );
    } catch (error) {
      return this.createFailureResult(
        `Failed to perform search: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  canExecute(context: GameContext): boolean {
    return this.validateEntitiesExist(context);
  }

  getRequiredRules(): string[] {
    return ['search-mechanics', 'secret-door-detection', 'trap-finding', 'thief-skills'];
  }

  private calculateSearchModifiers(character: Character, searchType: string, thoroughness: string) {
    const modifiers = {
      race: 0,
      class: 0,
      thoroughness: 0,
      wisdom: 0,
      total: 0,
    };

    switch (character.race) {
      case 'Elf':
        if (searchType === 'secret-doors') {
          modifiers.race = 10;
        }
        break;
      case 'Dwarf':
        if (searchType === 'traps' || searchType === 'hidden-objects') {
          modifiers.race = 5;
        }
        break;
    }

    switch (character.class) {
      case 'Thief':
        if (searchType === 'traps') {
          const findTrapsSkill = character.thiefSkills?.findTraps || 0;
          modifiers.class = Math.floor(findTrapsSkill / 5);
        }
        break;
      case 'Ranger':
        if (searchType === 'hidden-objects') {
          modifiers.class = 10;
        }
        break;
    }

    switch (thoroughness) {
      case 'quick':
        modifiers.thoroughness = -20;
        break;
      case 'normal':
        modifiers.thoroughness = 0;
        break;
      case 'careful':
        modifiers.thoroughness = 10;
        break;
      case 'meticulous':
        modifiers.thoroughness = 20;
        break;
    }

    const wisdomScore = character.abilities.wisdom;
    if (wisdomScore >= 16) modifiers.wisdom = 5;
    else if (wisdomScore >= 13) modifiers.wisdom = 2;
    else if (wisdomScore <= 8) modifiers.wisdom = -5;
    else if (wisdomScore <= 5) modifiers.wisdom = -10;

    modifiers.total = modifiers.race + modifiers.class + modifiers.thoroughness + modifiers.wisdom;

    return modifiers;
  }

  private getBaseSearchChance(character: Character, searchType: string): number {
    switch (searchType) {
      case 'secret-doors':
        return character.race === 'Elf' ? 33 : 16;

      case 'traps':
        if (character.class === 'Thief') {
          return character.thiefSkills?.findTraps || 25;
        }
        return 10;

      case 'hidden-objects':
        return 20;

      case 'general':
        return 25;

      default:
        return 15;
    }
  }

  private calculateSearchTime(
    baseTime: number,
    thoroughness: string,
    wasSuccessful: boolean
  ): { value: number; unit: string } {
    let timeMultiplier = 1;

    switch (thoroughness) {
      case 'quick':
        timeMultiplier = 0.5;
        break;
      case 'normal':
        timeMultiplier = 1.0;
        break;
      case 'careful':
        timeMultiplier = 1.5;
        break;
      case 'meticulous':
        timeMultiplier = 2.0;
        break;
    }

    if (wasSuccessful) {
      timeMultiplier *= 0.75;
    }

    const finalTime = Math.ceil(baseTime * timeMultiplier);
    return { value: finalTime, unit: 'minutes' };
  }

  private generateSearchResults(
    character: Character,
    searchType: string,
    isSuccessful: boolean,
    modifiers: ReturnType<typeof this.calculateSearchModifiers>,
    target?: SearchParameters['target']
  ) {
    const findings: string[] = [];
    const consequences: Array<{ type: string; description: string }> = [];

    if (isSuccessful) {
      switch (searchType) {
        case 'secret-doors':
          findings.push('Found a secret door');
          if (target?.specificTarget) {
            findings.push(`Discovered the mechanism: ${target.specificTarget}`);
          }
          break;

        case 'traps':
          findings.push('Found a trap');
          if (character.class === 'Thief') {
            findings.push('Identified trap type and trigger mechanism');
          } else {
            findings.push('Noticed signs of a trap but unsure of details');
          }
          break;

        case 'hidden-objects':
          findings.push('Found hidden object');
          if (target?.specificTarget) {
            findings.push(`Discovered: ${target.specificTarget}`);
          } else {
            findings.push('Found something concealed in the area');
          }
          break;

        case 'general':
          findings.push('Search revealed useful information');
          if (target?.area) {
            findings.push(`Thoroughly examined ${target.area}`);
          }
          break;
      }
    } else {
      findings.push('Search revealed nothing of interest');

      if (searchType === 'traps') {
        const triggerRoll = DiceEngine.roll('1d20');
        if (triggerRoll.total <= 2) {
          consequences.push({
            type: 'trap-triggered',
            description: 'Accidentally triggered a trap while searching',
          });
        }
      }

      if (modifiers.total < -10) {
        consequences.push({
          type: 'time-wasted',
          description: 'Poor search technique wasted additional time',
        });
      }
    }

    return { findings, consequences };
  }

  private applySearchEffects(
    character: Character,
    _timeTaken: { value: number; unit: string }
  ): Character {
    return character;
  }

  private createSearchMessage(
    character: Character,
    searchType: string,
    isSuccessful: boolean,
    timeTaken: { value: number; unit: string },
    results: ReturnType<typeof this.generateSearchResults>
  ): string {
    let message = `${character.name} spent ${timeTaken.value} ${timeTaken.unit} `;

    switch (searchType) {
      case 'secret-doors':
        message += 'searching for secret doors';
        break;
      case 'traps':
        message += 'searching for traps';
        break;
      case 'hidden-objects':
        message += 'searching for hidden objects';
        break;
      case 'general':
        message += 'conducting a general search';
        break;
      default:
        message += 'searching the area';
    }

    if (isSuccessful) {
      message += ' and succeeded! ';
      message += results.findings.join(', ');
    } else {
      message += ' but found nothing';
    }

    if (results.consequences.length > 0) {
      message += `. ${results.consequences.map((c) => c.description).join(', ')}`;
    }

    return message;
  }
}
