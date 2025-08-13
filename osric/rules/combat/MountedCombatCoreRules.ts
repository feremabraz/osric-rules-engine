import type { Command } from '@osric/core/Command';
import { ContextKeys } from '@osric/core/ContextKeys';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import type { Character as CharacterData } from '@osric/types/character';
import { COMMAND_TYPES } from '@osric/types/constants';
import type { Mount } from './MountedCombatRules';

interface MountedCombatContext {
  rider: CharacterData;
  mount: Mount;
  isChargeAttack?: boolean;
  isDismounting?: boolean;
}

export class MountedCombatRules extends BaseRule {
  name = 'mounted-combat';

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const mountedContext = context.getTemporary(
      ContextKeys.COMBAT_MOUNTED_CONTEXT
    ) as MountedCombatContext;

    if (!mountedContext) {
      return this.createFailureResult('No mounted combat context found');
    }

    const { rider, mount } = mountedContext;

    const modifiers = this.getMountedCombatModifiers(rider, mount);

    context.setTemporary(ContextKeys.COMBAT_MOUNTED_MODIFIERS, modifiers);

    return this.createSuccessResult(
      `Mounted combat modifiers applied: ${modifiers.attackBonus >= 0 ? '+' : ''}${modifiers.attackBonus} attack, ` +
        `${modifiers.damageBonus >= 0 ? '+' : ''}${modifiers.damageBonus} damage, ` +
        `AC ${modifiers.acBonus >= 0 ? '+' : ''}${modifiers.acBonus}`
    );
  }

  canApply(context: GameContext, command: Command): boolean {
    if (command.type !== COMMAND_TYPES.ATTACK && command.type !== COMMAND_TYPES.MOUNTED_COMBAT)
      return false;

    const mountedContext = context.getTemporary(
      ContextKeys.COMBAT_MOUNTED_CONTEXT
    ) as MountedCombatContext;
    return (
      mountedContext !== null && !mountedContext.isChargeAttack && !mountedContext.isDismounting
    );
  }

  private getMountedCombatModifiers(
    _rider: CharacterData,
    mount: Mount
  ): {
    attackBonus: number;
    damageBonus: number;
    acBonus: number;
    movementRate: number;
  } {
    let attackBonus = 0;
    let damageBonus = 0;
    let acBonus = 0;

    attackBonus += 1;

    if (mount.isEncumbered) {
      attackBonus -= 1;
    }

    if (mount.flying) {
      attackBonus += 1;
      acBonus += 1;
    }

    switch (mount.size) {
      case 'Large':
        damageBonus += 1;
        break;
      case 'Huge':
        damageBonus += 2;
        acBonus -= 1;
        break;
      case 'Gargantuan':
        damageBonus += 3;
        acBonus -= 2;
        break;
    }

    return {
      attackBonus,
      damageBonus,
      acBonus,
      movementRate: mount.movementRate,
    };
  }
}
