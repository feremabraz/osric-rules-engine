import type { ReactionRollParams } from '@osric/rules/npc/ReactionRules';
import { BaseCommand, type CommandResult } from '../../core/Command';
import type { GameContext } from '../../core/GameContext';
import { COMMAND_TYPES } from '../../types/constants';

export interface ReactionRollParameters {
  characterId: string;
  targetId: string;
  interactionType: ReactionRollParams['interactionType'];
  modifiers?: ReactionRollParams['modifiers'];
  isPartySpokesperson?: boolean;
}

export class ReactionRollCommand extends BaseCommand<ReactionRollParameters> {
  readonly type = COMMAND_TYPES.REACTION_ROLL;
  readonly parameters: ReactionRollParameters;

  constructor(parameters: ReactionRollParameters, actorId: string, targetIds: string[] = []) {
    super(parameters, actorId, targetIds);
    this.parameters = parameters;
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

    if (!ruleResult.success) {
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
    return ['reaction-roll'];
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
