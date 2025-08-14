import { SearchValidator } from '@osric/commands/exploration/validators/SearchValidator';
import { BaseCommand, type CommandResult, type EntityId } from '@osric/core/Command';
import type { GameContext } from '@osric/core/GameContext';
import { formatValidationErrors } from '@osric/core/ValidationPrimitives';
import type { CharacterId } from '@osric/types';
import type { Character } from '@osric/types/character';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';

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

import { ContextKeys } from '@osric/core/ContextKeys';

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

      // Set standardized context for rule processing
      context.setTemporary(ContextKeys.EXPLORATION_SEARCH_CONTEXT, {
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

      context.setTemporary(ContextKeys.EXPLORATION_SEARCH_REQUEST_PARAMS, {
        characterId,
        searchType: normalizedType,
        area: target?.area ?? 'unknown',
        timeSpent,
        thoroughness: normalizedThoroughness,
        assistingCharacterIds: undefined,
      });

      // Delegate to rules engine (SEARCH chain)
      return await this.executeWithRuleEngine(context);
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
    return [RULE_NAMES.SEARCH_MECHANICS];
  }

  // Mechanics handled in rules
}
