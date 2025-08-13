import type { Command } from '@osric/core/Command';
import { ContextKeys } from '@osric/core/ContextKeys';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import type { Character as CharacterData } from '@osric/types/character';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';
import type { Monster as MonsterData } from '@osric/types/monster';

export class ApplyDamageRules extends BaseRule {
  readonly name = RULE_NAMES.APPLY_DAMAGE;
  readonly priority = 30;

  canApply(context: GameContext, command: Command): boolean {
    if (command.type !== COMMAND_TYPES.ATTACK) return false;

    const attackCtx = context.getTemporary(ContextKeys.COMBAT_ATTACK_CONTEXT);
    const damage = context.getTemporary(ContextKeys.COMBAT_DAMAGE_RESULT);
    return attackCtx !== null && damage !== null;
  }

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const attackContext = context.getTemporary(ContextKeys.COMBAT_ATTACK_CONTEXT) as {
      attacker: CharacterData | MonsterData;
      target: CharacterData | MonsterData;
    } | null;
    const damageResult = context.getTemporary(ContextKeys.COMBAT_DAMAGE_RESULT) as {
      totalDamage: number;
    } | null;

    if (!attackContext || !damageResult) {
      return this.createFailureResult('Missing attack or damage context');
    }

    const { attacker, target } = attackContext;
    const totalDamage = Math.max(0, Math.floor(damageResult.totalDamage || 0));

    // Apply damage to target entity
    const updatedTarget: CharacterData | MonsterData = {
      ...target,
      hitPoints: {
        ...target.hitPoints,
        current: Math.max(0, target.hitPoints.current - totalDamage),
      },
    } as CharacterData | MonsterData;

    // Persist target update in the GameContext
    context.setEntity(updatedTarget.id, updatedTarget);
    context.setTemporary(ContextKeys.COMBAT_ATTACK_TARGET, updatedTarget);
    context.setTemporary(ContextKeys.COMBAT_DAMAGE_APPLIED, totalDamage);

    const msg =
      totalDamage > 0
        ? `${updatedTarget.name} takes ${totalDamage} damage (${updatedTarget.hitPoints.current} HP left)`
        : `${attacker.name} deals no damage`;

    // Expose damage array too for chain aggregation
    return this.createSuccessResult(
      msg,
      undefined,
      undefined,
      totalDamage > 0 ? [totalDamage] : undefined
    );
  }
}

export default ApplyDamageRules;
