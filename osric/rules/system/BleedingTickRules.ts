import type { Command } from '@osric/core/Command';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import type { Character } from '@osric/types/character';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';
import type { Monster } from '@osric/types/monster';

/**
 * Applies -1 HP to all entities that have the Bleeding status each round until -10 HP.
 * Stops applying if entity is Dead or Bleeding effect is absent.
 */
export class BleedingTickRules extends BaseRule {
  readonly name = RULE_NAMES.BLEEDING_TICK;
  readonly priority = 5; // very early in round tick

  canApply(_context: GameContext, command: Command): boolean {
    return command.type === COMMAND_TYPES.ROUND_TICK;
  }

  async apply(context: GameContext, _command: Command): Promise<RuleResult> {
    // Iterate all entities, find Bleeding, decrement HP until -10
    const affected: string[] = [];

    const entities = context.getEntitiesOfType<Character | Monster>(
      // Both Character and Monster are GameEntity, so accept all
      (_e): _e is Character | Monster => true
    );

    for (const entity of entities) {
      const status = entity.statusEffects || [];
      const bleeding = status.some((s) => s.name === 'Bleeding');
      const dead = status.some((s) => s.name === 'Dead');
      if (!bleeding || dead) continue;

      // Apply -1 HP (cannot go below -10 by this tick alone)
      const current = entity.hitPoints.current;
      const next = Math.max(current - 1, -10);
      entity.hitPoints.current = next;
      affected.push(String(entity.id));

      if (next <= -10 && !status.some((s) => s.name === 'Dead')) {
        status.push({
          name: 'Dead',
          duration: 0,
          effect: 'Dead',
          savingThrow: null,
          endCondition: null,
        });
      }

      entity.statusEffects = status;
      context.setEntity(String(entity.id), entity);
    }

    return this.createSuccessResult(
      affected.length > 0
        ? `Bleeding tick applied to ${affected.length} entit${affected.length === 1 ? 'y' : 'ies'}`
        : 'No entities affected by bleeding tick',
      { affected }
    );
  }
}

export default BleedingTickRules;
