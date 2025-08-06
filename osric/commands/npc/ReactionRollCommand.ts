import { BaseCommand, type CommandResult } from '@osric/core/Command';
import type { GameContext } from '@osric/core/GameContext';
import type { ReactionRollParams } from '@osric/rules/npc/ReactionRules';
import { COMMAND_TYPES } from '@osric/types/constants';

export class ReactionRollCommand extends BaseCommand {
  readonly type = COMMAND_TYPES.REACTION_ROLL;

  constructor(
    characterId: string,
    private readonly targetId: string,
    private readonly interactionType: ReactionRollParams['interactionType'],
    private readonly modifiers?: ReactionRollParams['modifiers'],
    private readonly isPartySpokesperson = true
  ) {
    super(characterId, [targetId]);
  }

  async execute(context: GameContext): Promise<CommandResult> {
    if (!this.validateEntities(context)) {
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
      return this.createFailureResult(ruleResult.message, ruleResult.data);
    }

    return this.createSuccessResult(
      ruleResult.message,
      ruleResult.data,
      ruleResult.effects,
      ruleResult.damage
    );
  }

  canExecute(context: GameContext): boolean {
    return context.hasEntity(this.actorId) && context.hasEntity(this.targetId);
  }

  getRequiredRules(): string[] {
    return ['reaction-roll'];
  }

  protected setupContextData(context: GameContext): void {
    const reactionParams: ReactionRollParams = {
      characterId: this.actorId,
      targetId: this.targetId,
      interactionType: this.interactionType,
      modifiers: this.modifiers,
      isPartySpokesperson: this.isPartySpokesperson,
    };

    context.setTemporary('reaction-roll-params', reactionParams);
  }
}
