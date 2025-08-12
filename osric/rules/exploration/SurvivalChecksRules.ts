import type { Command } from '@osric/core/Command';
import { DiceEngine } from '@osric/core/Dice';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import type { Character } from '@osric/types/character';
import type { ForagingParams, TerrainNavigationParams } from '@osric/types/commands';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';

export class SurvivalChecksRule extends BaseRule {
  public readonly name = RULE_NAMES.SURVIVAL_CHECKS;
  public readonly priority = 50;

  canApply(_context: GameContext, command: Command): boolean {
    return (
      command.type === COMMAND_TYPES.FORAGING || command.type === COMMAND_TYPES.TERRAIN_NAVIGATION
    );
  }

  async apply(
    context: GameContext,
    command: Command<ForagingParams | TerrainNavigationParams>
  ): Promise<RuleResult> {
    const actorId = String(command.actorId);
    const character = context.getEntity<Character>(actorId);
    if (!character) return this.createFailureResult('Character not found', undefined, true);

    // Derive exposure time in hours from command parameters
    let exposureHours = 1;
    if (command.type === COMMAND_TYPES.FORAGING) {
      const params = command.parameters as ForagingParams;
      exposureHours = Math.max(1, Math.round(params.timeSpent));
    } else if (command.type === COMMAND_TYPES.TERRAIN_NAVIGATION) {
      const params = command.parameters as TerrainNavigationParams;
      // Approximate: 3 miles per hour baseline pace
      exposureHours = Math.max(1, Math.ceil(params.distance / 3));
    }

    const conMod = Math.floor((character.abilities.constitution - 10) / 2);
    let baseChance = 5 + exposureHours * 5 - conMod * 5; // chance of mishap
    baseChance = Math.min(95, Math.max(5, baseChance));

    const roll = DiceEngine.roll('1d100').total;
    const mishap = roll <= baseChance;

    const damage = mishap ? DiceEngine.roll('1d3').total : 0;
    if (damage > 0) {
      const updated = {
        ...character,
        hitPoints: {
          ...character.hitPoints,
          current: Math.max(0, character.hitPoints.current - damage),
        },
      };
      context.setEntity(character.id, updated);
    }

    return this.createSuccessResult('Survival check resolved', {
      characterId: actorId,
      exposureHours,
      mishap,
      roll,
      chance: baseChance,
      damage,
    });
  }
}
