import { ContextKeys } from '@osric/core/ContextKeys';
import { DiceEngine } from '@osric/core/Dice';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import { RULE_NAMES } from '@osric/types/constants';
import type { ScrollCastingCheck } from './ScrollTypes';

export class ScrollSpellCastingRules extends BaseRule {
  public readonly name = RULE_NAMES.SCROLL_SPELL_CASTING;
  public readonly description =
    'Executes scroll spell casting with OSRIC success/failure mechanics';

  public canApply(context: GameContext): boolean {
    const castingCheck = context.getTemporary<ScrollCastingCheck>(
      ContextKeys.SPELL_SCROLL_CASTING_CHECK
    );
    return !!castingCheck;
  }

  public async execute(context: GameContext): Promise<RuleResult> {
    const castingCheck = context.getTemporary<ScrollCastingCheck>(
      ContextKeys.SPELL_SCROLL_CASTING_CHECK
    );

    if (!castingCheck) {
      return this.createFailureResult('Missing casting check for scroll spell casting');
    }

    const { scroll, caster, failureChance, backfireChance } = castingCheck;

    const failureRoll = DiceEngine.roll('1d100').total;
    const success = failureRoll > failureChance;

    if (success) {
      const updatedScroll = { ...scroll, consumed: true };

      const updatedCharacter = {
        ...caster,
        inventory: caster.inventory.map((item) => (item.id === scroll.id ? updatedScroll : item)),
      };

      context.setEntity(caster.id, updatedCharacter);

      context.setTemporary(ContextKeys.SPELL_SCROLL_CAST_RESULT, {
        kind: 'success',
        backfired: false,
        spell: scroll.spell,
        scrollConsumed: true,
      });

      const message = `${caster.name} successfully casts ${scroll.spell.name} from the scroll`;

      return this.createSuccessResult(message, {
        kind: 'success',
        backfired: false,
        spell: scroll.spell,
        scrollConsumed: true,
      });
    }

    const backfireRoll = DiceEngine.roll('1d100').total;
    const backfired = backfireRoll <= backfireChance;

    const updatedScroll = { ...scroll, consumed: true };
    const updatedCharacter = {
      ...caster,
      inventory: caster.inventory.map((item) => (item.id === scroll.id ? updatedScroll : item)),
    };

    context.setEntity(caster.id, updatedCharacter);

    let message: string;
    if (backfired) {
      const backfireMessage =
        scroll.failureEffect || 'The spell backfires with unpredictable results!';
      message = `${caster.name} fails to cast the scroll and ${backfireMessage}`;
    } else {
      message = `${caster.name} fails to cast ${scroll.spell.name} from the scroll, but nothing bad happens`;
    }

    context.setTemporary(ContextKeys.SPELL_SCROLL_CAST_RESULT, {
      kind: 'failure',
      backfired,
      spell: null,
      scrollConsumed: true,
    });

    return this.createSuccessResult(message, {
      kind: 'failure',
      backfired,
      spell: null,
      scrollConsumed: true,
    });
  }
}
