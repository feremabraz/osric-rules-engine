import type { Character } from '@osric/types/character';
import { ContextKeys } from '../../core/ContextKeys';
import { DiceEngine } from '../../core/Dice';
import type { GameContext } from '../../core/GameContext';
import { BaseRule, type RuleResult } from '../../core/Rule';
import type { SpellResearch } from '../../types/spell-types';

export class SpellResearchProgressRules extends BaseRule {
  name = 'spell-research-progress';
  description = 'Continue work on spell research project';

  canApply(context: GameContext): boolean {
    const researchProgress = context.getTemporary(ContextKeys.SPELL_RESEARCH_PROGRESS);
    return researchProgress !== null;
  }

  async execute(context: GameContext): Promise<RuleResult> {
    const researchProgress = context.getTemporary<{
      research: SpellResearch;
      character: Character;
      daysWorked: number;
      goldSpent: number;
    }>(ContextKeys.SPELL_RESEARCH_PROGRESS);

    if (!researchProgress) {
      return this.createFailureResult('No research progress data found');
    }

    const { research, character, daysWorked, goldSpent } = researchProgress;

    const baseProgressRate = 0.5 + (character.abilities.intelligence - 10) * 0.1;
    const goldBonus = Math.min(1.0, (goldSpent / 1000) * 0.2);
    const progressRate = baseProgressRate + goldBonus;

    const progressRoll = DiceEngine.roll('1d100');
    let progressMade: number;

    if (progressRoll.total <= 10) {
      const setbackRoll = DiceEngine.roll('1d10');
      progressMade = -5 + setbackRoll.total;
      context.setTemporary(ContextKeys.SPELL_RESEARCH_SETBACK, true);
    } else {
      progressMade = (daysWorked * progressRate * 100) / research.estimatedCompletion;
    }

    const updatedProgress = Math.min(100, Math.max(0, research.progressPercentage + progressMade));
    const newDaysSpent = research.daysSpent + daysWorked;
    const newGoldSpent = research.goldSpent + goldSpent;

    let newEstimatedCompletion = 0;
    if (updatedProgress < 100) {
      const remainingPercentage = 100 - updatedProgress;
      const progressPerDay = progressMade / daysWorked;
      if (progressPerDay > 0) {
        newEstimatedCompletion = Math.ceil(remainingPercentage / progressPerDay);
      } else {
        newEstimatedCompletion = research.estimatedCompletion * 2;
      }
    }

    const updatedResearch: SpellResearch = {
      ...research,
      daysSpent: newDaysSpent,
      goldSpent: newGoldSpent,
      progressPercentage: updatedProgress,
      estimatedCompletion: newEstimatedCompletion,
    };

    context.setTemporary(ContextKeys.SPELL_RESEARCH_ACTIVE, updatedResearch);

    let message: string;
    if (progressMade < 0) {
      message =
        `Research setback! ${character.name} lost ${Math.abs(progressMade).toFixed(1)}% progress ` +
        `due to experimental failures. Progress: ${updatedProgress.toFixed(1)}%`;
    } else {
      message =
        `${character.name} makes progress on "${research.spellName}". ` +
        `Progress: ${updatedProgress.toFixed(1)}% (${progressMade.toFixed(1)}% gained)`;
    }

    return this.createSuccessResult(message, {
      research: updatedResearch,
      progressMade,
      daysWorked,
      goldSpent,
    });
  }
}
