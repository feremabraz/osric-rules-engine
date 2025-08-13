import { MagicItemCreationValidator } from '@osric/commands/spells/validators/MagicItemCreationValidator';
import { BaseCommand, type CommandResult, type EntityId } from '@osric/core/Command';
import { ContextKeys } from '@osric/core/ContextKeys';
import type { GameContext } from '@osric/core/GameContext';
import { formatValidationErrors } from '@osric/core/ValidationPrimitives';
import type { CharacterId } from '@osric/types';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';

export interface MagicItemCreationParameters {
  characterId: string | CharacterId;
  itemType:
    | 'scroll'
    | 'potion'
    | 'weapon'
    | 'armor'
    | 'ring'
    | 'wand'
    | 'rod'
    | 'staff'
    | 'miscellaneous';
  baseItemId?: string;
  spellsToScribe?: string[];
  potionType?: string;
  enchantmentLevel?: number;
  materialComponents?: {
    name: string;
    cost: number;
    quantity: number;
    available: boolean;
  }[];
  workspaceQuality?: 'basic' | 'good' | 'excellent' | 'legendary';
  assistantPresent?: boolean;
}

export class MagicItemCreationCommand extends BaseCommand<MagicItemCreationParameters> {
  readonly type = COMMAND_TYPES.MAGIC_ITEM_CREATION;
  readonly parameters: MagicItemCreationParameters;

  constructor(
    parameters: MagicItemCreationParameters,
    actorId: EntityId,
    targetIds: EntityId[] = []
  ) {
    super(parameters, actorId, targetIds);
    this.parameters = parameters;
  }

  protected validateParameters(): void {
    const result = MagicItemCreationValidator.validate(this.parameters);
    if (!result.valid) {
      const msgs = formatValidationErrors(result.errors);
      throw new Error(`Parameter validation failed: ${msgs.join(', ')}`);
    }
  }

  async execute(context: GameContext): Promise<CommandResult> {
    // Normalize into context and delegate to rules
    context.setTemporary(ContextKeys.SPELL_MAGIC_ITEM_CREATION_PARAMS, this.parameters);
    return this.executeWithRuleEngine(context);
  }

  canExecute(context: GameContext): boolean {
    const character = context.getEntity(this.parameters.characterId);
    return character !== null;
  }

  getRequiredRules(): string[] {
    return [RULE_NAMES.MAGIC_ITEM_RULES];
  }
}
