import { ContextKeys } from '@osric/core/ContextKeys';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import type { Character } from '@osric/types/character';
import { RULE_NAMES } from '@osric/types/constants';

export class ScrollCreationRequirementsRules extends BaseRule {
  public readonly name = RULE_NAMES.SCROLL_CREATION_REQUIREMENTS;
  public readonly description =
    'Calculates requirements for creating magic scrolls using OSRIC formulas';

  public canApply(context: GameContext): boolean {
    const characterId = context.getTemporary<string>(ContextKeys.SPELL_SCROLL_CREATION_CHARACTER);
    const spellLevel = context.getTemporary<number>(ContextKeys.SPELL_SCROLL_CREATION_LEVEL);
    return !!(characterId && spellLevel);
  }

  public async execute(context: GameContext): Promise<RuleResult> {
    const characterId = context.getTemporary<string>(ContextKeys.SPELL_SCROLL_CREATION_CHARACTER);
    const spellLevel = context.getTemporary<number>(ContextKeys.SPELL_SCROLL_CREATION_LEVEL);

    if (!characterId || !spellLevel) {
      return this.createFailureResult('Missing character ID or spell level for scroll creation');
    }

    const character = context.getEntity<Character>(characterId);
    if (!character) {
      return this.createFailureResult('Character not found');
    }

    const isSpellcaster = ['Magic-User', 'Illusionist', 'Cleric', 'Druid'].includes(
      character.class
    );
    if (!isSpellcaster) {
      return this.createFailureResult('Only spellcasters can create scrolls');
    }

    const minimumCasterLevel = Math.max(1, spellLevel * 2 - 1);
    if (character.level < minimumCasterLevel) {
      return this.createFailureResult(
        `You must be at least level ${minimumCasterLevel} to create a level ${spellLevel} scroll`
      );
    }

    const baseDays = spellLevel * 2;
    const intelligenceModifier = character.abilityModifiers?.intelligenceLearnSpells || 0;
    const daysRequired = Math.max(1, baseDays - Math.floor(intelligenceModifier / 5));

    const goldCost = 100 * spellLevel ** 2;

    const message = `Creating a level ${spellLevel} scroll will require ${daysRequired} days and ${goldCost} gold pieces`;

    context.setTemporary(ContextKeys.SPELL_SCROLL_REQUIREMENTS, {
      kind: 'success' as const,
      daysRequired,
      goldCost,
      minimumCasterLevel,
    });

    return this.createSuccessResult(message, {
      kind: 'success',
      daysRequired,
      goldCost,
      minimumCasterLevel,
    });
  }
}
