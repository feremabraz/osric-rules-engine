import { FallingDamageValidator } from '@osric/commands/exploration/validators/FallingDamageValidator';
import { BaseCommand, type CommandResult, type EntityId } from '@osric/core/Command';
import { ContextKeys } from '@osric/core/ContextKeys';
import type { GameContext } from '@osric/core/GameContext';
import { formatValidationErrors } from '@osric/core/ValidationPrimitives';
import type { CharacterId } from '@osric/types';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';

export interface FallingDamageParameters {
  characterId: string | CharacterId;
  fallDistance: number;
  surfaceType?: 'soft' | 'normal' | 'hard' | 'spikes';
  circumstances?: {
    intentional?: boolean;
    hasFeatherFall?: boolean;
    encumbrance?: 'light' | 'moderate' | 'heavy' | 'severe';
    dexterityCheck?: boolean;
  };
  savingThrow?: boolean;
  description?: string;
}

export class FallingDamageCommand extends BaseCommand<FallingDamageParameters> {
  readonly type = COMMAND_TYPES.FALLING_DAMAGE;
  readonly parameters: FallingDamageParameters;

  constructor(parameters: FallingDamageParameters, actorId: EntityId, targetIds: EntityId[] = []) {
    super(parameters, actorId, targetIds);
    this.parameters = parameters;
  }

  protected validateParameters(): void {
    const result = FallingDamageValidator.validate(this.parameters);
    if (!result.valid) {
      const msgs = formatValidationErrors(result.errors);
      throw new Error(`Parameter validation failed: ${msgs.join(', ')}`);
    }
  }

  async execute(context: GameContext): Promise<CommandResult> {
    try {
      // Validate and normalize parameters into context for rules to consume
      context.setTemporary(ContextKeys.EXPLORATION_FALLING_DAMAGE_PARAMS, this.parameters);
      // Delegate mechanics to the rule engine/chain
      return await this.executeWithRuleEngine(context);
    } catch (error) {
      return this.createFailureResult(
        `Failed to calculate falling damage: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  canExecute(context: GameContext): boolean {
    return this.validateEntitiesExist(context);
  }

  getRequiredRules(): string[] {
    return [RULE_NAMES.FALLING_DAMAGE];
  }
}
