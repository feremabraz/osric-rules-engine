/**
 * OSRIC Reaction Roll Command - NPC interaction initiation
 *
 * Handles reaction rolls for NPC interactions following OSRIC mechanics:
 * - Party spokesperson designation
 * - Situational modifiers application
 * - Charisma-based adjustments
 * - Context setup for ReactionRules
 */

import { BaseCommand, type CommandResult } from '../../core/Command';
import type { GameContext } from '../../core/GameContext';
import type { ReactionRollParams } from '../../rules/npc/ReactionRules';
import { COMMAND_TYPES } from '../../types/constants';

/**
 * Command for initiating NPC reaction rolls
 *
 * This command sets up the context for ReactionRules to process
 * NPC reaction mechanics according to OSRIC tables.
 */
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
    // Validate entities exist
    if (!this.validateEntities(context)) {
      return this.createFailureResult('Required entities not found for reaction roll');
    }

    // Setup context data for ReactionRules
    this.setupContextData(context);

    // Import and execute ReactionRules directly
    const { ReactionRules } = await import('../../rules/npc/ReactionRules');
    const reactionRule = new ReactionRules();

    // Check if rule applies
    if (!reactionRule.canApply(context, this)) {
      return this.createFailureResult('Reaction rule cannot be applied in current context');
    }

    // Execute the rule
    const ruleResult = await reactionRule.execute(context, this);

    if (!ruleResult.success) {
      return this.createFailureResult(ruleResult.message, ruleResult.data);
    }

    // Return success with rule result data
    return this.createSuccessResult(
      ruleResult.message,
      ruleResult.data,
      ruleResult.effects,
      ruleResult.damage
    );
  }

  canExecute(context: GameContext): boolean {
    // Check that character and target exist
    return context.hasEntity(this.actorId) && context.hasEntity(this.targetId);
  }

  getRequiredRules(): string[] {
    return ['reaction-roll'];
  }

  /**
   * Setup context data for ReactionRules processing
   */
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
