/**
 * GrappleCommand - OSRIC Grappling Combat Command
 *
 * Implements the complete OSRIC grappling system including:
 * - Standard grappling (restrains target)
 * - Overbearing (knocks target prone)
 * - Strength comparison mechanics
 * - Break-free attempts
 *
 * PRESERVATION: All OSRIC grappling mechanics and calculations preserved exactly.
 */

import { BaseCommand, type CommandResult } from '../../core/Command';
import type { GameContext } from '../../core/GameContext';
import { COMMAND_TYPES } from '../../types/constants';
import type { Character as CharacterData, Monster as MonsterData } from '../../types/entities';

export interface GrappleParameters {
  attackerId: string; // Character or Monster ID performing grapple
  targetId: string; // Character or Monster ID being grappled
  grappleType: 'standard' | 'overbearing'; // Type of grapple attempt
  isChargedAttack?: boolean; // If overbearing after a charge
  situationalModifiers?: number; // Additional modifiers
}

export class GrappleCommand extends BaseCommand {
  readonly type = COMMAND_TYPES.GRAPPLE;

  constructor(
    private parameters: GrappleParameters,
    actorId: string // The entity performing the grapple
  ) {
    super(actorId);
  }

  async execute(context: GameContext): Promise<CommandResult> {
    try {
      // Get attacker and target entities
      const attacker = this.getAttacker(context);
      const target = this.getTarget(context);

      if (!attacker || !target) {
        return this.createFailureResult('Invalid attacker or target');
      }

      // Validate grapple is possible
      const validationResult = this.validateGrapple(attacker, target);
      if (!validationResult.success) {
        return this.createFailureResult(validationResult.message);
      }

      // Store grapple context for rules to process
      const grappleContext = {
        attacker,
        target,
        grappleType: this.parameters.grappleType,
        isChargedAttack: this.parameters.isChargedAttack || false,
        situationalModifiers: this.parameters.situationalModifiers || 0,
      };

      context.setTemporary('grapple-context', grappleContext);

      // Rules will process:
      // 1. GrappleAttackRule - Determine if grapple attempt succeeds
      // 2. StrengthComparisonRule - Compare strengths for grapple effect
      // 3. GrappleEffectRule - Apply grapple conditions and damage
      // 4. GrappleResultRule - Generate final grapple result

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
    // Check if attacker is conscious and able to act
    if (attacker.hitPoints.current <= 0) {
      return { success: false, message: 'Attacker is unconscious or dead' };
    }

    // Check if target is still alive
    if (target.hitPoints.current <= 0) {
      return { success: false, message: 'Cannot grapple unconscious or dead target' };
    }

    // Check for status effects that prevent grappling
    const preventingEffects =
      attacker.statusEffects?.filter(
        (effect) =>
          effect.name.toLowerCase().includes('paralyzed') ||
          effect.name.toLowerCase().includes('unconscious') ||
          effect.name.toLowerCase().includes('stunned') ||
          effect.name.toLowerCase().includes('grappled') || // Can't grapple while grappled
          effect.name.toLowerCase().includes('grappling') // Can't grapple while grappling
      ) || [];

    if (preventingEffects.length > 0) {
      return { success: false, message: `Attacker is ${preventingEffects[0].name.toLowerCase()}` };
    }

    // Check if target is already grappled by someone else
    const targetGrappled =
      target.statusEffects?.some(
        (effect) =>
          effect.name.toLowerCase().includes('grappled') ||
          effect.name.toLowerCase().includes('restrained')
      ) || false;

    if (targetGrappled) {
      return { success: false, message: 'Target is already grappled' };
    }

    // Overbearing requires a charge attack
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
