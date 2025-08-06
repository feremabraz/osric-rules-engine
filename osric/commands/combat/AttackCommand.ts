/**
 * AttackCommand - OSRIC Attack Resolution Command
 *
 * Implements the complete OSRIC attack resolution process including:
 * - THAC0-based attack roll calculation
 * - Damage calculation with modifiers
 * - Critical hit resolution
 * - Status effect application
 * - Combat result generation
 *
 * PRESERVATION: All OSRIC attack mechanics and THAC0 formulas are preserved exactly.
 */

import { BaseCommand, type CommandResult } from '../../core/Command';
import type { GameContext } from '../../core/GameContext';
import { COMMAND_TYPES } from '../../types/constants';
import type {
  Character as CharacterData,
  CombatResult,
  Monster as MonsterData,
  Weapon,
} from '../../types/entities';

export interface AttackParameters {
  attackerId: string; // Character or Monster ID
  targetId: string; // Character or Monster ID
  weaponId?: string; // Optional weapon ID from inventory
  situationalModifiers?: number; // Additional modifiers (flanking, etc.)
  attackType?: 'normal' | 'subdual' | 'grapple'; // Type of attack
  isChargedAttack?: boolean; // For mounted combat bonuses
}

export class AttackCommand extends BaseCommand {
  readonly type = COMMAND_TYPES.ATTACK;

  constructor(
    private parameters: AttackParameters,
    actorId: string // The entity performing the attack
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

      // Get weapon if specified
      const weapon = this.getWeapon(attacker);

      // Validate attack is possible
      const validationResult = this.validateAttack(attacker, target, weapon);
      if (!validationResult.success) {
        return this.createFailureResult(validationResult.message);
      }

      // Store attack context for rules to process
      const attackContext = {
        attacker,
        target,
        weapon,
        situationalModifiers: this.parameters.situationalModifiers || 0,
        attackType: this.parameters.attackType || 'normal',
        isChargedAttack: this.parameters.isChargedAttack || false,
      };

      context.setTemporary('attack-context', attackContext);

      // Rules will process:
      // 1. AttackRollRule - Calculate to-hit and determine success
      // 2. DamageCalculationRule - Calculate damage if hit
      // 3. CombatEffectsRule - Apply status effects and special conditions
      // 4. CombatResultRule - Generate final combat result

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

    // For characters, search inventory
    if ('inventory' in attacker) {
      const weapon = attacker.inventory.find(
        (item) => item.id === this.parameters.weaponId && 'damage' in item
      ) as Weapon | undefined;

      return weapon;
    }

    // For monsters, check natural weapons or equipment
    // This would be expanded based on monster weapon handling
    return undefined;
  }

  private validateAttack(
    attacker: CharacterData | MonsterData,
    target: CharacterData | MonsterData,
    weapon?: Weapon
  ): { success: boolean; message: string } {
    // Check if attacker is conscious and able to act
    if (attacker.hitPoints.current <= 0) {
      return { success: false, message: 'Attacker is unconscious or dead' };
    }

    // Check if target is still alive (can attack dead targets for coup de grace)
    if (target.hitPoints.current < -10) {
      return { success: false, message: 'Target is already dead' };
    }

    // Check if attacker has the weapon equipped (for characters)
    if (weapon && 'inventory' in attacker) {
      const hasWeapon = attacker.inventory.some((item) => item.id === weapon.id);
      if (!hasWeapon) {
        return { success: false, message: 'Attacker does not have the specified weapon' };
      }
    }

    // Check for status effects that prevent attacking
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
