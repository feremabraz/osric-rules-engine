import type { Command } from '@osric/core/Command';
import { ContextKeys } from '@osric/core/ContextKeys';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import type { Character as CharacterData } from '@osric/types/character';
import { RULE_NAMES } from '@osric/types/constants';
import { COMMAND_TYPES } from '@osric/types/constants';
import type { Monster as MonsterData } from '@osric/types/monster';

export type ArmorCategory = 'Light' | 'Medium' | 'Heavy' | 'Shield Only' | 'Unarmored';

export class ArmorCategoryRules extends BaseRule {
  name = RULE_NAMES.ARMOR_CATEGORY;

  async apply(context: GameContext, _command: Command): Promise<RuleResult> {
    const weaponArmorContext = context.getTemporary(ContextKeys.COMBAT_WEAPON_ARMOR_CONTEXT) as {
      defender: CharacterData | MonsterData;
    } | null;

    if (!weaponArmorContext) {
      return this.createFailureResult('No weapon vs armor context found');
    }

    const { defender } = weaponArmorContext;
    const category = this.getArmorCategory(defender.armorClass);
    context.setTemporary(ContextKeys.COMBAT_ARMOR_CATEGORY, category);

    return this.createSuccessResult(`Defender armor category: ${category}`);
  }

  canApply(_context: GameContext, command: Command): boolean {
    if (command.type !== COMMAND_TYPES.ATTACK && command.type !== COMMAND_TYPES.CHECK_ARMOR)
      return false;
    // category can be determined without both values; treat missing as Unarmored or Shield Only
    return true;
  }

  private getArmorCategory(armorClass: number): ArmorCategory {
    // Simple AC-to-category mapping for quick checks
    if (armorClass >= 10) return 'Unarmored';
    if (armorClass >= 8) return 'Light';
    if (armorClass >= 6) return 'Medium';
    return 'Heavy';
  }
}
