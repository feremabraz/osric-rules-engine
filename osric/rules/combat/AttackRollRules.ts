import {
  type AttackContext,
  calculateAttackModifiers,
  calculateTargetNumber,
} from '@osric/core/CombatHelpers';
import type { Command } from '@osric/core/Command';
import { ContextKeys } from '@osric/core/ContextKeys';
import { DiceEngine } from '@osric/core/Dice';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import type { Character as CharacterData } from '@osric/types/character';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';
import type { Weapon } from '@osric/types/item';
import type { Monster as MonsterData } from '@osric/types/monster';

// AttackContext now sourced from core CombatHelpers

interface AttackRollResult {
  naturalRoll: number;
  modifiers: number;
  totalAttackRoll: number;
  targetNumber: number;
  hit: boolean;
  critical: boolean;
  criticalMiss: boolean;
  weapon?: Weapon;
}

export class AttackRollRule extends BaseRule {
  readonly name = RULE_NAMES.ATTACK_ROLL;
  readonly priority = 10;

  canApply(context: GameContext, command: Command): boolean {
    return (
      command.type === COMMAND_TYPES.ATTACK &&
      context.getTemporary(ContextKeys.COMBAT_ATTACK_CONTEXT) !== null
    );
  }

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const attackContext = context.getTemporary(ContextKeys.COMBAT_ATTACK_CONTEXT) as AttackContext;

    if (!attackContext) {
      return this.createFailureResult('No attack context found');
    }

    try {
      const { attacker, target, weapon } = attackContext;
      const situationalModifiers = attackContext.situationalModifiers ?? 0;
      const isChargedAttack = attackContext.isChargedAttack ?? false;

      const naturalRoll = DiceEngine.roll('1d20').total;

      const modifiers = calculateAttackModifiers(
        attacker,
        weapon,
        situationalModifiers,
        isChargedAttack
      );

      const totalAttackRoll = naturalRoll + modifiers;

      const targetNumber = calculateTargetNumber(attacker, target);

      const hit = totalAttackRoll >= targetNumber;

      const critical = naturalRoll === 20;

      const criticalMiss = naturalRoll === 1;

      const attackRollResult: AttackRollResult = {
        naturalRoll,
        modifiers,
        totalAttackRoll,
        targetNumber,
        hit: hit || critical,
        critical,
        criticalMiss,
        weapon,
      };

      context.setTemporary(ContextKeys.COMBAT_ATTACK_ROLL_RESULT, attackRollResult);

      const message = hit
        ? `Attack ${critical ? '(critical!) ' : ''}hits! Roll: ${totalAttackRoll} vs target: ${targetNumber}`
        : `Attack misses${criticalMiss ? ' (critical miss!)' : ''}. Roll: ${totalAttackRoll} vs target: ${targetNumber}`;

      return this.createSuccessResult(message);
    } catch (error) {
      return this.createFailureResult(
        `Attack roll failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // helpers moved to core/CombatHelpers
}
