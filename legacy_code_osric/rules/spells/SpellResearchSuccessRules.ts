import type { Character } from '@osric/types/character';
import { RULE_NAMES } from '@osric/types/constants';
import { ContextKeys } from '../../core/ContextKeys';
import { DiceEngine } from '../../core/Dice';
import type { GameContext } from '../../core/GameContext';
import { BaseRule, type RuleResult } from '../../core/Rule';
import type { SpellResearch } from '../../types/spell-types';

export class SpellResearchSuccessRules extends BaseRule {
  name = RULE_NAMES.SPELL_RESEARCH_SUCCESS;
  description = 'Attempt to complete spell research';

  canApply(context: GameContext): boolean {
    const researchCompletion = context.getTemporary(ContextKeys.SPELL_RESEARCH_COMPLETE);
    return researchCompletion !== null;
  }

  async execute(context: GameContext): Promise<RuleResult> {
    const researchCompletion = context.getTemporary<{
      research: SpellResearch;
      character: Character;
    }>(ContextKeys.SPELL_RESEARCH_COMPLETE);

    if (!researchCompletion) {
      return this.createFailureResult('No research completion data found');
    }

    const { research, character } = researchCompletion;

    if (research.progressPercentage < 100) {
      return this.createFailureResult(
        `Research is only ${research.progressPercentage.toFixed(1)}% complete. Cannot attempt completion yet.`
      );
    }

    const successRoll = DiceEngine.roll('1d100');
    const success = successRoll.total > research.failureChance;

    if (success) {
      const message = `SUCCESS! ${character.name} successfully completes research on "${research.spellName}"!`;

      context.setTemporary(ContextKeys.SPELL_RESEARCH_COMPLETED_EVENT, {
        spellName: research.spellName,
        spellLevel: research.targetLevel,
        totalTime: research.daysSpent,
        totalCost: research.goldSpent,
        kind: 'success' as const,
      });

      return this.createSuccessResult(message, {
        research,
        kind: 'success' as const,
        rollResult: successRoll.total,
        failureChance: research.failureChance,
      });
    }

    const catastropheRoll = DiceEngine.roll('1d100');
    const catastrophe = catastropheRoll.total <= 10;

    if (catastrophe) {
      const message = `CATASTROPHIC FAILURE! ${character.name}'s research on "${research.spellName}" fails spectacularly! Wild magical energies are unleashed!`;

      context.setTemporary(ContextKeys.SPELL_RESEARCH_CATASTROPHE, {
        character: character.id,
        spellLevel: research.targetLevel,
        damage: research.targetLevel * 2,
      });

      return this.createFailureResult(message, {
        research,
        kind: 'failure' as const,
        catastrophe: true,
        rollResult: successRoll.total,
        catastropheRoll: catastropheRoll.total,
      });
    }

    const message = `Research failure. ${character.name}'s research on "${research.spellName}" fails, but the work can be continued with additional time and resources.`;

    const updatedResearch: SpellResearch = {
      ...research,
      progressPercentage: 75,
      failureChance: Math.max(1, research.failureChance - 5),
    };

    context.setTemporary(ContextKeys.SPELL_RESEARCH_ACTIVE, updatedResearch);

    return this.createFailureResult(message, {
      research: updatedResearch,
      kind: 'failure' as const,
      catastrophe: false,
      rollResult: successRoll.total,
      canContinue: true,
    });
  }
}
