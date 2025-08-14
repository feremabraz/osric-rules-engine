import type { Command } from '@osric/core/Command';
import { ContextKeys } from '@osric/core/ContextKeys';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import type { Character } from '@osric/types/character';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';

/**
 * Computes an encumbrance band for the current MOVE flow and publishes it
 * as `movement:encumbrance-level` in the temporary context.
 */
export class EncumbranceRules extends BaseRule {
  readonly name = RULE_NAMES.ENCUMBRANCE;
  readonly priority = 95; // After base rate, before validation/calculation

  canApply(context: GameContext, command: Command): boolean {
    if (command.type !== COMMAND_TYPES.MOVE) return false;
    const req = context.getTemporary<{ characterId: string }>(
      ContextKeys.EXPLORATION_MOVEMENT_REQUEST_PARAMS
    );
    return !!req?.characterId;
  }

  async apply(context: GameContext): Promise<RuleResult> {
    const req = this.getRequiredContext<{ characterId: string }>(
      context,
      ContextKeys.EXPLORATION_MOVEMENT_REQUEST_PARAMS
    );
    const character = context.getEntity<Character>(req.characterId);

    if (!character) {
      return this.createFailureResult('Character not found for encumbrance');
    }

    const encumbrance = this.classifyEncumbrance(character.encumbrance ?? 0);
    context.setTemporary(ContextKeys.EXPLORATION_MOVEMENT_ENCUMBRANCE_LEVEL, encumbrance);

    return this.createSuccessResult('Encumbrance level established', {
      encumbrance,
      context: 'movement:encumbrance',
    });
  }

  private classifyEncumbrance(weight: number): 'light' | 'moderate' | 'heavy' | 'severe' {
    if (weight <= 0) return 'light';
    if (weight <= 30) return 'light';
    if (weight <= 60) return 'moderate';
    if (weight <= 120) return 'heavy';
    return 'severe';
  }
}
