import type { Command } from '@osric/core/Command';
import { ContextKeys } from '@osric/core/ContextKeys';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import type { Character as CharacterData } from '@osric/types/character';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';
import type { Monster as MonsterData } from '@osric/types/monster';

/**
 * Post-damage status handling per OSRIC:
 * - At 0 HP: unconscious; begin bleeding 1 HP/round until -10
 * - Any additional damage while unconscious (not bleeding tick) causes instant death
 * - Bleeding can be stopped by aid in same round (outside of this rule)
 * - Returning to >=1 HP leaves target comatose for 1-6 turns (tracked via status effect)
 */
export class PostDamageStatusRule extends BaseRule {
  readonly name = RULE_NAMES.POST_DAMAGE_STATUS;
  readonly priority = 35; // After ApplyDamage (30)

  canApply(context: GameContext, command: Command): boolean {
    if (command.type !== COMMAND_TYPES.ATTACK) return false;

    const attackCtx = context.getTemporary(ContextKeys.COMBAT_ATTACK_CONTEXT);
    const damage = context.getTemporary(ContextKeys.COMBAT_DAMAGE_RESULT);
    const updatedTarget = context.getTemporary(ContextKeys.COMBAT_ATTACK_TARGET);
    return attackCtx !== null && damage !== null && updatedTarget !== null;
  }

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const updatedTarget = context.getTemporary(ContextKeys.COMBAT_ATTACK_TARGET) as
      | CharacterData
      | MonsterData
      | null;

    const damageResult = context.getTemporary(ContextKeys.COMBAT_DAMAGE_RESULT) as {
      totalDamage: number;
    } | null;

    if (!updatedTarget || !damageResult) {
      return this.createFailureResult('Missing target or damage context');
    }

    const totalDamage = Math.max(0, Math.floor(damageResult.totalDamage || 0));

    // Determine prior state via last-known target snapshot if present
    const attackContext = context.getTemporary(ContextKeys.COMBAT_ATTACK_CONTEXT) as {
      target: CharacterData | MonsterData;
    } | null;

    const priorHP =
      attackContext?.target.hitPoints.current ?? updatedTarget.hitPoints.current + totalDamage;
    const currentHP = updatedTarget.hitPoints.current;

    // Both Character and Monster shapes include statusEffects array
    const statusEffects = [...(updatedTarget.statusEffects || [])];

    let message: string | null = null;

    // If currentHP <= -10: target dead
    if (currentHP <= -10) {
      if (!statusEffects.some((e) => e.name === 'Dead')) {
        statusEffects.push({
          name: 'Dead',
          duration: Number.POSITIVE_INFINITY as unknown as number,
          effect: 'Target is dead',
          savingThrow: null,
          endCondition: null,
        });
      }
      message = `${updatedTarget.name} is dead`;
    } else if (currentHP <= 0) {
      // At 0 HP (or below but > -10): unconscious and bleeding
      const alreadyUnconscious = statusEffects.some((e) => e.name === 'Unconscious');

      // If was already unconscious and took additional damage this round (beyond bleeding), it's instant death
      if (alreadyUnconscious && totalDamage > 0 && priorHP <= 0) {
        const filtered = statusEffects.filter(
          (e) => e.name !== 'Unconscious' && e.name !== 'Bleeding'
        );
        filtered.push({
          name: 'Dead',
          duration: Number.POSITIVE_INFINITY as unknown as number,
          effect: 'Target is dead',
          savingThrow: null,
          endCondition: null,
        });
        updatedTarget.statusEffects = filtered;
        context.setEntity(updatedTarget.id, updatedTarget);
        context.setTemporary(ContextKeys.COMBAT_ATTACK_TARGET, updatedTarget);
        return this.createSuccessResult(`${updatedTarget.name} is slain while unconscious`);
      }

      if (!alreadyUnconscious) {
        statusEffects.push({
          name: 'Unconscious',
          duration: Number.POSITIVE_INFINITY as unknown as number,
          effect: 'Target is unconscious and helpless',
          savingThrow: null,
          endCondition: 'Healed to 1+ HP',
        });
      }

      if (!statusEffects.some((e) => e.name === 'Bleeding')) {
        statusEffects.push({
          name: 'Bleeding',
          duration: Number.POSITIVE_INFINITY as unknown as number,
          effect: 'Loses 1 HP per round until -10 or stabilized',
          savingThrow: null,
          endCondition: 'Stabilized or magical healing',
        });
      }

      message = `${updatedTarget.name} is unconscious${currentHP < 0 ? ' and bleeding' : ''}`;
    } else {
      // Above 0 HP. If they were previously unconscious and just got healed elsewhere, add Comatose effect
      const wasUnconscious = statusEffects.some((e) => e.name === 'Unconscious');
      if (wasUnconscious) {
        const filtered = statusEffects.filter(
          (e) => e.name !== 'Unconscious' && e.name !== 'Bleeding'
        );
        filtered.push({
          name: 'Comatose',
          duration: 6, // 1-6 turns placeholder; recovery system may randomize
          effect: 'Regains consciousness after coma; must rest 1 week',
          savingThrow: null,
          endCondition: 'Duration expires',
        });
        updatedTarget.statusEffects = filtered;
        context.setEntity(updatedTarget.id, updatedTarget);
        context.setTemporary(ContextKeys.COMBAT_ATTACK_TARGET, updatedTarget);
        return this.createSuccessResult(`${updatedTarget.name} stabilizes but remains comatose`);
      }
    }

    // Persist status updates
    updatedTarget.statusEffects = statusEffects;
    context.setEntity(updatedTarget.id, updatedTarget);
    context.setTemporary(ContextKeys.COMBAT_ATTACK_TARGET, updatedTarget);

    return this.createSuccessResult(message || `${updatedTarget.name} status updated`);
  }
}

export default PostDamageStatusRule;
