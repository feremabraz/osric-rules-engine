import type { Command } from '@osric/core/Command';
import { ContextKeys } from '@osric/core/ContextKeys';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import type { Character as CharacterData } from '@osric/types/character';
import { RULE_NAMES } from '@osric/types/constants';
import { COMMAND_TYPES } from '@osric/types/constants';
import type { Mount } from './MountedCombatRules';

interface MountedCombatContext {
  rider: CharacterData;
  mount: Mount;
  isDismounting?: boolean;
}

export class DismountRules extends BaseRule {
  name = RULE_NAMES.DISMOUNT;

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const mountedContext = context.getTemporary(
      ContextKeys.COMBAT_MOUNTED_CONTEXT
    ) as MountedCombatContext;

    if (!mountedContext || !mountedContext.isDismounting) {
      return this.createFailureResult('No dismounting context found');
    }

    const { rider, mount } = mountedContext;

    const dismountResult = this.resolveDismount(rider, mount);

    context.setTemporary(ContextKeys.COMBAT_MOUNTED_DISMOUNT_RESULT, dismountResult);

    context.setTemporary(ContextKeys.COMBAT_MOUNTED_CONTEXT, null);

    return this.createSuccessResult(
      dismountResult.message,
      undefined,
      undefined,
      undefined,
      dismountResult.requiresFallingCheck
    );
  }

  canApply(context: GameContext, command: Command): boolean {
    if (command.type !== COMMAND_TYPES.DISMOUNT) return false;

    const mountedContext = context.getTemporary(
      ContextKeys.COMBAT_MOUNTED_CONTEXT
    ) as MountedCombatContext;
    return mountedContext !== null && mountedContext.isDismounting === true;
  }

  private resolveDismount(
    rider: CharacterData,
    mount: Mount
  ): {
    message: string;
    requiresFallingCheck: boolean;
    fallingDistance?: number;
  } {
    if (mount.mountedBy !== rider.id) {
      return {
        message: `${rider.name} is not mounted on ${mount.name}`,
        requiresFallingCheck: false,
      };
    }

    mount.mountedBy = null;

    if (mount.flying) {
      const fallingDistance = this.calculateFallingDistance(mount);

      return {
        message: `${rider.name} dismounts from ${mount.name} while flying! Falling ${fallingDistance} meters!`,
        requiresFallingCheck: true,
        fallingDistance,
      };
    }

    return {
      message: `${rider.name} safely dismounts from ${mount.name}.`,
      requiresFallingCheck: false,
    };
  }

  private calculateFallingDistance(mount: Mount): number {
    const sizeHeights: Record<string, number> = {
      Small: 5,
      Medium: 10,
      Large: 15,
      Huge: 20,
      Gargantuan: 30,
    };

    return sizeHeights[mount.size] || 10;
  }
}
