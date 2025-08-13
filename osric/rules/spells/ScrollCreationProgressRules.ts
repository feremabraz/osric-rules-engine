import { ContextKeys } from '@osric/core/ContextKeys';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import { RULE_NAMES } from '@osric/types/constants';
import type { ScrollCreation } from './ScrollTypes';

export class ScrollCreationProgressRules extends BaseRule {
  public readonly name = RULE_NAMES.SCROLL_CREATION_PROGRESS;
  public readonly description = 'Updates progress on an ongoing scroll creation project';

  public canApply(context: GameContext): boolean {
    const project = context.getTemporary<ScrollCreation>(ContextKeys.SPELL_SCROLL_CREATION_PROJECT);
    const daysWorked = context.getTemporary<number>(ContextKeys.SPELL_SCROLL_PROGRESS_DAYS_WORKED);
    return !!(project && daysWorked);
  }

  public async execute(context: GameContext): Promise<RuleResult> {
    const project = context.getTemporary<ScrollCreation>(ContextKeys.SPELL_SCROLL_CREATION_PROJECT);
    const daysWorked = context.getTemporary<number>(ContextKeys.SPELL_SCROLL_PROGRESS_DAYS_WORKED);

    if (!project || !daysWorked) {
      return this.createFailureResult('Missing project or days worked for progress update');
    }

    const progressGained = (daysWorked / project.daysRequired) * 100;
    const newProgress = Math.min(100, project.progressPercentage + progressGained);

    const updatedProject: ScrollCreation = {
      ...project,
      progressPercentage: newProgress,
    };

    context.setTemporary(ContextKeys.SPELL_SCROLL_PROGRESS_RESULT, updatedProject);

    const message =
      newProgress >= 100
        ? `Scroll creation completed! ${project.spellName} scroll is ready.`
        : `Progress updated: ${Math.round(newProgress)}% complete (${Math.round(100 - newProgress)}% remaining)`;

    return this.createSuccessResult(message, {
      creatorId: updatedProject.creatorId,
      spellName: updatedProject.spellName,
      spellLevel: updatedProject.spellLevel,
      daysRequired: updatedProject.daysRequired,
      materialCost: updatedProject.materialCost,
      progressPercentage: updatedProject.progressPercentage,
    });
  }
}
