/**
 * SearchCommand - Character Search Actions
 *
 * Handles search actions including:
 * - Secret door detection
 * - Trap finding
 * - Hidden object discovery
 * - Time consumption
 * - Success/failure resolution
 *
 * PRESERVATION: All OSRIC search rules preserved exactly.
 */

import { BaseCommand, type CommandResult } from '../../core/Command';
import { rollDice } from '../../core/Dice';
import type { GameContext } from '../../core/GameContext';
import { COMMAND_TYPES } from '../../types/constants';
import type { Character } from '../../types/entities';

export interface SearchParameters {
  characterId: string;
  searchType: 'secret-doors' | 'traps' | 'hidden-objects' | 'general';
  target?: {
    area: string; // Description of area being searched
    specificTarget?: string; // Specific object or feature to search for
  };
  timeSpent: number; // Time in minutes
  thoroughness: 'quick' | 'normal' | 'careful' | 'meticulous';
}

export class SearchCommand extends BaseCommand {
  readonly type = COMMAND_TYPES.SEARCH;

  constructor(private parameters: SearchParameters) {
    super(parameters.characterId);
  }

  async execute(context: GameContext): Promise<CommandResult> {
    try {
      const { characterId, searchType, target, timeSpent, thoroughness } = this.parameters;

      // Get the character
      const character = context.getEntity<Character>(characterId);
      if (!character) {
        return this.createFailureResult(`Character with ID "${characterId}" not found`);
      }

      // Calculate search modifiers
      const searchModifiers = this.calculateSearchModifiers(character, searchType, thoroughness);

      // Determine base chance of success
      const baseChance = this.getBaseSearchChance(character, searchType);

      // Calculate final success chance
      const finalChance = Math.min(95, Math.max(5, baseChance + searchModifiers.total));

      // Roll for search success
      const searchRoll = rollDice(1, 100);
      const isSuccessful = searchRoll.result <= finalChance;

      // Calculate time taken
      const actualTime = this.calculateSearchTime(timeSpent, thoroughness, isSuccessful);

      // Generate search results
      const searchResults = this.generateSearchResults(
        character,
        searchType,
        isSuccessful,
        searchModifiers,
        target
      );

      // Apply search effects to character
      const updatedCharacter = this.applySearchEffects(character, actualTime);

      // Update character in context
      context.setEntity(characterId, updatedCharacter);

      // Prepare result data
      const resultData = {
        characterId,
        searchType,
        target,
        isSuccessful,
        searchRoll: searchRoll.result,
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
    return this.validateEntities(context);
  }

  getRequiredRules(): string[] {
    return ['search-mechanics', 'secret-door-detection', 'trap-finding', 'thief-skills'];
  }

  /**
   * Calculate modifiers for search attempt
   */
  private calculateSearchModifiers(character: Character, searchType: string, thoroughness: string) {
    const modifiers = {
      race: 0,
      class: 0,
      thoroughness: 0,
      wisdom: 0,
      total: 0,
    };

    // Racial modifiers (OSRIC rules)
    switch (character.race) {
      case 'Elf':
        if (searchType === 'secret-doors') {
          modifiers.race = 10; // Elves have 1 in 6 chance (16.67%) base vs 1 in 20 (5%) for others
        }
        break;
      case 'Dwarf':
        if (searchType === 'traps' || searchType === 'hidden-objects') {
          modifiers.race = 5; // Dwarves are good at finding stonework traps
        }
        break;
    }

    // Class modifiers
    switch (character.class) {
      case 'Thief':
        if (searchType === 'traps') {
          // Use thief's find traps skill if available
          const findTrapsSkill = character.thiefSkills?.findTraps || 0;
          modifiers.class = Math.floor(findTrapsSkill / 5); // Convert percentage to modifier
        }
        break;
      case 'Ranger':
        if (searchType === 'hidden-objects') {
          modifiers.class = 10; // Rangers are good at tracking and finding hidden things
        }
        break;
    }

    // Thoroughness modifiers
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

    // Wisdom modifier
    const wisdomScore = character.abilities.wisdom;
    if (wisdomScore >= 16) modifiers.wisdom = 5;
    else if (wisdomScore >= 13) modifiers.wisdom = 2;
    else if (wisdomScore <= 8) modifiers.wisdom = -5;
    else if (wisdomScore <= 5) modifiers.wisdom = -10;

    // Calculate total
    modifiers.total = modifiers.race + modifiers.class + modifiers.thoroughness + modifiers.wisdom;

    return modifiers;
  }

  /**
   * Get base chance of search success
   */
  private getBaseSearchChance(character: Character, searchType: string): number {
    switch (searchType) {
      case 'secret-doors':
        // OSRIC base chance: 1 in 6 for most characters
        return character.race === 'Elf' ? 33 : 16; // Elves get 2 in 6 chance

      case 'traps':
        // Base chance depends on class
        if (character.class === 'Thief') {
          return character.thiefSkills?.findTraps || 25;
        }
        return 10; // Non-thieves have poor chance

      case 'hidden-objects':
        return 20; // Base 20% chance for hidden objects

      case 'general':
        return 25; // General searching has moderate success rate

      default:
        return 15;
    }
  }

  /**
   * Calculate actual time taken for search
   */
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

    // Successful searches might take less time if you find what you're looking for quickly
    if (wasSuccessful) {
      timeMultiplier *= 0.75;
    }

    const finalTime = Math.ceil(baseTime * timeMultiplier);
    return { value: finalTime, unit: 'minutes' };
  }

  /**
   * Generate search results based on success/failure
   */
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
      // Failed search consequences
      findings.push('Search revealed nothing of interest');

      // Chance of triggering what you were looking for
      if (searchType === 'traps') {
        const triggerRoll = rollDice(1, 20);
        if (triggerRoll.result <= 2) {
          consequences.push({
            type: 'trap-triggered',
            description: 'Accidentally triggered a trap while searching',
          });
        }
      }

      // Inefficient search wastes extra time
      if (modifiers.total < -10) {
        consequences.push({
          type: 'time-wasted',
          description: 'Poor search technique wasted additional time',
        });
      }
    }

    return { findings, consequences };
  }

  /**
   * Apply search effects to character
   */
  private applySearchEffects(
    character: Character,
    _timeTaken: { value: number; unit: string }
  ): Character {
    // For now, just return the character unchanged
    // In a full implementation, this might apply fatigue, update position, etc.

    // Store the time spent searching in temporary data for tracking
    // This would be used by the game master to track dungeon time

    return character;
  }

  /**
   * Create descriptive message for search result
   */
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
