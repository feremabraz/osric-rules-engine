import type { Command } from '@osric/core/Command';
import { ContextKeys } from '@osric/core/ContextKeys';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import { COMMAND_TYPES } from '@osric/types/constants';
import type { AerialMovement } from './AerialCombatShared';
import { handleAerialMovement } from './AerialCombatShared';

interface AerialCombatContext {
  aerialMovement: AerialMovement;
}

export class AerialMovementRules extends BaseRule {
  name = 'aerial-movement';

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const aerialContext = context.getTemporary(
      ContextKeys.COMBAT_AERIAL_CONTEXT
    ) as AerialCombatContext;

    if (!aerialContext) {
      return this.createFailureResult('No aerial movement context found');
    }

    const { aerialMovement } = aerialContext;
    const direction = context.getTemporary(ContextKeys.COMBAT_AERIAL_MOVEMENT_DIRECTION) as
      | 'ascend'
      | 'descend'
      | 'level';
    const distance = context.getTemporary(ContextKeys.COMBAT_AERIAL_MOVEMENT_DISTANCE) as number;

    if (!direction || !distance) {
      return this.createFailureResult('Movement direction and distance required');
    }

    const newMovement = handleAerialMovement(aerialMovement, direction, distance);

    context.setTemporary(ContextKeys.COMBAT_AERIAL_MOVEMENT, newMovement);

    return this.createSuccessResult(
      `Aerial movement: ${direction} ${distance} ft, now at ${newMovement.currentAltitude} ft altitude, ` +
        `speed ${newMovement.currentSpeed}/${newMovement.maxSpeed}`
    );
  }

  canApply(context: GameContext, command: Command): boolean {
    if (command.type !== COMMAND_TYPES.MOVE && command.type !== COMMAND_TYPES.AERIAL_MOVE)
      return false;

    const aerialContext = context.getTemporary(
      ContextKeys.COMBAT_AERIAL_CONTEXT
    ) as AerialCombatContext;
    return aerialContext !== null;
  }
}

export default AerialMovementRules;
