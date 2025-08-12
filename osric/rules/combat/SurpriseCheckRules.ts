/**
 * Surprise Check Rules for OSRIC Combat
 * Handles surprise determination at the start of combat encounters
 */

import type { Command } from '@osric/core/Command';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule } from '@osric/core/Rule';
import type { RuleResult } from '@osric/core/Rule';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';

import { DiceEngine } from '@osric/core/Dice';

interface SurpriseParticipant {
  entityId: string;
  name: string;
  isPlayer: boolean;
  groupId: string; // 'party' or 'monsters' typically
  surpriseChance: number; // Base chance (1-2 on d6 typically)
  modifiers?: {
    stealthBonus?: number;
    detectionBonus?: number;
    racialBonus?: number; // Elves get +1 to surprise, etc.
  };
}

interface SurpriseCheckResult {
  surprised: string[]; // Entity IDs of surprised participants
  surprisedGroups: string[]; // Group IDs that are surprised
  surprisingGroups: string[]; // Group IDs that achieve surprise
  roundsOfSurprise: number; // Usually 1, but can vary
  details: {
    groupRolls: Record<string, number>;
    individualResults: Record<string, { roll: number; surprised: boolean }>;
  };
}

export class SurpriseCheckRule extends BaseRule {
  readonly name = RULE_NAMES.SURPRISE_CHECK;
  readonly priority = 50; // Very early in initiative, before rolls

  async apply(context: GameContext, _command: Command): Promise<RuleResult> {
    try {
      // Get participants for surprise check
      const participants = this.getRequiredContext<SurpriseParticipant[]>(
        context,
        'combat:initiative:participants'
      );

      if (participants.length === 0) {
        return this.createFailureResult('No participants found for surprise check');
      }

      // Group participants by group ID
      const groups = this.groupParticipants(participants);

      // Perform surprise checks for each group
      const surpriseResult = this.performSurpriseChecks(groups);

      // Store surprise results
      this.setContext(context, 'combat:surprise:results', surpriseResult);

      const surpriseSummary = this.createSurpriseSummary(surpriseResult);

      return this.createSuccessResult('Surprise check completed', {
        surpriseResult,
        summary: surpriseSummary,
        effects: [surpriseSummary],
      });
    } catch (error) {
      return this.createFailureResult(
        `Failed to perform surprise check: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  canApply(context: GameContext, command: Command): boolean {
    // Only applies to initiative commands
    if (command.type !== COMMAND_TYPES.INITIATIVE) {
      return false;
    }

    // Must have participants
    const participants = this.getOptionalContext<SurpriseParticipant[]>(
      context,
      'combat:initiative:participants'
    );

    return participants !== null && participants.length > 0;
  }

  getPrerequisites(): string[] {
    return []; // No prerequisites - this is one of the first checks
  }

  /**
   * Group participants by their group ID
   */
  private groupParticipants(
    participants: SurpriseParticipant[]
  ): Record<string, SurpriseParticipant[]> {
    const groups: Record<string, SurpriseParticipant[]> = {};

    for (const participant of participants) {
      if (!groups[participant.groupId]) {
        groups[participant.groupId] = [];
      }
      groups[participant.groupId].push(participant);
    }

    return groups;
  }

  /**
   * Perform surprise checks for all groups
   */
  private performSurpriseChecks(
    groups: Record<string, SurpriseParticipant[]>
  ): SurpriseCheckResult {
    const groupIds = Object.keys(groups);
    const groupRolls: Record<string, number> = {};
    const individualResults: Record<string, { roll: number; surprised: boolean }> = {};
    const surprised: string[] = [];
    const surprisedGroups: string[] = [];
    const surprisingGroups: string[] = [];

    // Each group rolls for surprise
    for (const groupId of groupIds) {
      const groupMembers = groups[groupId];

      // Calculate group surprise chance (typically 2-in-6 base)
      const baseSurpriseChance = this.calculateGroupSurpriseChance(groupMembers);

      // Roll d6 for group surprise
      const roll = DiceEngine.roll('1d6');
      groupRolls[groupId] = roll.total;

      const isGroupSurprised = roll.total <= baseSurpriseChance;

      if (isGroupSurprised) {
        surprisedGroups.push(groupId);
        // Add all group members to surprised list
        for (const member of groupMembers) {
          surprised.push(member.entityId);
          individualResults[member.entityId] = {
            roll: roll.total,
            surprised: true,
          };
        }
      } else {
        // Group is not surprised, check if they achieve surprise
        const opposingGroups = groupIds.filter((id) => id !== groupId);
        if (opposingGroups.some((oppGroupId) => surprisedGroups.includes(oppGroupId))) {
          surprisingGroups.push(groupId);
        }

        for (const member of groupMembers) {
          individualResults[member.entityId] = {
            roll: roll.total,
            surprised: false,
          };
        }
      }
    }

    // Determine rounds of surprise (usually 1)
    const roundsOfSurprise = surprisingGroups.length > 0 ? 1 : 0;

    return {
      surprised,
      surprisedGroups,
      surprisingGroups,
      roundsOfSurprise,
      details: {
        groupRolls,
        individualResults,
      },
    };
  }

  /**
   * Calculate group surprise chance based on member abilities
   */
  private calculateGroupSurpriseChance(members: SurpriseParticipant[]): number {
    // Base surprise chance is 2-in-6 (33%)
    let baseSurpriseChance = 2;

    // Apply group modifiers (take best member bonuses)
    for (const member of members) {
      if (member.modifiers?.racialBonus) {
        baseSurpriseChance += member.modifiers.racialBonus;
      }
      if (member.modifiers?.stealthBonus) {
        baseSurpriseChance += member.modifiers.stealthBonus;
      }
    }

    // Surprise chance is typically capped at 5-in-6
    return Math.min(5, Math.max(1, baseSurpriseChance));
  }

  /**
   * Create human-readable summary of surprise results
   */
  private createSurpriseSummary(result: SurpriseCheckResult): string {
    if (result.roundsOfSurprise === 0) {
      return 'No surprise achieved by either side';
    }

    const surprisingText =
      result.surprisingGroups.length > 0
        ? `${result.surprisingGroups.join(', ')} achieve surprise`
        : '';

    const surprisedText =
      result.surprisedGroups.length > 0 ? `${result.surprisedGroups.join(', ')} are surprised` : '';

    const parts = [surprisingText, surprisedText].filter(Boolean);

    return `Surprise: ${parts.join(', ')} for ${result.roundsOfSurprise} round(s)`;
  }
}
