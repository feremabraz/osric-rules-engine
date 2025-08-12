import type { Command } from '@osric/core/Command';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import type { Character } from '@osric/types/character';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';

/**
 * Provides a base movement rate for the current MOVE flow.
 * Prefers the character's stored movementRate; falls back to a simple
 * race/armor heuristic when missing. Publishes `movement:base-rate` in temp.
 */
export class MovementRatesRule extends BaseRule {
  readonly name = RULE_NAMES.MOVEMENT_RATES;
  readonly priority = 90; // Run before validation/calculation rules

  canApply(context: GameContext, command: Command): boolean {
    if (command.type !== COMMAND_TYPES.MOVE) return false;
    const req = context.getTemporary<{ characterId: string }>('movement-request-params');
    return !!req?.characterId;
  }

  async apply(context: GameContext): Promise<RuleResult> {
    const req = this.getRequiredContext<{ characterId: string }>(
      context,
      'movement-request-params'
    );
    const character = context.getEntity<Character>(req.characterId);

    if (!character) {
      return this.createFailureResult('Character not found for movement rates');
    }

    const baseRate = this.deriveBaseRate(character);
    context.setTemporary('movement:base-rate', baseRate);

    return this.createSuccessResult('Movement base rate established', {
      baseRate,
      context: 'movement:rates',
    });
  }

  private deriveBaseRate(character: Character): number {
    if (typeof character.movementRate === 'number' && character.movementRate > 0) {
      return character.movementRate;
    }

    // Fallback heuristic similar to MovementRule's defaults
    const raceMovement: Record<string, number> = {
      Human: 120,
      Elf: 120,
      'Half-Elf': 120,
      Dwarf: 60,
      Halfling: 60,
      Gnome: 60,
      'Half-Orc': 120,
    };
    const raceKey = String((character as Character).race);
    const base = raceMovement[raceKey] ?? 120;

    // Apply simple armor penalty heuristic
    let penalty = 0;
    if (character.armorClass <= 0) penalty = 60;
    else if (character.armorClass <= 2) penalty = 30;

    return Math.max(30, base - penalty);
  }
}
