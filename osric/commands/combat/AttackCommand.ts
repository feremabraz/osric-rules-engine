import { BaseCommand, type CommandResult, type EntityId } from '../../core/Command';
import type { GameContext } from '../../core/GameContext';
import { COMMAND_TYPES } from '../../types/constants';

import type { CharacterId, ItemId, MonsterId } from '@osric/types';
import type {
  Character as CharacterData,
  CombatResult,
  Monster as MonsterData,
  Weapon,
} from '../../types/entities';

export interface AttackParameters {
  attackerId: string | CharacterId | MonsterId;
  targetId: string | CharacterId | MonsterId;
  weaponId?: string | ItemId;
  situationalModifiers?: number;
  attackType?: 'normal' | 'subdual' | 'grapple';
  isChargedAttack?: boolean;
}

export class AttackCommand extends BaseCommand<AttackParameters> {
  readonly type = COMMAND_TYPES.ATTACK;
  readonly parameters: AttackParameters;

  constructor(parameters: AttackParameters, actorId: EntityId, targetIds: EntityId[] = []) {
    super(parameters, actorId, targetIds);
    this.parameters = parameters;
  }

  async execute(context: GameContext): Promise<CommandResult> {
    try {
      const attacker = this.getAttacker(context);
      const target = this.getTarget(context);

      if (!attacker || !target) {
        return this.createFailureResult('Invalid attacker or target');
      }

      const weapon = this.getWeapon(attacker);

      const validationResult = this.validateAttack(attacker, target, weapon);
      if (!validationResult.success) {
        return this.createFailureResult(validationResult.message);
      }

      const attackContext = {
        attacker,
        target,
        weapon,
        situationalModifiers: this.parameters.situationalModifiers || 0,
        attackType: this.parameters.attackType || 'normal',
        isChargedAttack: this.parameters.isChargedAttack || false,
      };

      context.setTemporary('combat:attack:context', attackContext);

      return this.createSuccessResult('Attack command prepared for rule processing');
    } catch (error) {
      return this.createFailureResult(
        `Attack command failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  canExecute(context: GameContext): boolean {
    const attacker = this.getAttacker(context);
    const target = this.getTarget(context);

    if (!attacker || !target) {
      return false;
    }

    const weapon = this.getWeapon(attacker);
    const validationResult = this.validateAttack(attacker, target, weapon);

    return validationResult.success;
  }

  getRequiredRules(): string[] {
    return ['attack-roll', 'damage-calculation', 'combat-effects', 'combat-result'];
  }

  private getAttacker(context: GameContext): CharacterData | MonsterData | null {
    const entity = context.getEntity(this.parameters.attackerId);
    if (entity && ('race' in entity || 'hitDice' in entity)) {
      return entity as CharacterData | MonsterData;
    }
    return null;
  }

  private getTarget(context: GameContext): CharacterData | MonsterData | null {
    const entity = context.getEntity(this.parameters.targetId);
    if (entity && ('race' in entity || 'hitDice' in entity)) {
      return entity as CharacterData | MonsterData;
    }
    return null;
  }

  private getWeapon(attacker: CharacterData | MonsterData): Weapon | undefined {
    if (!this.parameters.weaponId) {
      return undefined;
    }

    if ('inventory' in attacker) {
      const weapon = attacker.inventory.find(
        (item) => item.id === this.parameters.weaponId && 'damage' in item
      ) as Weapon | undefined;

      return weapon;
    }

    return undefined;
  }

  private validateAttack(
    attacker: CharacterData | MonsterData,
    target: CharacterData | MonsterData,
    weapon?: Weapon
  ): { success: boolean; message: string } {
    if (attacker.hitPoints.current <= 0) {
      return { success: false, message: 'Attacker is unconscious or dead' };
    }

    if (target.hitPoints.current < -10) {
      return { success: false, message: 'Target is already dead' };
    }

    if (weapon && 'inventory' in attacker) {
      const hasWeapon = attacker.inventory.some((item) => item.id === weapon.id);
      if (!hasWeapon) {
        return { success: false, message: 'Attacker does not have the specified weapon' };
      }
    }

    const preventingEffects =
      attacker.statusEffects?.filter(
        (effect) =>
          effect.name.toLowerCase().includes('paralyzed') ||
          effect.name.toLowerCase().includes('unconscious') ||
          effect.name.toLowerCase().includes('stunned')
      ) || [];

    if (preventingEffects.length > 0) {
      return { success: false, message: `Attacker is ${preventingEffects[0].name.toLowerCase()}` };
    }

    return { success: true, message: 'Attack is valid' };
  }

  getCommandType(): string {
    return this.type;
  }

  getParameters(): AttackParameters {
    return { ...this.parameters };
  }

  getDescription(): string {
    const weapon = this.parameters.weaponId ? `with weapon ${this.parameters.weaponId}` : 'unarmed';
    const modifiers = this.parameters.situationalModifiers
      ? ` (${this.parameters.situationalModifiers > 0 ? '+' : ''}${this.parameters.situationalModifiers})`
      : '';

    return `${this.parameters.attackerId} attacks ${this.parameters.targetId} ${weapon}${modifiers}`;
  }
}
