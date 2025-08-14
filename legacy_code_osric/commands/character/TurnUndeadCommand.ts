import { TurnUndeadValidator } from '@osric/commands/character/validators/TurnUndeadValidator';
import { BaseCommand, type CommandResult, type EntityId } from '@osric/core/Command';
import { ContextKeys } from '@osric/core/ContextKeys';
import type { GameContext } from '@osric/core/GameContext';
import { formatValidationErrors } from '@osric/core/ValidationPrimitives';
import type { CharacterId, MonsterId } from '@osric/types';
import type { Character } from '@osric/types/character';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';
import type { Monster } from '@osric/types/monster';

export interface TurnUndeadParameters {
  characterId: string | CharacterId;
  targetUndeadIds: Array<string | MonsterId>;
  situationalModifiers?: {
    holySymbolBonus?: number;
    spellBonus?: number;
    areaBonus?: number;
    alignment?: 'good' | 'neutral' | 'evil';
    isEvil?: boolean;
  };
  massAttempt?: boolean;
}

export class TurnUndeadCommand extends BaseCommand<TurnUndeadParameters> {
  readonly type = COMMAND_TYPES.TURN_UNDEAD;
  readonly parameters: TurnUndeadParameters;

  constructor(parameters: TurnUndeadParameters, actorId: EntityId, targetIds: EntityId[] = []) {
    super(parameters, actorId, targetIds);
    this.parameters = parameters;
  }

  protected validateParameters(): void {
    const result = TurnUndeadValidator.validate(this.parameters);
    if (!result.valid) {
      const msgs = formatValidationErrors(result.errors);
      throw new Error(`Parameter validation failed: ${msgs.join(', ')}`);
    }
  }

  async execute(context: GameContext): Promise<CommandResult> {
    try {
      const { characterId } = this.parameters;
      const character = context.getEntity<Character>(characterId);
      if (!character) {
        return this.createFailureResult(`Character with ID "${characterId}" not found`);
      }

      // Normalize parameters for rules and delegate to the engine
      context.setTemporary(ContextKeys.TURN_UNDEAD_PARAMS, this.parameters);
      return await this.executeWithRuleEngine(context);
    } catch (error) {
      return this.createFailureResult(
        `Failed to turn undead: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  canExecute(context: GameContext): boolean {
    return this.validateEntitiesExist(context);
  }

  getRequiredRules(): string[] {
    return [RULE_NAMES.TURN_UNDEAD];
  }
}
