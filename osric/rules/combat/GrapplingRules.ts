/**
 * GrapplingRules - OSRIC Grappling System Rules
 *
 * Migrated from rules/combat/grappling.ts
 * PRESERVATION: All OSRIC grappling mechanics and calculations preserved exactly
 */

import type { Command } from '@osric/core/Command';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';
import type {
  Character as CharacterData,
  Monster as MonsterData,
  StatusEffect,
} from '@osric/types/entities';

interface GrappleContext {
  attacker: CharacterData | MonsterData;
  target: CharacterData | MonsterData;
  grappleType: 'standard' | 'overbearing';
  isChargedAttack: boolean;
  situationalModifiers: number;
}

interface GrappleAttackResult {
  hit: boolean;
  attackRoll: number;
  targetNumber: number;
}

interface StrengthComparisonResult {
  outcome: GrapplingOutcome;
  attackerStrength: number;
  targetStrength: number;
}

// OSRIC Grappling Outcomes - PRESERVE EXACT VALUES
export enum GrapplingOutcome {
  ATTACKER_GRAPPLES = 'attacker_grapples',
  DEFENDER_GRAPPLES = 'defender_grapples',
  OVERBEARING_SUCCESS = 'overbearing_success',
  MISS = 'miss',
  STALEMATE = 'stalemate',
}

export class GrappleAttackRule extends BaseRule {
  readonly name = RULE_NAMES.GRAPPLE_ATTACK;
  readonly priority = 10; // Execute first in grapple chain

  canApply(context: GameContext, command: Command): boolean {
    return (
      command.type === COMMAND_TYPES.GRAPPLE && context.getTemporary('grapple-context') !== null
    );
  }

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const grappleContext = context.getTemporary('grapple-context') as GrappleContext;

    if (!grappleContext) {
      return this.createFailureResult('No grapple context found');
    }

    try {
      const { attacker, target } = grappleContext;

      // First, must hit with normal attack roll - PRESERVE OSRIC REQUIREMENT
      const attackRoll = this.rollD20();
      const attackModifiers = this.calculateGrappleAttackModifiers(attacker, grappleContext);
      const totalAttackRoll = attackRoll + attackModifiers;

      // Calculate target number using THAC0
      const targetNumber = attacker.thac0 - target.armorClass;
      const hit = totalAttackRoll >= targetNumber;

      if (!hit) {
        // Grapple attempt misses completely
        const grappleResult = {
          outcome: GrapplingOutcome.MISS,
          hit: false,
          damage: 0,
          statusEffects: [],
          message: `${attacker.name}'s grapple attempt misses ${target.name}`,
        };

        context.setTemporary('grapple-result', grappleResult);
        return this.createSuccessResult('Grapple attack missed');
      }

      // Attack hits, proceed to strength comparison
      const attackResult: GrappleAttackResult = {
        hit: true,
        attackRoll: totalAttackRoll,
        targetNumber,
      };

      context.setTemporary('grapple-attack-result', attackResult);
      return this.createSuccessResult('Grapple attack hits - proceeding to strength comparison');
    } catch (error) {
      return this.createFailureResult(
        `Grapple attack failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Calculate grapple attack modifiers - PRESERVE OSRIC BONUSES
   */
  private calculateGrappleAttackModifiers(
    attacker: CharacterData | MonsterData,
    context: GrappleContext
  ): number {
    let modifier = context.situationalModifiers;

    // Apply strength bonus for grapple attempts (characters only)
    if ('abilityModifiers' in attacker && attacker.abilityModifiers.strengthHitAdj) {
      modifier += attacker.abilityModifiers.strengthHitAdj;
    }

    // Apply charge bonus for overbearing
    if (context.grappleType === 'overbearing' && context.isChargedAttack) {
      modifier += 2; // OSRIC charge attack bonus
    }

    return modifier;
  }

  private rollD20(): number {
    return Math.floor(Math.random() * 20) + 1;
  }
}

export class StrengthComparisonRule extends BaseRule {
  readonly name = RULE_NAMES.STRENGTH_COMPARISON;
  readonly priority = 20; // Execute after grapple attack

  canApply(context: GameContext, command: Command): boolean {
    const attackResult = context.getTemporary('grapple-attack-result') as GrappleAttackResult;
    return (
      command.type === COMMAND_TYPES.GRAPPLE &&
      context.getTemporary('grapple-context') !== null &&
      attackResult?.hit === true
    );
  }

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const grappleContext = context.getTemporary('grapple-context') as GrappleContext;

    if (!grappleContext) {
      return this.createFailureResult('No grapple context found');
    }

    try {
      const { attacker, target, grappleType } = grappleContext;

      // Compare strengths - PRESERVE OSRIC STRENGTH COMPARISON
      const outcome = this.compareStrengths(attacker, target, grappleType);

      // Store strength comparison result
      const strengthResult: StrengthComparisonResult = {
        outcome,
        attackerStrength: this.getEffectiveStrength(attacker),
        targetStrength: this.getEffectiveStrength(target),
      };

      context.setTemporary('strength-comparison-result', strengthResult);

      const message = this.getOutcomeMessage(outcome, attacker.name, target.name);
      return this.createSuccessResult(message);
    } catch (error) {
      return this.createFailureResult(
        `Strength comparison failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Compare strengths to determine grapple outcome - PRESERVE OSRIC LOGIC
   */
  private compareStrengths(
    attacker: CharacterData | MonsterData,
    target: CharacterData | MonsterData,
    grappleType: 'standard' | 'overbearing'
  ): GrapplingOutcome {
    const attackerStr = this.getEffectiveStrength(attacker);
    const targetStr = this.getEffectiveStrength(target);

    // OSRIC Grappling Logic - PRESERVE EXACT MECHANICS
    if (grappleType === 'overbearing') {
      // Overbearing: attacker needs higher strength to succeed
      if (attackerStr > targetStr) {
        return GrapplingOutcome.OVERBEARING_SUCCESS;
      }
      return GrapplingOutcome.MISS; // Overbearing fails if not stronger
    }

    // Standard grappling: mutual grapple possible
    if (attackerStr > targetStr) {
      return GrapplingOutcome.ATTACKER_GRAPPLES;
    }
    if (targetStr > attackerStr) {
      return GrapplingOutcome.DEFENDER_GRAPPLES;
    }
    // Equal strength - both grappled
    return GrapplingOutcome.STALEMATE;
  }

  /**
   * Get effective strength for grappling - PRESERVE OSRIC STRENGTH VALUES
   */
  private getEffectiveStrength(entity: CharacterData | MonsterData): number {
    if ('abilities' in entity) {
      return entity.abilities.strength;
    }
    if ('strength' in entity) {
      // Monster strength value
      return (entity as MonsterData & { strength?: number }).strength || 12;
    }
    return 12; // Default strength
  }

  /**
   * Get descriptive message for outcome
   */
  private getOutcomeMessage(
    outcome: GrapplingOutcome,
    attackerName: string,
    targetName: string
  ): string {
    switch (outcome) {
      case GrapplingOutcome.ATTACKER_GRAPPLES:
        return `${attackerName} successfully grapples ${targetName}`;
      case GrapplingOutcome.DEFENDER_GRAPPLES:
        return `${targetName} reverses the grapple and grapples ${attackerName}`;
      case GrapplingOutcome.OVERBEARING_SUCCESS:
        return `${attackerName} successfully overbears ${targetName}`;
      case GrapplingOutcome.STALEMATE:
        return `${attackerName} and ${targetName} are mutually grappled`;
      case GrapplingOutcome.MISS:
        return 'Grapple attempt fails';
      default:
        return 'Unknown grapple outcome';
    }
  }
}

export class GrappleEffectRule extends BaseRule {
  readonly name = RULE_NAMES.GRAPPLE_EFFECT;
  readonly priority = 30; // Execute after strength comparison

  canApply(context: GameContext, command: Command): boolean {
    return (
      command.type === COMMAND_TYPES.GRAPPLE &&
      context.getTemporary('grapple-context') !== null &&
      context.getTemporary('strength-comparison-result') !== null
    );
  }

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const grappleContext = context.getTemporary('grapple-context') as GrappleContext;
    const strengthResult = context.getTemporary(
      'strength-comparison-result'
    ) as StrengthComparisonResult;

    if (!grappleContext || !strengthResult) {
      return this.createFailureResult('Missing grapple context or strength comparison result');
    }

    try {
      const { attacker, target } = grappleContext;
      const { outcome } = strengthResult;

      // Apply grapple effects and damage - PRESERVE OSRIC MECHANICS
      const effects = this.applyGrappleEffects(attacker, target, outcome);

      // Store final grapple result
      context.setTemporary('grapple-final-result', effects);

      return this.createSuccessResult('Grapple effects applied');
    } catch (error) {
      return this.createFailureResult(
        `Grapple effects failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Apply grapple effects based on outcome - PRESERVE OSRIC EFFECTS
   */
  private applyGrappleEffects(
    attacker: CharacterData | MonsterData,
    target: CharacterData | MonsterData,
    outcome: GrapplingOutcome
  ): {
    damage: number;
    statusEffects: StatusEffect[];
    attackerEffects: StatusEffect[];
    targetEffects: StatusEffect[];
    message: string;
  } {
    const attackerEffects: StatusEffect[] = [];
    const targetEffects: StatusEffect[] = [];
    let damage = 0;

    switch (outcome) {
      case GrapplingOutcome.ATTACKER_GRAPPLES:
        // Target is grappled/restrained
        targetEffects.push(this.createGrappledEffect());
        // Attacker is also grappling (restricted movement)
        attackerEffects.push(this.createGrapplingEffect());
        damage = this.rollGrappleDamage(); // 0-1 damage in OSRIC
        break;

      case GrapplingOutcome.DEFENDER_GRAPPLES:
        // Attacker is grappled/restrained (reversal)
        attackerEffects.push(this.createGrappledEffect());
        // Target is grappling
        targetEffects.push(this.createGrapplingEffect());
        damage = 0; // No damage to attacker in reversal
        break;

      case GrapplingOutcome.OVERBEARING_SUCCESS:
        // Target is knocked prone
        targetEffects.push(this.createProneEffect());
        damage = this.rollGrappleDamage(); // 0-1 damage
        break;

      case GrapplingOutcome.STALEMATE:
        // Both are mutually grappled
        attackerEffects.push(this.createGrappledEffect());
        targetEffects.push(this.createGrappledEffect());
        damage = 0; // No damage in stalemate
        break;

      case GrapplingOutcome.MISS:
        // No effects
        break;
    }

    // Apply damage to target
    if (damage > 0) {
      target.hitPoints.current = Math.max(0, target.hitPoints.current - damage);
    }

    // Apply status effects
    if (attackerEffects.length > 0) {
      attacker.statusEffects = [...(attacker.statusEffects || []), ...attackerEffects];
    }
    if (targetEffects.length > 0) {
      target.statusEffects = [...(target.statusEffects || []), ...targetEffects];
    }

    const allEffects = [...attackerEffects, ...targetEffects];
    const message = this.generateEffectMessage(attacker.name, target.name, outcome, damage);

    return {
      damage,
      statusEffects: allEffects,
      attackerEffects,
      targetEffects,
      message,
    };
  }

  /**
   * Create grappled status effect - PRESERVE OSRIC CONDITIONS
   */
  private createGrappledEffect(): StatusEffect {
    return {
      name: 'Grappled',
      duration: 0, // Until broken free
      effect: 'Restrained and cannot move freely. -4 to attack rolls.',
      savingThrow: null,
      endCondition: 'Break free with strength check or grappler releases',
    };
  }

  /**
   * Create grappling status effect (for the grappler)
   */
  private createGrapplingEffect(): StatusEffect {
    return {
      name: 'Grappling',
      duration: 0, // Until released
      effect: 'Grappling an opponent. Movement restricted.',
      savingThrow: null,
      endCondition: 'Release grapple or opponent breaks free',
    };
  }

  /**
   * Create prone status effect - PRESERVE OSRIC CONDITIONS
   */
  private createProneEffect(): StatusEffect {
    return {
      name: 'Prone',
      duration: 1, // Can stand up next round
      effect: 'Knocked down. -4 to attack rolls, attackers get +4 to hit.',
      savingThrow: null,
      endCondition: 'Stand up (costs movement)',
    };
  }

  /**
   * Roll grapple damage - PRESERVE OSRIC 0-1 DAMAGE
   */
  private rollGrappleDamage(): number {
    // OSRIC: Grappling does 0-1 points of damage
    return Math.floor(Math.random() * 2); // 0 or 1
  }

  /**
   * Generate descriptive message for effects
   */
  private generateEffectMessage(
    attackerName: string,
    targetName: string,
    outcome: GrapplingOutcome,
    damage: number
  ): string {
    let message = '';

    switch (outcome) {
      case GrapplingOutcome.ATTACKER_GRAPPLES:
        message = `${attackerName} grapples ${targetName}`;
        if (damage > 0) message += ` for ${damage} damage`;
        message += '. Both are now grappling.';
        break;
      case GrapplingOutcome.DEFENDER_GRAPPLES:
        message = `${targetName} reverses the grapple! ${attackerName} is now grappled.`;
        break;
      case GrapplingOutcome.OVERBEARING_SUCCESS:
        message = `${attackerName} overbears ${targetName}, knocking them prone`;
        if (damage > 0) message += ` for ${damage} damage`;
        message += '.';
        break;
      case GrapplingOutcome.STALEMATE:
        message = `${attackerName} and ${targetName} are locked in mutual grapple.`;
        break;
      case GrapplingOutcome.MISS:
        message = `${attackerName}'s grapple attempt fails.`;
        break;
    }

    return message;
  }
}
