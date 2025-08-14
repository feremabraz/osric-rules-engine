import type { Command } from '@osric/core/Command';
import { ContextKeys } from '@osric/core/ContextKeys';
import { DiceEngine } from '@osric/core/Dice';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import type { Character as CharacterData } from '@osric/types/character';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';
import type { Monster as MonsterData } from '@osric/types/monster';

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

export enum GrapplingOutcome {
  ATTACKER_GRAPPLES = 'attacker_grapples',
  DEFENDER_GRAPPLES = 'defender_grapples',
  OVERBEARING_SUCCESS = 'overbearing_success',
  MISS = 'miss',
  STALEMATE = 'stalemate',
}

export class GrappleAttackRules extends BaseRule {
  readonly name = RULE_NAMES.GRAPPLE_ATTACK;
  readonly priority = 10;

  canApply(context: GameContext, command: Command): boolean {
    return (
      command.type === COMMAND_TYPES.GRAPPLE &&
      context.getTemporary(ContextKeys.COMBAT_GRAPPLE_CONTEXT) !== null
    );
  }

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const grappleContext = context.getTemporary(
      ContextKeys.COMBAT_GRAPPLE_CONTEXT
    ) as GrappleContext;

    if (!grappleContext) {
      return this.createFailureResult('No grapple context found');
    }

    try {
      const { attacker, target } = grappleContext;

      const attackRoll = DiceEngine.roll('1d20').total;
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

        context.setTemporary(ContextKeys.COMBAT_GRAPPLE_RESULT, grappleResult);
        return this.createSuccessResult('Grapple attack missed');
      }

      const attackResult: GrappleAttackResult = {
        hit: true,
        attackRoll: totalAttackRoll,
        targetNumber,
      };

      context.setTemporary(ContextKeys.COMBAT_GRAPPLE_ATTACK_RESULT, attackResult);
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
}
