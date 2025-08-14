import type { Command } from '@osric/core/Command';
import { ContextKeys } from '@osric/core/ContextKeys';
import { DiceEngine } from '@osric/core/Dice';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import type { Character as CharacterData } from '@osric/types/character';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';
import type { Monster as MonsterData } from '@osric/types/monster';
import type { StatusEffect } from '@osric/types/shared';
import { GrapplingOutcome } from './GrappleAttackRules';

interface GrappleContext {
  attacker: CharacterData | MonsterData;
  target: CharacterData | MonsterData;
}

interface StrengthComparisonResult {
  outcome: GrapplingOutcome;
}

export class GrappleEffectRules extends BaseRule {
  readonly name = RULE_NAMES.GRAPPLE_EFFECT;
  readonly priority = 30;

  canApply(context: GameContext, command: Command): boolean {
    return (
      command.type === COMMAND_TYPES.GRAPPLE &&
      context.getTemporary(ContextKeys.COMBAT_GRAPPLE_CONTEXT) !== null &&
      context.getTemporary(ContextKeys.COMBAT_GRAPPLE_STRENGTH_COMPARISON) !== null
    );
  }

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const grappleContext = context.getTemporary(
      ContextKeys.COMBAT_GRAPPLE_CONTEXT
    ) as GrappleContext;
    const strengthResult = context.getTemporary(
      ContextKeys.COMBAT_GRAPPLE_STRENGTH_COMPARISON
    ) as StrengthComparisonResult;

    if (!grappleContext || !strengthResult) {
      return this.createFailureResult('Missing grapple context or strength comparison result');
    }

    try {
      const { attacker, target } = grappleContext;
      const { outcome } = strengthResult;

      const effects = this.applyGrappleEffects(attacker, target, outcome);

      context.setTemporary(ContextKeys.COMBAT_GRAPPLE_FINAL_RESULT, effects);

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
    return DiceEngine.roll('1d2').total;
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
