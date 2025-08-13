import { ContextKeys } from '@osric/core/ContextKeys';
import type { Character } from '@osric/types/character';
import type { Item } from '@osric/types/item';
import type { GameContext } from '../../core/GameContext';
import { BaseRule, type RuleResult } from '../../core/Rule';

export class MagicItemChargeUsageRules extends BaseRule {
  name = 'magic-item-charge-usage';
  description = 'Handle using charges from magic items';

  canApply(context: GameContext): boolean {
    const item = context.getTemporary(ContextKeys.SPELL_MAGIC_ITEM_TO_USE);
    return item !== null;
  }

  async execute(context: GameContext): Promise<RuleResult> {
    const item = context.getTemporary<Item>(ContextKeys.SPELL_MAGIC_ITEM_TO_USE);
    const user = context.getTemporary<Character>('itemUser');

    if (!item || !user) {
      return this.createFailureResult('Missing item or user information');
    }

    if (item.charges === null || item.charges === undefined) {
      return this.createSuccessResult(`${item.name} doesn't use charges`, {
        itemName: item.name,
        chargesRemaining: null,
        disintegrated: false,
      });
    }

    if (item.charges <= 0) {
      const message = `${item.name} has no charges left and disintegrates into dust!`;

      if (user.inventory) {
        const itemIndex = user.inventory.findIndex((invItem) => invItem.id === item.id);
        if (itemIndex >= 0) {
          user.inventory.splice(itemIndex, 1);
          context.setEntity(user.id, user);
        }
      }

      return this.createFailureResult(message, {
        itemName: item.name,
        chargesRemaining: 0,
        disintegrated: true,
      });
    }

    const newCharges = item.charges - 1;
    const disintegrated = newCharges === 0;

    const updatedItem = {
      ...item,
      charges: newCharges,
    };

    context.setTemporary(ContextKeys.SPELL_UPDATED_MAGIC_ITEM, updatedItem);

    let message: string;
    if (disintegrated) {
      message = `${item.name} is used one final time and disintegrates into dust!`;

      if (user.inventory) {
        const itemIndex = user.inventory.findIndex((invItem) => invItem.id === item.id);
        if (itemIndex >= 0) {
          user.inventory.splice(itemIndex, 1);
          context.setEntity(user.id, user);
        }
      }
    } else {
      message = `${item.name} is used. ${newCharges} charge${newCharges !== 1 ? 's' : ''} remaining.`;
    }

    return this.createSuccessResult(message, {
      itemName: item.name,
      chargesRemaining: newCharges,
      disintegrated,
    });
  }
}
