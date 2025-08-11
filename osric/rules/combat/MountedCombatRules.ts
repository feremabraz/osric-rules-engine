import type { Command } from '@osric/core/Command';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import type { Character as CharacterData } from '@osric/types/character';
import { COMMAND_TYPES } from '@osric/types/constants';
import type { Weapon } from '@osric/types/item';
import type { Monster as MonsterData } from '@osric/types/monster';

export enum AerialAgilityLevel {
  Drifting = 1,
  Poor = 2,
  Average = 3,
  Good = 4,
  Excellent = 5,
  Perfect = 6,
}

export interface Mount {
  id: string;
  name: string;
  type: string;
  movementRate: number;
  armorClass: number;
  hitPoints: {
    current: number;
    maximum: number;
  };
  size: 'Small' | 'Medium' | 'Large' | 'Huge' | 'Gargantuan';
  flying: boolean;
  flyingAgility: AerialAgilityLevel | null;
  encumbrance: {
    current: number;
    max: number;
  };
  isEncumbered: boolean;
  mountedBy: string | null;
}

interface MountedCombatContext {
  rider: CharacterData;
  mount: Mount;
  target?: CharacterData | MonsterData;
  weapon?: Weapon;
  isChargeAttack?: boolean;
  isDismounting?: boolean;
}

export class MountedChargeRule extends BaseRule {
  name = 'mounted-charge';

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const mountedContext = context.getTemporary('combat:mounted:context') as MountedCombatContext;

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

    context.setTemporary('mounted-charge-result', chargeResult);
    context.setTemporary('damage-multiplier', chargeResult.damageMultiplier);

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

    const mountedContext = context.getTemporary('combat:mounted:context') as MountedCombatContext;
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

export class MountedCombatRule extends BaseRule {
  name = 'mounted-combat';

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const mountedContext = context.getTemporary('combat:mounted:context') as MountedCombatContext;

    if (!mountedContext) {
      return this.createFailureResult('No mounted combat context found');
    }

    const { rider, mount } = mountedContext;

    const modifiers = this.getMountedCombatModifiers(rider, mount);

    context.setTemporary('mounted-combat-modifiers', modifiers);

    return this.createSuccessResult(
      `Mounted combat modifiers applied: ${modifiers.attackBonus >= 0 ? '+' : ''}${modifiers.attackBonus} attack, ` +
        `${modifiers.damageBonus >= 0 ? '+' : ''}${modifiers.damageBonus} damage, ` +
        `AC ${modifiers.acBonus >= 0 ? '+' : ''}${modifiers.acBonus}`
    );
  }

  canApply(context: GameContext, command: Command): boolean {
    if (command.type !== COMMAND_TYPES.ATTACK && command.type !== COMMAND_TYPES.MOUNTED_COMBAT)
      return false;

    const mountedContext = context.getTemporary('combat:mounted:context') as MountedCombatContext;
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

export class DismountRule extends BaseRule {
  name = 'dismount';

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const mountedContext = context.getTemporary('combat:mounted:context') as MountedCombatContext;

    if (!mountedContext || !mountedContext.isDismounting) {
      return this.createFailureResult('No dismounting context found');
    }

    const { rider, mount } = mountedContext;

    const dismountResult = this.resolveDismount(rider, mount);

    context.setTemporary('dismount-result', dismountResult);

    context.setTemporary('combat:mounted:context', null);

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

    const mountedContext = context.getTemporary('combat:mounted:context') as MountedCombatContext;
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

export class MountedCombatEligibilityRule extends BaseRule {
  name = 'mounted-combat-eligibility';

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const rider = context.getTemporary('combat:mounted:rider') as CharacterData;
    const mount = context.getTemporary('combat:mounted:mount') as Mount;

    if (!rider || !mount) {
      return this.createFailureResult('Rider or mount not found in context');
    }

    const eligibility = this.checkMountedCombatEligibility(rider, mount);
    context.setTemporary('mounted-combat-eligibility', eligibility);

    return this.createSuccessResult(
      eligibility.canFight
        ? 'Mounted combat is allowed'
        : `Mounted combat not allowed: ${eligibility.reason}`
    );
  }

  canApply(context: GameContext, command: Command): boolean {
    if (command.type !== COMMAND_TYPES.CHECK_MOUNTED_COMBAT) return false;

    const rider = context.getTemporary('combat:mounted:rider') as CharacterData;
    const mount = context.getTemporary('combat:mounted:mount') as Mount;

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
