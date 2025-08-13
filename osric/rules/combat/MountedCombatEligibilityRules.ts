import type { Command } from '@osric/core/Command';
import { ContextKeys } from '@osric/core/ContextKeys';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import type { Character as CharacterData } from '@osric/types/character';
import { COMMAND_TYPES } from '@osric/types/constants';
import type { Mount } from './MountedCombatRules';

export class MountedCombatEligibilityRules extends BaseRule {
  name = 'mounted-combat-eligibility';

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const rider = context.getTemporary(ContextKeys.COMBAT_MOUNTED_RIDER) as CharacterData;
    const mount = context.getTemporary(ContextKeys.COMBAT_MOUNTED_MOUNT) as Mount;

    if (!rider || !mount) {
      return this.createFailureResult('Rider or mount not found in context');
    }

    const eligibility = this.checkMountedCombatEligibility(rider, mount);
    context.setTemporary(ContextKeys.COMBAT_MOUNTED_ELIGIBILITY, eligibility);

    return this.createSuccessResult(
      eligibility.canFight
        ? 'Mounted combat is allowed'
        : `Mounted combat not allowed: ${eligibility.reason}`
    );
  }

  canApply(context: GameContext, command: Command): boolean {
    if (command.type !== COMMAND_TYPES.CHECK_MOUNTED_COMBAT) return false;

    const rider = context.getTemporary(ContextKeys.COMBAT_MOUNTED_RIDER) as CharacterData;
    const mount = context.getTemporary(ContextKeys.COMBAT_MOUNTED_MOUNT) as Mount;

    return rider !== null && mount !== null;
  }

  private checkMountedCombatEligibility(
    rider: CharacterData,
    mount: Mount
  ): {
    canFight: boolean;
    reason?: string;
    restrictions?: string[];
  } {
    const restrictions: string[] = [];

    if (mount.mountedBy !== rider.id) {
      return {
        canFight: false,
        reason: 'Character is not mounted on this creature',
      };
    }

    if (mount.hitPoints.current <= 0) {
      return {
        canFight: false,
        reason: 'Mount is dead or unconscious',
      };
    }

    if (mount.hitPoints.current <= mount.hitPoints.maximum * 0.25) {
      restrictions.push('Mount may panic due to low hit points');
    }

    if (mount.isEncumbered) {
      restrictions.push('Mount movement and agility reduced due to encumbrance');
    }

    return {
      canFight: true,
      restrictions: restrictions.length > 0 ? restrictions : undefined,
    };
  }
}
