import type { Command } from '@osric/core/Command';
import { DiceEngine } from '@osric/core/Dice';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import type { Character } from '@osric/types/character';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';

export class ForagingRules extends BaseRule {
  readonly name = RULE_NAMES.FORAGING_RULES;
  readonly priority = 10;

  canApply(_context: GameContext, command: Command): boolean {
    return command.type === COMMAND_TYPES.FORAGING;
  }

  async apply(context: GameContext, command: Command): Promise<RuleResult> {
    const params = command.parameters as unknown as {
      characterId: string;
      terrain?: { name: string } | string;
    };
    const character = context.getEntity<Character>(params.characterId);
    if (!character) return this.createFailureResult('Character not found', undefined, true);

    let baseChance = 30;
    const terrainName = typeof params.terrain === 'string' ? params.terrain : params.terrain?.name;
    const t = (terrainName || '').toLowerCase();
    if (t.includes('forest')) baseChance += 20;
    if (t.includes('plains')) baseChance += 10;
    if (t.includes('desert')) baseChance -= 20;

    const wisdomMod = Math.floor((character.abilities.wisdom - 10) / 2);
    baseChance += wisdomMod * 5;

    const roll = DiceEngine.roll('1d100').total;
    const success = roll <= baseChance;

    let foodFound = 0;
    let waterFound = 0;
    if (success) {
      foodFound = DiceEngine.roll('1d4').total;
      waterFound = DiceEngine.roll('1d4').total;
    }

    return this.createSuccessResult('Foraging resolved', {
      characterId: params.characterId,
      success,
      roll,
      chance: baseChance,
      foodFound,
      waterFound,
    });
  }
}
