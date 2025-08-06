/**
 * OSRIC Reaction Rules - NPC reaction mechanics
 *
 * Implements OSRIC reaction table mechanics:
 * - 2d6 reaction roll with Charisma modifiers
 * - Situational adjustments (gifts, threats, reputation)
 * - Party representation mechanics
 * - Context-sensitive reaction outcomes
 */

import type { Command } from '../../core/Command';
import type { GameContext } from '../../core/GameContext';
import { BaseRule, type RuleResult } from '../../core/Rule';
import { COMMAND_TYPES, RULE_NAMES } from '../../types/constants';
import type { Character } from '../../types/entities';

/**
 * Parameters for reaction roll requests
 */
export interface ReactionRollParams {
  /** ID of the character initiating the reaction roll */
  characterId: string;
  /** ID of the NPC or group being interacted with */
  targetId: string;
  /** Type of interaction being attempted */
  interactionType: 'first_meeting' | 'negotiation' | 'intimidation' | 'persuasion' | 'bribery';
  /** Situational modifiers */
  modifiers?: {
    /** Gifts or bribes offered (+1 to +3) */
    gifts?: number;
    /** Threats or intimidation (-1 to -3) */
    threats?: number;
    /** Reputation modifier (-2 to +2) */
    reputation?: number;
    /** Language barrier (-1 to -2) */
    languageBarrier?: number;
    /** Cultural differences (-1 to -2) */
    culturalDifferences?: number;
    /** Party size modifier (large groups can be threatening) */
    partySizeModifier?: number;
  };
  /** Whether this character is the designated party spokesperson */
  isPartySpokesperson?: boolean;
}

/**
 * Reaction roll result data
 */
export interface ReactionResult {
  /** The dice roll result (2-12) */
  rollResult: number;
  /** Total modifier applied */
  totalModifier: number;
  /** Final adjusted result */
  finalResult: number;
  /** Reaction category */
  reaction: 'hostile' | 'unfriendly' | 'neutral' | 'friendly' | 'enthusiastic';
  /** Detailed reaction description */
  description: string;
  /** Whether immediate combat is likely */
  combatLikely: boolean;
  /** Whether further interaction is possible */
  furtherInteractionPossible: boolean;
}

/**
 * OSRIC Reaction Rules implementation
 *
 * Based on OSRIC reaction tables with proper Charisma modifiers
 * and situational adjustments for realistic NPC interactions.
 */
export class ReactionRules extends BaseRule {
  readonly name = RULE_NAMES.REACTION_ROLL;
  readonly priority = 50;

  canApply(context: GameContext, command: Command): boolean {
    return (
      this.isCommandType(command, COMMAND_TYPES.REACTION_ROLL) &&
      this.getTemporaryData<ReactionRollParams>(context, 'reaction-roll-params') !== null
    );
  }

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const params = this.getTemporaryData<ReactionRollParams>(context, 'reaction-roll-params');

    if (!params) {
      return this.createFailureResult('No reaction roll data provided');
    }

    // Get the character making the reaction roll
    const character = context.getEntity<Character>(params.characterId);
    if (!character) {
      return this.createFailureResult(`Character not found: ${params.characterId}`);
    }

    // Calculate Charisma modifier
    const charismaModifier = this.getCharismaReactionModifier(character.abilities.charisma);

    // Calculate situational modifiers
    const situationalModifier = this.calculateSituationalModifiers(params.modifiers || {});

    // Total modifier
    const totalModifier = charismaModifier + situationalModifier;

    // Roll 2d6 for reaction
    const rollResult = this.roll2d6();
    const finalResult = rollResult + totalModifier;

    // Determine reaction based on final result
    const reactionResult = this.determineReaction(finalResult, params.interactionType);

    // Store result for potential follow-up interactions
    this.setTemporaryData(context, 'last-reaction-result', reactionResult);

    // Create result message with proper sign formatting
    const modifierStr = totalModifier >= 0 ? `+${totalModifier}` : `${totalModifier}`;

    return this.createSuccessResult(
      `Reaction roll: ${rollResult} ${modifierStr} = ${finalResult} (${reactionResult.reaction})`,
      {
        reactionResult,
        characterId: params.characterId,
        targetId: params.targetId,
        interactionType: params.interactionType,
      },
      [`${character.name} receives ${reactionResult.reaction} reaction from target`]
    );
  }

  /**
   * Roll 2d6 using Math.random() following existing patterns
   */
  private roll2d6(): number {
    const rollDie = () => Math.floor(Math.random() * 6) + 1;
    return rollDie() + rollDie();
  }

  /**
   * Get Charisma-based reaction adjustment per OSRIC tables
   */
  private getCharismaReactionModifier(charisma: number): number {
    if (charisma <= 3) return -3;
    if (charisma <= 5) return -2;
    if (charisma <= 8) return -1;
    if (charisma <= 12) return 0;
    if (charisma <= 16) return +1; // 13-16: +1
    if (charisma <= 17) return +2; // 17: +2
    if (charisma >= 18) return +3; // 18+: +3
    return 0;
  }

  /**
   * Calculate total situational modifiers
   */
  private calculateSituationalModifiers(
    modifiers: NonNullable<ReactionRollParams['modifiers']>
  ): number {
    let total = 0;

    // Gifts and bribes (positive)
    if (modifiers.gifts) {
      total += Math.min(3, Math.max(0, modifiers.gifts));
    }

    // Threats and intimidation (negative)
    if (modifiers.threats) {
      total += Math.max(-3, Math.min(0, modifiers.threats));
    }

    // Reputation modifier
    if (modifiers.reputation) {
      total += Math.max(-2, Math.min(2, modifiers.reputation));
    }

    // Language barrier (negative)
    if (modifiers.languageBarrier) {
      total += Math.max(-2, Math.min(0, modifiers.languageBarrier));
    }

    // Cultural differences (negative)
    if (modifiers.culturalDifferences) {
      total += Math.max(-2, Math.min(0, modifiers.culturalDifferences));
    }

    // Party size modifier (usually negative for large groups)
    if (modifiers.partySizeModifier) {
      total += Math.max(-2, Math.min(1, modifiers.partySizeModifier));
    }

    return total;
  }

  /**
   * Determine reaction category and details based on final roll result
   */
  private determineReaction(finalResult: number, interactionType: string): ReactionResult {
    // OSRIC reaction table interpretation
    if (finalResult <= 2) {
      return {
        rollResult: finalResult,
        totalModifier: 0, // Will be set by caller
        finalResult,
        reaction: 'hostile',
        description: 'Immediate hostility. Attacks or flees if possible.',
        combatLikely: true,
        furtherInteractionPossible: false,
      };
    }

    if (finalResult <= 5) {
      return {
        rollResult: finalResult,
        totalModifier: 0,
        finalResult,
        reaction: 'unfriendly',
        description: 'Unfriendly, suspicious. Will not help and may hinder.',
        combatLikely: interactionType === 'intimidation',
        furtherInteractionPossible: true,
      };
    }

    if (finalResult <= 8) {
      return {
        rollResult: finalResult,
        totalModifier: 0,
        finalResult,
        reaction: 'neutral',
        description: 'Neutral reaction. May listen to proposals.',
        combatLikely: false,
        furtherInteractionPossible: true,
      };
    }

    if (finalResult <= 11) {
      return {
        rollResult: finalResult,
        totalModifier: 0,
        finalResult,
        reaction: 'friendly',
        description: 'Friendly disposition. Willing to help within reason.',
        combatLikely: false,
        furtherInteractionPossible: true,
      };
    }

    return {
      rollResult: finalResult,
      totalModifier: 0,
      finalResult,
      reaction: 'enthusiastic',
      description: 'Very positive reaction. Eager to help and cooperate.',
      combatLikely: false,
      furtherInteractionPossible: true,
    };
  }
}
