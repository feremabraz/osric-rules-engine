import { GrappleValidator } from '@osric/commands/combat/validators/GrappleValidator';
import { BaseCommand, type CommandResult, type EntityId } from '@osric/core/Command';
import { ContextKeys } from '@osric/core/ContextKeys';
import type { GameContext } from '@osric/core/GameContext';
import { isFailure, isSuccess } from '@osric/core/Rule';
import { formatValidationErrors } from '@osric/core/ValidationPrimitives';
import type { Character as CharacterData } from '@osric/types/character';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';
import type { Monster as MonsterData } from '@osric/types/monster';

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

  protected validateParameters(): void {
    const result = GrappleValidator.validate(this.parameters);
    if (!result.valid) {
      const msgs = formatValidationErrors(result.errors);
      throw new Error(`Parameter validation failed: ${msgs.join(', ')}`);
    }
  }

  async execute(context: GameContext): Promise<CommandResult> {
    try {
      const attacker = this.getAttacker(context);
      const target = this.getTarget(context);

      if (!attacker || !target) {
        return this.createFailureResult('Invalid attacker or target');
      }

      const validationResult = this.validateGrapple(attacker, target);
      if (isFailure(validationResult)) {
        return validationResult;
      }

      const grappleContext = {
        attacker,
        target,
        grappleType: this.parameters.grappleType,
        isChargedAttack: this.parameters.isChargedAttack || false,
        situationalModifiers: this.parameters.situationalModifiers || 0,
      };

      context.setTemporary(ContextKeys.COMBAT_GRAPPLE_CONTEXT, grappleContext);

      // Delegate actual mechanics to the RuleEngine
      return await this.executeWithRuleEngine(context);
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
    return isSuccess(validationResult);
  }

  getRequiredRules(): string[] {
    return [
      RULE_NAMES.GRAPPLE_ATTACK,
      RULE_NAMES.STRENGTH_COMPARISON,
      RULE_NAMES.GRAPPLE_EFFECT,
      RULE_NAMES.GRAPPLING,
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

  private validateGrapple(
    attacker: CharacterData | MonsterData,
    target: CharacterData | MonsterData
  ): { kind: 'success' | 'failure'; message: string } {
    if (attacker.hitPoints.current <= 0) {
      return { kind: 'failure', message: 'Attacker is unconscious or dead' };
    }

    if (target.hitPoints.current <= 0) {
      return { kind: 'failure', message: 'Cannot grapple unconscious or dead target' };
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
      return { kind: 'failure', message: `Attacker is ${preventingEffects[0].name.toLowerCase()}` };
    }

    const targetGrappled =
      target.statusEffects?.some(
        (effect) =>
          effect.name.toLowerCase().includes('grappled') ||
          effect.name.toLowerCase().includes('restrained')
      ) || false;

    if (targetGrappled) {
      return { kind: 'failure', message: 'Target is already grappled' };
    }

    if (this.parameters.grappleType === 'overbearing' && !this.parameters.isChargedAttack) {
      return { kind: 'failure', message: 'Overbearing requires a charge attack' };
    }

    return { kind: 'success', message: 'Grapple is valid' };
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
