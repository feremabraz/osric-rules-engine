import type { Command } from '@osric/core/Command';
import { ContextKeys } from '@osric/core/ContextKeys';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import type { Character as CharacterData } from '@osric/types/character';
import { RULE_NAMES } from '@osric/types/constants';
import { COMMAND_TYPES } from '@osric/types/constants';
import type { Weapon } from '@osric/types/item';
import type { Monster as MonsterData } from '@osric/types/monster';
import type { Mount } from './MountedCombatRules';

interface MountedCombatContext {
  rider: CharacterData;
  mount: Mount;
  target?: CharacterData | MonsterData;
  weapon?: Weapon;
  isChargeAttack?: boolean;
}

export class MountedChargeRules extends BaseRule {
  name = RULE_NAMES.MOUNTED_CHARGE;

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const mountedContext = context.getTemporary(
      ContextKeys.COMBAT_MOUNTED_CONTEXT
    ) as MountedCombatContext;

    if (!mountedContext) {
      return this.createFailureResult('No mounted combat context found');
    }

    const { rider, mount, target, weapon, isChargeAttack } = mountedContext;

    if (!isChargeAttack || !target || !weapon) {
      return this.createFailureResult('Invalid mounted charge parameters');
    }

    const canCharge = this.canMountedCharge(rider, mount);

    if (!canCharge.allowed) {
      return this.createFailureResult(`Cannot mounted charge: ${canCharge.reason}`);
    }

    const chargeResult = this.resolveMountedCharge(rider, mount, target, weapon);

    context.setTemporary(ContextKeys.COMBAT_MOUNTED_CHARGE_RESULT, chargeResult);
    context.setTemporary(
      ContextKeys.COMBAT_MOUNTED_DAMAGE_MULTIPLIER,
      chargeResult.damageMultiplier
    );

    return this.createSuccessResult(
      chargeResult.message,
      undefined,
      undefined,
      undefined,
      chargeResult.damageMultiplier > 1
    );
  }

  canApply(context: GameContext, command: Command): boolean {
    if (command.type !== COMMAND_TYPES.ATTACK && command.type !== COMMAND_TYPES.MOUNTED_CHARGE)
      return false;

    const mountedContext = context.getTemporary(
      ContextKeys.COMBAT_MOUNTED_CONTEXT
    ) as MountedCombatContext;
    return mountedContext !== null && mountedContext.isChargeAttack === true;
  }

  private canMountedCharge(
    rider: CharacterData,
    mount: Mount
  ): {
    allowed: boolean;
    reason?: string;
  } {
    if (mount.isEncumbered) {
      return {
        allowed: false,
        reason: 'Mount is too encumbered to charge',
      };
    }

    if (mount.hitPoints.current <= mount.hitPoints.maximum * 0.25) {
      return {
        allowed: false,
        reason: 'Mount is too injured to charge',
      };
    }

    if (mount.mountedBy !== rider.id) {
      return {
        allowed: false,
        reason: 'Character is not properly mounted',
      };
    }

    if (rider.encumbrance >= 0.9) {
      return {
        allowed: false,
        reason: 'Rider is too encumbered to charge',
      };
    }

    return { allowed: true };
  }

  private resolveMountedCharge(
    rider: CharacterData,
    mount: Mount,
    _target: CharacterData | MonsterData,
    weapon: Weapon
  ): {
    message: string;
    damageMultiplier: number;
    movementBonus: number;
  } {
    const isLance = weapon.name.toLowerCase().includes('lance');
    const isSpear = weapon.name.toLowerCase().includes('spear');

    let damageMultiplier = 1;
    if (isLance) {
      damageMultiplier = 2;
    } else if (isSpear) {
      damageMultiplier = 1.5;
    }

    const movementBonus = mount.movementRate;

    const message = `${rider.name} charges on ${mount.name} with ${weapon.name}${
      damageMultiplier > 1 ? ` (${damageMultiplier}x damage)` : ''
    }!`;

    return {
      message,
      damageMultiplier,
      movementBonus,
    };
  }
}
