import { SavingThrowValidator } from '@osric/commands/character/validators/SavingThrowValidator';
import { BaseCommand, type CommandResult, type EntityId } from '@osric/core/Command';
import { ContextKeys } from '@osric/core/ContextKeys';
import type { GameContext } from '@osric/core/GameContext';
import { formatValidationErrors } from '@osric/core/ValidationPrimitives';
import type { Character } from '@osric/types/character';
import type { SavingThrowParams } from '@osric/types/commands';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';

export class SavingThrowCommand extends BaseCommand<SavingThrowParams> {
  readonly type = COMMAND_TYPES.SAVING_THROW;
  readonly parameters: SavingThrowParams;

  constructor(parameters: SavingThrowParams) {
    super(parameters, parameters.characterId as EntityId);
    this.parameters = parameters;
  }

  protected validateParameters(): void {
    const result = SavingThrowValidator.validate(this.parameters);
    if (!result.valid) {
      const errorMessages = formatValidationErrors(result.errors);
      throw new Error(`Parameter validation failed: ${errorMessages.join(', ')}`);
    }
  }

  async execute(context: GameContext): Promise<CommandResult> {
    try {
      const { characterId } = this.parameters;

      const character = context.getEntity<Character>(characterId);
      if (!character) {
        return this.createFailureResult(`Character with ID "${characterId}" not found`);
      }

      if (character.hitPoints.current <= 0) {
        return this.createFailureResult('Cannot make saving throws while unconscious or dead');
      }

      // Publish parameters for rules and delegate to RuleEngine
      context.setTemporary(ContextKeys.SAVING_THROW_PARAMS, this.parameters);
      return await this.executeWithRuleEngine(context);
    } catch (error) {
      return this.createFailureResult(
        `Failed to perform saving throw: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  canExecute(context: GameContext): boolean {
    return this.validateEntitiesExist(context);
  }

  getRequiredRules(): string[] {
    return [RULE_NAMES.SAVING_THROWS];
  }

  private getSpecialAbilities(_character: Character): string[] {
    return [];
  }
}
