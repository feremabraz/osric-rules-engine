import { BaseCommand, type CommandResult, type EntityId } from '@osric/core/Command';
import { ContextKeys } from '@osric/core/ContextKeys';
import type { GameContext } from '@osric/core/GameContext';
import { isFailure, isSuccess } from '@osric/core/Rule';
import { formatValidationErrors } from '@osric/core/ValidationPrimitives';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';

import { AttackValidator } from '@osric/commands/combat/validators/AttackValidator';
import type { CharacterId, ItemId, MonsterId } from '@osric/types';
import type { Character as CharacterData } from '@osric/types/character';
import type { Weapon } from '@osric/types/item';
import type { Monster as MonsterData } from '@osric/types/monster';
import type { CombatResult } from '@osric/types/shared';

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

  protected validateParameters(): void {
    const result = AttackValidator.validate(this.parameters);
    if (!result.valid) {
      const messages = formatValidationErrors(result.errors);
      throw new Error(`Parameter validation failed: ${messages.join(', ')}`);
    }
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
      if (isFailure(validationResult)) {
        return validationResult;
      }

      const attackContext = {
        attacker,
        target,
        weapon,
        situationalModifiers: this.parameters.situationalModifiers || 0,
        attackType: this.parameters.attackType || 'normal',
        isChargedAttack: this.parameters.isChargedAttack || false,
      };

      context.setTemporary(ContextKeys.COMBAT_ATTACK_CONTEXT, attackContext);

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

    return isSuccess(validationResult);
  }

  getRequiredRules(): string[] {
    return [
      RULE_NAMES.ATTACK_ROLL,
      RULE_NAMES.DAMAGE_CALCULATION,
      RULE_NAMES.APPLY_DAMAGE,
      RULE_NAMES.POST_DAMAGE_STATUS,
      RULE_NAMES.CRITICAL_HITS,
      RULE_NAMES.MULTIPLE_ATTACKS,
    ];
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
  ): { kind: 'success' | 'failure'; message: string } {
    if (attacker.hitPoints.current <= 0) {
      return { kind: 'failure', message: 'Attacker is unconscious or dead' };
    }

    if (target.hitPoints.current < -10) {
      return { kind: 'failure', message: 'Target is already dead' };
    }

    if (weapon && 'inventory' in attacker) {
      const hasWeapon = attacker.inventory.some((item) => item.id === weapon.id);
      if (!hasWeapon) {
        return { kind: 'failure', message: 'Attacker does not have the specified weapon' };
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
      return { kind: 'failure', message: `Attacker is ${preventingEffects[0].name.toLowerCase()}` };
    }

    return { kind: 'success', message: 'Attack is valid' };
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
