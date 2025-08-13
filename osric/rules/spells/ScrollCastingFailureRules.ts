import { ContextKeys } from '@osric/core/ContextKeys';
import { DiceEngine } from '@osric/core/Dice';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import type { Character } from '@osric/types/character';
import { RULE_NAMES } from '@osric/types/constants';
import type { MagicScroll, ScrollCastingCheck } from './ScrollTypes';

export class ScrollCastingFailureRules extends BaseRule {
  public readonly name = RULE_NAMES.SCROLL_CASTING_FAILURE;
  public readonly description =
    'Calculates failure chances for scroll casting using OSRIC formulas';

  public canApply(context: GameContext): boolean {
    const scroll = context.getTemporary<MagicScroll>(ContextKeys.SPELL_SCROLL_CASTING_SCROLL);
    const caster = context.getTemporary<Character>(ContextKeys.SPELL_SCROLL_CASTING_CASTER);
    return !!(scroll && caster);
  }

  public async execute(context: GameContext): Promise<RuleResult> {
    const scroll = context.getTemporary<MagicScroll>(ContextKeys.SPELL_SCROLL_CASTING_SCROLL);
    const caster = context.getTemporary<Character>(ContextKeys.SPELL_SCROLL_CASTING_CASTER);

    if (!scroll || !caster) {
      return this.createFailureResult('Missing scroll or caster for failure calculation');
    }

    const levelDifference = Math.max(0, scroll.minCasterLevel - caster.level);

    const failureChance = Math.min(95, levelDifference * 5);

    const backfireChance = Math.min(50, failureChance / 2);

    const castingCheck: ScrollCastingCheck = {
      scroll,
      caster,
      failureChance,
      backfireChance,
    };

    context.setTemporary(ContextKeys.SPELL_SCROLL_CASTING_CHECK, castingCheck);

    const message =
      levelDifference > 0
        ? `Scroll casting has ${failureChance}% failure chance (${backfireChance}% chance of backfire)`
        : 'Scroll can be cast without risk of failure';

    return this.createSuccessResult(message, {
      caster: castingCheck.caster.name,
      scroll: castingCheck.scroll.name,
      failureChance: castingCheck.failureChance,
      backfireChance: castingCheck.backfireChance,
    });
  }
}
