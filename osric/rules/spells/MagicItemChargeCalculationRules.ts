import { ContextKeys } from '@osric/core/ContextKeys';
import type { Item } from '@osric/types/item';
import { DiceEngine } from '../../core/Dice';
import type { GameContext } from '../../core/GameContext';
import { BaseRule, type RuleResult } from '../../core/Rule';

export class MagicItemChargeCalculationRules extends BaseRule {
  name = 'magic-item-charge-calculation';
  description = 'Calculate initial charges for newly found magic items';

  canApply(context: GameContext): boolean {
    const item = context.getTemporary(ContextKeys.SPELL_NEW_MAGIC_ITEM);
    return item !== null;
  }

  async execute(context: GameContext): Promise<RuleResult> {
    const item = context.getTemporary<Item & { itemType: string }>(
      ContextKeys.SPELL_NEW_MAGIC_ITEM
    );

    if (!item) {
      return this.createFailureResult('No magic item found for charge calculation');
    }

    let charges = 0;
    let chargeFormula = '';

    switch (item.itemType.toLowerCase()) {
      case 'wand': {
        const wandRoll = DiceEngine.roll('1d20');
        charges = 101 - wandRoll.total;
        chargeFormula = '101 - 1d20';
        break;
      }

      case 'rod': {
        const rodRoll = DiceEngine.roll('1d10');
        charges = 51 - rodRoll.total;
        chargeFormula = '51 - 1d10';
        break;
      }

      case 'staff': {
        const staffRoll = DiceEngine.roll('1d6');
        charges = 26 - staffRoll.total;
        chargeFormula = '26 - 1d6';
        break;
      }

      default:
        return this.createSuccessResult(`${item.name} does not use charges`, {
          itemName: item.name,
          itemType: item.itemType,
          charges: null,
          chargeFormula: 'N/A',
        });
    }

    const updatedItem = {
      ...item,
      charges,
    };

    context.setTemporary(ContextKeys.SPELL_UPDATED_MAGIC_ITEM, updatedItem);

    const message = `${item.name} (${item.itemType}) has ${charges} charges (${chargeFormula})`;

    return this.createSuccessResult(message, {
      itemName: item.name,
      itemType: item.itemType,
      charges,
      chargeFormula,
    });
  }
}
