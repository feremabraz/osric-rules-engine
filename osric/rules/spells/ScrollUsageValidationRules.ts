import { ContextKeys } from '@osric/core/ContextKeys';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import type { Character } from '@osric/types/character';
import { RULE_NAMES } from '@osric/types/constants';
import type { Item } from '@osric/types/item';
import type { MagicScroll } from './ScrollTypes';

export class ScrollUsageValidationRules extends BaseRule {
  public readonly name = RULE_NAMES.SCROLL_USAGE_VALIDATION;
  public readonly description = 'Validates if a character can use a specific scroll';

  public canApply(context: GameContext): boolean {
    const characterId = context.getTemporary<string>(ContextKeys.SPELL_SCROLL_USAGE_CHARACTER);
    const scrollId = context.getTemporary<string>(ContextKeys.SPELL_SCROLL_USAGE_SCROLL_ID);
    return !!(characterId && scrollId);
  }

  public async execute(context: GameContext): Promise<RuleResult> {
    const characterId = context.getTemporary<string>(ContextKeys.SPELL_SCROLL_USAGE_CHARACTER);
    const scrollId = context.getTemporary<string>(ContextKeys.SPELL_SCROLL_USAGE_SCROLL_ID);

    if (!characterId || !scrollId) {
      return this.createFailureResult('Missing character ID or scroll ID for usage validation');
    }

    const character = context.getEntity<Character>(characterId);
    if (!character) {
      return this.createFailureResult('Character not found');
    }

    const scroll = character.inventory.find((item: Item) => item.id === scrollId) as MagicScroll;
    if (!scroll || scroll.itemType !== 'scroll') {
      return this.createFailureResult('Scroll not found in character inventory');
    }

    const canUse = scroll.userClasses.includes(character.class);
    if (!canUse) {
      return this.createFailureResult(
        `${character.class} cannot use this scroll. Allowed classes: ${scroll.userClasses.join(', ')}`
      );
    }

    if (scroll.consumed) {
      return this.createFailureResult(
        'This scroll has already been used and is no longer functional'
      );
    }

    context.setTemporary(ContextKeys.SPELL_SCROLL_USAGE_VALIDATED, true);
    context.setTemporary(ContextKeys.SPELL_SCROLL_USAGE_SCROLL, scroll);

    const message = `${character.name} can use the scroll of ${scroll.spell.name}`;

    return this.createSuccessResult(message, {
      canUse: true,
      scroll,
      character,
    });
  }
}
