import type { Command } from '@osric/core/Command';
import { ContextKeys } from '@osric/core/ContextKeys';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import { COMMAND_TYPES } from '@osric/types/constants';
import type { AerialMovement } from './AerialCombatShared';

interface AerialCombatContext {
  aerialMovement: AerialMovement;
  isDiveAttack?: boolean;
}

export class DiveAttackRules extends BaseRule {
  name = 'dive-attack';

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const aerialContext = context.getTemporary(
      ContextKeys.COMBAT_AERIAL_CONTEXT
    ) as AerialCombatContext;

    if (!aerialContext || !aerialContext.isDiveAttack) {
      return this.createFailureResult('No dive attack context found');
    }

    const { aerialMovement } = aerialContext;

    if (aerialMovement.diveDistance < 9) {
      return this.createFailureResult('Dive attack requires a dive of at least 9 meters');
    }

    const diveEffects = this.calculateDiveAttackEffects(aerialMovement);

    context.setTemporary(ContextKeys.COMBAT_AERIAL_DIVE_EFFECTS, diveEffects);
    context.setTemporary(ContextKeys.COMBAT_AERIAL_DAMAGE_MULTIPLIER, diveEffects.damageMultiplier);

    return this.createSuccessResult(
      `Dive attack executed: ${diveEffects.damageMultiplier}x damage, +${diveEffects.attackBonus} to hit (${aerialMovement.diveDistance} ft dive)`
    );
  }

  canApply(context: GameContext, command: Command): boolean {
    if (command.type !== COMMAND_TYPES.ATTACK && command.type !== COMMAND_TYPES.DIVE_ATTACK)
      return false;

    const aerialContext = context.getTemporary(
      ContextKeys.COMBAT_AERIAL_CONTEXT
    ) as AerialCombatContext;
    return aerialContext !== null && aerialContext.isDiveAttack === true;
  }

  private calculateDiveAttackEffects(movement: AerialMovement): {
    damageMultiplier: number;
    attackBonus: number;
    knockdownChance: number;
  } {
    const baseDamageMultiplier = 2;
    let attackBonus = 1;
    let knockdownChance = 0.5;

    if (movement.diveDistance >= 60) {
      attackBonus += 1;
      knockdownChance = 0.75;
    }

    if (movement.diveDistance >= 100) {
      attackBonus += 1;
      knockdownChance = 0.9;
    }

    if (movement.currentSpeed >= movement.maxSpeed) {
      attackBonus += 1;
    }

    return {
      damageMultiplier: baseDamageMultiplier,
      attackBonus,
      knockdownChance,
    };
  }
}

export default DiveAttackRules;
