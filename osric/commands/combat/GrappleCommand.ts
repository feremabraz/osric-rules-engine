import { BaseCommand, type CommandResult, type EntityId } from '../../core/Command';
import type { GameContext } from '../../core/GameContext';
import { COMMAND_TYPES } from '../../types/constants';
import type { Character as CharacterData, Monster as MonsterData } from '../../types/entities';

export interface GrappleParameters {
  attackerId: string | import('@osric/types').CharacterId | import('@osric/types').MonsterId;
  targetId: string | import('@osric/types').CharacterId | import('@osric/types').MonsterId;
  grappleType: 'standard' | 'overbearing';
  isChargedAttack?: boolean;
  situationalModifiers?: number;
}

export class GrappleCommand extends BaseCommand<GrappleParameters> {
  readonly type = COMMAND_TYPES.GRAPPLE;
  readonly parameters: GrappleParameters;

  constructor(parameters: GrappleParameters, actorId: EntityId, targetIds: EntityId[] = []) {
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

      const validationResult = this.validateGrapple(attacker, target);
      if (!validationResult.success) {
        return this.createFailureResult(validationResult.message);
      }

      const grappleContext = {
        attacker,
        target,
        grappleType: this.parameters.grappleType,
        isChargedAttack: this.parameters.isChargedAttack || false,
        situationalModifiers: this.parameters.situationalModifiers || 0,
      };

      context.setTemporary('grapple-context', grappleContext);

      return this.createSuccessResult('Grapple command prepared for rule processing');
    } catch (error) {
      return this.createFailureResult(
        `Grapple command failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  canExecute(context: GameContext): boolean {
    const attacker = this.getAttacker(context);
    const target = this.getTarget(context);

    if (!attacker || !target) {
      return false;
    }

    const validationResult = this.validateGrapple(attacker, target);
    return validationResult.success;
  }

  getRequiredRules(): string[] {
    return ['grapple-attack', 'strength-comparison', 'grapple-effects', 'grapple-result'];
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

  private validateGrapple(
    attacker: CharacterData | MonsterData,
    target: CharacterData | MonsterData
  ): { success: boolean; message: string } {
    if (attacker.hitPoints.current <= 0) {
      return { success: false, message: 'Attacker is unconscious or dead' };
    }

    if (target.hitPoints.current <= 0) {
      return { success: false, message: 'Cannot grapple unconscious or dead target' };
    }

    const preventingEffects =
      attacker.statusEffects?.filter(
        (effect) =>
          effect.name.toLowerCase().includes('paralyzed') ||
          effect.name.toLowerCase().includes('unconscious') ||
          effect.name.toLowerCase().includes('stunned') ||
          effect.name.toLowerCase().includes('grappled') ||
          effect.name.toLowerCase().includes('grappling')
      ) || [];

    if (preventingEffects.length > 0) {
      return { success: false, message: `Attacker is ${preventingEffects[0].name.toLowerCase()}` };
    }

    const targetGrappled =
      target.statusEffects?.some(
        (effect) =>
          effect.name.toLowerCase().includes('grappled') ||
          effect.name.toLowerCase().includes('restrained')
      ) || false;

    if (targetGrappled) {
      return { success: false, message: 'Target is already grappled' };
    }

    if (this.parameters.grappleType === 'overbearing' && !this.parameters.isChargedAttack) {
      return { success: false, message: 'Overbearing requires a charge attack' };
    }

    return { success: true, message: 'Grapple is valid' };
  }

  getCommandType(): string {
    return this.type;
  }

  getParameters(): GrappleParameters {
    return { ...this.parameters };
  }

  getDescription(): string {
    const type = this.parameters.grappleType === 'overbearing' ? 'overbear' : 'grapple';
    const charge = this.parameters.isChargedAttack ? ' (charge attack)' : '';

    return `${this.parameters.attackerId} attempts to ${type} ${this.parameters.targetId}${charge}`;
  }
}
