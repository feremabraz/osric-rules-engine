import type { Command } from '@osric/core/Command';
import { DiceEngine } from '@osric/core/Dice';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import type { Character } from '@osric/types/character';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';

interface DrowningCheckParams {
  characterId: string;
  roundsWithoutAir: number; // rounds since last breath
  isStruggling?: boolean; // disadvantage
}

export class DrowningRules extends BaseRule {
  readonly name = RULE_NAMES.DROWNING;
  readonly priority = 10;

  canApply(_context: GameContext, command: Command): boolean {
    return command.type === COMMAND_TYPES.DROWNING_CHECK;
  }

  async apply(context: GameContext, command: Command): Promise<RuleResult> {
    const {
      characterId,
      roundsWithoutAir,
      isStruggling = false,
    } = command.parameters as unknown as DrowningCheckParams;

    const character = context.getEntity<Character>(characterId);
    if (!character) {
      return this.createFailureResult(
        `Character with ID "${characterId}" not found`,
        undefined,
        true
      );
    }

    const con = character.abilities.constitution;
    const holdBreathRounds = Math.max(1, Math.floor(con / 2));

    let state: 'holding' | 'suffocating' | 'unconscious' | 'dead' = 'holding';
    let damage = 0;
    const notes: string[] = [];

    if (roundsWithoutAir > holdBreathRounds) {
      const suffocateRounds = roundsWithoutAir - holdBreathRounds;
      state = 'suffocating';

      for (let r = 0; r < suffocateRounds; r++) {
        const roll = DiceEngine.roll(isStruggling ? '2d6' : '1d6').total;
        damage += roll;
        if (character.hitPoints.current - damage <= 0) {
          state = 'dead';
          break;
        }
        if (r >= 2) {
          state = 'unconscious';
        }
      }
      notes.push('Suffocation damage applied');
    }

    if (damage > 0) {
      const updated = {
        ...character,
        hitPoints: {
          ...character.hitPoints,
          current: Math.max(0, character.hitPoints.current - damage),
        },
      };
      context.setEntity(character.id, updated);
    }

    return this.createSuccessResult('Drowning check resolved', {
      characterId,
      roundsWithoutAir,
      canHoldBreath: holdBreathRounds,
      isStruggling,
      state,
      damage,
      notes,
    });
  }
}
