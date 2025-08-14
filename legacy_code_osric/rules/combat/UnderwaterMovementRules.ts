import type { Command } from '@osric/core/Command';
import { ContextKeys } from '@osric/core/ContextKeys';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import type { Character as CharacterData } from '@osric/types/character';
import { RULE_NAMES } from '@osric/types/constants';
import { COMMAND_TYPES } from '@osric/types/constants';
import type { Monster as MonsterData } from '@osric/types/monster';

interface UnderwaterCombatContext {
  combatant: CharacterData | MonsterData;
  waterDepth: number;
  hasWaterBreathing: boolean;
}

export class UnderwaterMovementRules extends BaseRule {
  name = RULE_NAMES.UNDERWATER_MOVEMENT;

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const underwaterContext = context.getTemporary(
      ContextKeys.COMBAT_UNDERWATER_CONTEXT
    ) as UnderwaterCombatContext;

    if (!underwaterContext) {
      return this.createFailureResult('No underwater movement context found');
    }

    const { combatant, waterDepth, hasWaterBreathing } = underwaterContext;

    const movementEffects = this.calculateUnderwaterMovement(
      combatant,
      waterDepth,
      hasWaterBreathing
    );

    context.setTemporary(ContextKeys.COMBAT_UNDERWATER_MOVEMENT_EFFECTS, movementEffects);

    return this.createSuccessResult(
      `Underwater movement: ${movementEffects.speedMultiplier}x speed, ` +
        `${movementEffects.restrictions.length > 0 ? movementEffects.restrictions.join(', ') : 'no restrictions'}`
    );
  }

  canApply(context: GameContext, command: Command): boolean {
    if (command.type !== COMMAND_TYPES.MOVE && command.type !== COMMAND_TYPES.UNDERWATER_MOVE)
      return false;

    const underwaterContext = context.getTemporary(
      ContextKeys.COMBAT_UNDERWATER_CONTEXT
    ) as UnderwaterCombatContext;
    return underwaterContext !== null && underwaterContext.waterDepth > 0;
  }

  private calculateUnderwaterMovement(
    combatant: CharacterData | MonsterData,
    waterDepth: number,
    hasWaterBreathing: boolean
  ): {
    speedMultiplier: number;
    restrictions: string[];
  } {
    let speedMultiplier = 0.5;
    const restrictions: string[] = [];

    if ('proficiencies' in combatant && Array.isArray((combatant as CharacterData).proficiencies)) {
      const hasSwimming = (combatant as CharacterData).proficiencies.some(
        (prof: { weapon: string; penalty: number }) =>
          typeof prof.weapon === 'string' && prof.weapon.toLowerCase().includes('swimming')
      );

      if (hasSwimming) {
        speedMultiplier = 0.75;
      }
    }

    if (hasWaterBreathing) {
      speedMultiplier = Math.max(speedMultiplier, 0.75);
    }

    if (waterDepth > 30) {
      speedMultiplier *= 0.8;
      restrictions.push('Deep water movement penalty');
    }

    if (
      'encumbrance' in combatant &&
      typeof (combatant as CharacterData).encumbrance === 'number' &&
      (combatant as CharacterData).encumbrance > 0.5
    ) {
      speedMultiplier *= 0.5;
      restrictions.push('Heavy encumbrance severely impairs underwater movement');
    }

    return {
      speedMultiplier: Math.max(0.1, speedMultiplier),
      restrictions,
    };
  }
}
