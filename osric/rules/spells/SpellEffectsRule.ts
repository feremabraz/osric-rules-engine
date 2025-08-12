import type { Command } from '@osric/core/Command';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import { RULE_NAMES } from '@osric/types/constants';

// Adapter to expose SPELL_EFFECTS phase based on data produced by SpellCastingRules
export class SpellEffectsRule extends BaseRule {
  public readonly name = RULE_NAMES.SPELL_EFFECTS;

  canApply(context: GameContext, _command: Command): boolean {
    const spell = context.getTemporary('spell:cast:spell');
    return spell != null;
  }

  async apply(context: GameContext, _command: Command): Promise<RuleResult> {
    const effects = context.getTemporary('castSpell_effectResults');
    const resolution = context.getTemporary('spell:cast:validation');
    return this.createSuccessResult('Spell effects resolved', {
      effects,
      resolution,
    });
  }
}
