/**
 * Initiative Order Rules for OSRIC Combat
 * Handles ordering of combat participants based on initiative rolls and dexterity
 */

import type { Command } from '@osric/core/Command';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule } from '@osric/core/Rule';
import type { RuleResult } from '@osric/core/Rule';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';

interface InitiativeParticipant {
  entityId: string;
  name: string;
  initiative: number;
  dexterityModifier: number;
  isPlayer: boolean;
  actedThisRound?: boolean;
}

interface InitiativeOrderResult {
  order: string[];
  participants: InitiativeParticipant[];
  currentActorIndex: number;
}

export class InitiativeOrderRules extends BaseRule {
  readonly name = RULE_NAMES.INITIATIVE_ORDER;
  readonly priority = 200; // After initiative rolls, before combat resolution

  async apply(context: GameContext, _command: Command): Promise<RuleResult> {
    try {
      // Get the initiative participants from previous rule
      const participants = this.getRequiredContext<InitiativeParticipant[]>(
        context,
        'combat:initiative:participants'
      );

      if (participants.length === 0) {
        return this.createFailureResult('No initiative participants found');
      }

      // Sort by initiative roll + dexterity modifier (descending order)
      const orderedParticipants = [...participants].sort((a, b) => {
        // Primary sort: initiative roll (higher goes first)
        if (b.initiative !== a.initiative) {
          return b.initiative - a.initiative;
        }

        // Tie-breaker: dexterity modifier (higher goes first)
        if (b.dexterityModifier !== a.dexterityModifier) {
          return b.dexterityModifier - a.dexterityModifier;
        }

        // Final tie-breaker: players go before NPCs
        if (a.isPlayer && !b.isPlayer) {
          return -1;
        }
        if (!a.isPlayer && b.isPlayer) {
          return 1;
        }

        // If still tied, maintain original order (stable sort)
        return 0;
      });

      // Create initiative order result
      const initiativeOrder: InitiativeOrderResult = {
        order: orderedParticipants.map((p) => p.entityId),
        participants: orderedParticipants,
        currentActorIndex: 0, // First participant acts first
      };

      // Store the initiative order
      this.setContext(context, 'combat:initiative:order', initiativeOrder);

      const orderSummary = this.createOrderSummary(orderedParticipants);

      return this.createSuccessResult(
        `Initiative order determined for ${orderedParticipants.length} participants`,
        {
          order: initiativeOrder.order,
          participants: orderedParticipants,
          summary: orderSummary,
          currentActor: orderedParticipants[0]?.entityId,
          effects: [orderSummary],
        }
      );
    } catch (error) {
      return this.createFailureResult(
        `Failed to determine initiative order: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  canApply(context: GameContext, command: Command): boolean {
    // Only applies to initiative commands
    if (command.type !== COMMAND_TYPES.INITIATIVE) {
      return false;
    }

    // Must have initiative participants from previous rule
    const participants = this.getOptionalContext<InitiativeParticipant[]>(
      context,
      'combat:initiative:participants'
    );

    return participants !== null && participants.length > 0;
  }

  getPrerequisites(): string[] {
    return [RULE_NAMES.INITIATIVE_ROLL];
  }

  /**
   * Create a human-readable summary of the initiative order
   */
  private createOrderSummary(participants: InitiativeParticipant[]): string {
    const orderList = participants.map((p, index) => {
      const initiative = p.initiative + p.dexterityModifier;
      return `${index + 1}. ${p.name} (${initiative})`;
    });

    return `Initiative Order: ${orderList.join(', ')}`;
  }
}
