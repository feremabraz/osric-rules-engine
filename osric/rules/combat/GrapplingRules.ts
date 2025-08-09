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

export enum GrapplingOutcome {
  ATTACKER_GRAPPLES = 'attacker_grapples',
  DEFENDER_GRAPPLES = 'defender_grapples',
  OVERBEARING_SUCCESS = 'overbearing_success',
  MISS = 'miss',
  STALEMATE = 'stalemate',
}

export class GrappleAttackRule extends BaseRule {
  readonly name = RULE_NAMES.GRAPPLE_ATTACK;
  readonly priority = 10;

  canApply(context: GameContext, command: Command): boolean {
    return (
      command.type === COMMAND_TYPES.GRAPPLE &&
      context.getTemporary('combat:grapple:context') !== null
    );
  }

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const grappleContext = context.getTemporary('combat:grapple:context') as GrappleContext;

    if (!grappleContext) {
      return this.createFailureResult('No grapple context found');
    }

    try {
      const { attacker, target } = grappleContext;

      const attackRoll = this.rollD20();
      const attackModifiers = this.calculateGrappleAttackModifiers(attacker, grappleContext);
      const totalAttackRoll = attackRoll + attackModifiers;

      const targetNumber = attacker.thac0 - target.armorClass;
      const hit = totalAttackRoll >= targetNumber;

      if (!hit) {
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

  private calculateGrappleAttackModifiers(
    attacker: CharacterData | MonsterData,
    context: GrappleContext
  ): number {
    let modifier = context.situationalModifiers;

    if ('abilityModifiers' in attacker && attacker.abilityModifiers.strengthHitAdj) {
      modifier += attacker.abilityModifiers.strengthHitAdj;
    }

    if (context.grappleType === 'overbearing' && context.isChargedAttack) {
      modifier += 2;
    }

    return modifier;
  }

  private rollD20(): number {
    return Math.floor(Math.random() * 20) + 1;
  }
}

export class StrengthComparisonRule extends BaseRule {
  readonly name = RULE_NAMES.STRENGTH_COMPARISON;
  readonly priority = 20;

  canApply(context: GameContext, command: Command): boolean {
    const attackResult = context.getTemporary('grapple-attack-result') as GrappleAttackResult;
    return (
      command.type === COMMAND_TYPES.GRAPPLE &&
      context.getTemporary('combat:grapple:context') !== null &&
      attackResult?.hit === true
    );
  }

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const grappleContext = context.getTemporary('combat:grapple:context') as GrappleContext;

    if (!grappleContext) {
      return this.createFailureResult('No grapple context found');
    }

    try {
      const { attacker, target, grappleType } = grappleContext;

      const outcome = this.compareStrengths(attacker, target, grappleType);

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

  private compareStrengths(
    attacker: CharacterData | MonsterData,
    target: CharacterData | MonsterData,
    grappleType: 'standard' | 'overbearing'
  ): GrapplingOutcome {
    const attackerStr = this.getEffectiveStrength(attacker);
    const targetStr = this.getEffectiveStrength(target);

    if (grappleType === 'overbearing') {
      if (attackerStr > targetStr) {
        return GrapplingOutcome.OVERBEARING_SUCCESS;
      }
      return GrapplingOutcome.MISS;
    }

    if (attackerStr > targetStr) {
      return GrapplingOutcome.ATTACKER_GRAPPLES;
    }
    if (targetStr > attackerStr) {
      return GrapplingOutcome.DEFENDER_GRAPPLES;
    }

    return GrapplingOutcome.STALEMATE;
  }

  private getEffectiveStrength(entity: CharacterData | MonsterData): number {
    if ('abilities' in entity) {
      return entity.abilities.strength;
    }
    if ('strength' in entity) {
      return (entity as MonsterData & { strength?: number }).strength || 12;
    }
    return 12;
  }

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
  readonly priority = 30;

  canApply(context: GameContext, command: Command): boolean {
    return (
      command.type === COMMAND_TYPES.GRAPPLE &&
      context.getTemporary('combat:grapple:context') !== null &&
      context.getTemporary('strength-comparison-result') !== null
    );
  }

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const grappleContext = context.getTemporary('combat:grapple:context') as GrappleContext;
    const strengthResult = context.getTemporary(
      'strength-comparison-result'
    ) as StrengthComparisonResult;

    if (!grappleContext || !strengthResult) {
      return this.createFailureResult('Missing grapple context or strength comparison result');
    }

    try {
      const { attacker, target } = grappleContext;
      const { outcome } = strengthResult;

      const effects = this.applyGrappleEffects(attacker, target, outcome);

      context.setTemporary('grapple-final-result', effects);

      return this.createSuccessResult('Grapple effects applied');
    } catch (error) {
      return this.createFailureResult(
        `Grapple effects failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

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
        targetEffects.push(this.createGrappledEffect());

        attackerEffects.push(this.createGrapplingEffect());
        damage = this.rollGrappleDamage();
        break;

      case GrapplingOutcome.DEFENDER_GRAPPLES:
        attackerEffects.push(this.createGrappledEffect());

        targetEffects.push(this.createGrapplingEffect());
        damage = 0;
        break;

      case GrapplingOutcome.OVERBEARING_SUCCESS:
        targetEffects.push(this.createProneEffect());
        damage = this.rollGrappleDamage();
        break;

      case GrapplingOutcome.STALEMATE:
        attackerEffects.push(this.createGrappledEffect());
        targetEffects.push(this.createGrappledEffect());
        damage = 0;
        break;

      case GrapplingOutcome.MISS:
        break;
    }

    if (damage > 0) {
      target.hitPoints.current = Math.max(0, target.hitPoints.current - damage);
    }

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

  private createGrappledEffect(): StatusEffect {
    return {
      name: 'Grappled',
      duration: 0,
      effect: 'Restrained and cannot move freely. -4 to attack rolls.',
      savingThrow: null,
      endCondition: 'Break free with strength check or grappler releases',
    };
  }

  private createGrapplingEffect(): StatusEffect {
    return {
      name: 'Grappling',
      duration: 0,
      effect: 'Grappling an opponent. Movement restricted.',
      savingThrow: null,
      endCondition: 'Release grapple or opponent breaks free',
    };
  }

  private createProneEffect(): StatusEffect {
    return {
      name: 'Prone',
      duration: 1,
      effect: 'Knocked down. -4 to attack rolls, attackers get +4 to hit.',
      savingThrow: null,
      endCondition: 'Stand up (costs movement)',
    };
  }

  private rollGrappleDamage(): number {
    return Math.floor(Math.random() * 2);
  }

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
