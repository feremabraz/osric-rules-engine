import { ReactionRollValidator } from '@osric/commands/npc/validators/ReactionRollValidator';
import { BaseCommand, type CommandResult, type EntityId } from '@osric/core/Command';
import type { GameContext } from '@osric/core/GameContext';
import { isFailure } from '@osric/core/Rule';
import { formatValidationErrors } from '@osric/core/ValidationPrimitives';
import type { ReactionRollParams } from '@osric/rules/npc/ReactionRules';
import type { CharacterId, MonsterId } from '@osric/types';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';

export interface ReactionRollParameters {
  characterId: string | CharacterId | MonsterId;
  targetId: string | CharacterId | MonsterId;
  interactionType: ReactionRollParams['interactionType'];
  modifiers?: ReactionRollParams['modifiers'];
  isPartySpokesperson?: boolean;
}

export class ReactionRollCommand extends BaseCommand<ReactionRollParameters> {
  readonly type = COMMAND_TYPES.REACTION_ROLL;
  readonly parameters: ReactionRollParameters;

  constructor(parameters: ReactionRollParameters, actorId: EntityId, targetIds: EntityId[] = []) {
    super(parameters, actorId, targetIds);
    this.parameters = parameters;
  }

  protected validateParameters(): void {
    const result = ReactionRollValidator.validate(this.parameters);
    if (!result.valid) {
      const msgs = formatValidationErrors(result.errors);
      throw new Error(`Parameter validation failed: ${msgs.join(', ')}`);
    }
  }

  async execute(context: GameContext): Promise<CommandResult> {
    if (!this.validateEntitiesExist(context)) {
      return this.createFailureResult('Required entities not found for reaction roll');
    }

    this.setupContextData(context);

    const { ReactionRules } = await import('../../rules/npc/ReactionRules');
    const reactionRule = new ReactionRules();

    if (!reactionRule.canApply(context, this)) {
      return this.createFailureResult('Reaction rule cannot be applied in current context');
    }

    const ruleResult = await reactionRule.execute(context, this);

    if (isFailure(ruleResult)) {
      return this.createFailureResult(ruleResult.message, undefined, ruleResult.data);
    }

    return this.createSuccessResult(
      ruleResult.message,
      ruleResult.data,
      ruleResult.effects,
      ruleResult.damage
    );
  }

  canExecute(context: GameContext): boolean {
    return context.hasEntity(this.actorId) && context.hasEntity(this.parameters.targetId);
  }

  getRequiredRules(): string[] {
    return [RULE_NAMES.REACTION_ROLL];
  }

  protected setupContextData(context: GameContext): void {
    const reactionParams: ReactionRollParams = {
      characterId: this.actorId,
      targetId: this.parameters.targetId,
      interactionType: this.parameters.interactionType,
      modifiers: this.parameters.modifiers,
      isPartySpokesperson: this.parameters.isPartySpokesperson ?? true,
    };

    context.setTemporary('reaction-roll-params', reactionParams);
  }
}
