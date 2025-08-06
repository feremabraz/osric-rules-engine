import type { Command } from '@osric/core/Command';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';
import type { Character } from '@osric/types/entities';

export interface ReactionRollParams {
  characterId: string;

  targetId: string;

  interactionType: 'first_meeting' | 'negotiation' | 'intimidation' | 'persuasion' | 'bribery';

  modifiers?: {
    gifts?: number;

    threats?: number;

    reputation?: number;

    languageBarrier?: number;

    culturalDifferences?: number;

    partySizeModifier?: number;
  };

  isPartySpokesperson?: boolean;
}

export interface ReactionResult {
  rollResult: number;

  totalModifier: number;

  finalResult: number;

  reaction: 'hostile' | 'unfriendly' | 'neutral' | 'friendly' | 'enthusiastic';

  description: string;

  combatLikely: boolean;

  furtherInteractionPossible: boolean;
}

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

    const character = context.getEntity<Character>(params.characterId);
    if (!character) {
      return this.createFailureResult(`Character not found: ${params.characterId}`);
    }

    const charismaModifier = this.getCharismaReactionModifier(character.abilities.charisma);

    const situationalModifier = this.calculateSituationalModifiers(params.modifiers || {});

    const totalModifier = charismaModifier + situationalModifier;

    const rollResult = this.roll2d6();
    const finalResult = rollResult + totalModifier;

    const reactionResult = this.determineReaction(finalResult, params.interactionType);

    this.setTemporaryData(context, 'last-reaction-result', reactionResult);

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

  private roll2d6(): number {
    const rollDie = () => Math.floor(Math.random() * 6) + 1;
    return rollDie() + rollDie();
  }

  private getCharismaReactionModifier(charisma: number): number {
    if (charisma <= 3) return -3;
    if (charisma <= 5) return -2;
    if (charisma <= 8) return -1;
    if (charisma <= 12) return 0;
    if (charisma <= 16) return +1;
    if (charisma <= 17) return +2;
    if (charisma >= 18) return +3;
    return 0;
  }

  private calculateSituationalModifiers(
    modifiers: NonNullable<ReactionRollParams['modifiers']>
  ): number {
    let total = 0;

    if (modifiers.gifts) {
      total += Math.min(3, Math.max(0, modifiers.gifts));
    }

    if (modifiers.threats) {
      total += Math.max(-3, Math.min(0, modifiers.threats));
    }

    if (modifiers.reputation) {
      total += Math.max(-2, Math.min(2, modifiers.reputation));
    }

    if (modifiers.languageBarrier) {
      total += Math.max(-2, Math.min(0, modifiers.languageBarrier));
    }

    if (modifiers.culturalDifferences) {
      total += Math.max(-2, Math.min(0, modifiers.culturalDifferences));
    }

    if (modifiers.partySizeModifier) {
      total += Math.max(-2, Math.min(1, modifiers.partySizeModifier));
    }

    return total;
  }

  private determineReaction(finalResult: number, interactionType: string): ReactionResult {
    if (finalResult <= 2) {
      return {
        rollResult: finalResult,
        totalModifier: 0,
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
