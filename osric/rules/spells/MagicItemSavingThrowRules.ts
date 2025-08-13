import { ContextKeys } from '@osric/core/ContextKeys';
import { RULE_NAMES } from '@osric/types/constants';
import type { Item } from '@osric/types/item';
import { DiceEngine } from '../../core/Dice';
import type { GameContext } from '../../core/GameContext';
import { BaseRule, type RuleResult } from '../../core/Rule';

export class MagicItemSavingThrowRules extends BaseRule {
  name = RULE_NAMES.MAGIC_ITEM_SAVING_THROW;
  description = 'Handle magic item saving throws against destructive effects';

  private readonly ITEM_SAVING_THROWS = {
    potion: 20,
    ring: 17,
    rod: 14,
    scroll: 19,
    staff: 13,
    wand: 15,
    artifact: 13,
    armor: 11,
    armorPowerful: 8,
    sword: 9,
    swordHoly: 7,
    miscMagic: 12,
  } as const;

  canApply(context: GameContext): boolean {
    const savingThrowData = context.getTemporary(ContextKeys.SPELL_MAGIC_ITEM_SAVING_THROW);
    return savingThrowData !== null;
  }

  async execute(context: GameContext): Promise<RuleResult> {
    const savingThrowData = context.getTemporary<{
      item: Item;
      effectType: 'rod_of_cancellation' | 'dispel_magic' | 'antimagic_field';
    }>(ContextKeys.SPELL_MAGIC_ITEM_SAVING_THROW);

    if (!savingThrowData) {
      return this.createFailureResult('No saving throw data found');
    }

    const { item, effectType } = savingThrowData;

    const itemType = this.determineItemType(item);

    const baseTarget = this.ITEM_SAVING_THROWS[itemType];

    let adjustedTarget = baseTarget;
    switch (effectType) {
      case 'dispel_magic':
        adjustedTarget += 2;
        break;
      case 'antimagic_field':
        adjustedTarget += 4;
        break;
      case 'rod_of_cancellation':
        break;
    }

    const savingThrowRoll = DiceEngine.roll('1d20');
    const saved = savingThrowRoll.total >= adjustedTarget;

    const effectName = this.formatEffectType(effectType);
    const message = saved
      ? `${item.name} resists the ${effectName}! (rolled ${savingThrowRoll.total} vs ${adjustedTarget})`
      : `${item.name} fails to resist the ${effectName} and is affected. (rolled ${savingThrowRoll.total} vs ${adjustedTarget})`;

    return this.createSuccessResult(message, {
      itemName: item.name,
      itemType,
      effectType,
      targetRoll: adjustedTarget,
      actualRoll: savingThrowRoll.total,
      saved,
    });
  }

  private determineItemType(item: Item): keyof typeof this.ITEM_SAVING_THROWS {
    const extendedItem = item as Item & {
      itemType?: string;
      type?: string;
      subType?: string;
      isHoly?: boolean;
      magicBonus?: number;
    };

    if (extendedItem.itemType) {
      switch (extendedItem.itemType.toLowerCase()) {
        case 'potion':
          return 'potion';
        case 'ring':
          return 'ring';
        case 'rod':
          return 'rod';
        case 'scroll':
          return 'scroll';
        case 'staff':
          return 'staff';
        case 'wand':
          return 'wand';
        case 'artifact':
          return 'artifact';
      }
    }

    if (extendedItem.type === 'Armor') {
      return extendedItem.magicBonus === 5 ? 'armorPowerful' : 'armor';
    }

    if (extendedItem.type === 'Weapon' && extendedItem.subType === 'sword') {
      return extendedItem.isHoly ? 'swordHoly' : 'sword';
    }

    return 'miscMagic';
  }

  private formatEffectType(effectType: string): string {
    return effectType
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
