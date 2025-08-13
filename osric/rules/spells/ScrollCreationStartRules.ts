import { ContextKeys } from '@osric/core/ContextKeys';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult, isFailure } from '@osric/core/Rule';
import type { Character } from '@osric/types/character';
import { RULE_NAMES } from '@osric/types/constants';
import type { ScrollCreation } from './ScrollTypes';

export class ScrollCreationStartRules extends BaseRule {
  public readonly name = RULE_NAMES.SCROLL_CREATION_START;
  public readonly description = 'Starts a scroll creation project with OSRIC requirements';

  public canApply(context: GameContext): boolean {
    const characterId = context.getTemporary<string>(ContextKeys.SPELL_SCROLL_CREATION_CHARACTER);
    const spellName = context.getTemporary<string>('spell:scroll:creation:spell-name');
    const spellLevel = context.getTemporary<number>(ContextKeys.SPELL_SCROLL_CREATION_LEVEL);
    return !!(characterId && spellName && spellLevel);
  }

  public async execute(context: GameContext): Promise<RuleResult> {
    const characterId = context.getTemporary<string>(ContextKeys.SPELL_SCROLL_CREATION_CHARACTER);
    const spellName = context.getTemporary<string>('spell:scroll:creation:spell-name');
    const spellLevel = context.getTemporary<number>(ContextKeys.SPELL_SCROLL_CREATION_LEVEL);

    if (!characterId || !spellName || !spellLevel) {
      return this.createFailureResult('Missing parameters for scroll creation start');
    }

    const character = context.getEntity<Character>(characterId);
    if (!character) {
      return this.createFailureResult('Character not found');
    }

    context.setTemporary(ContextKeys.SPELL_SCROLL_CREATION_CHARACTER, characterId);
    context.setTemporary(ContextKeys.SPELL_SCROLL_CREATION_LEVEL, spellLevel);

    const requirements = this.calculateRequirements(character, spellLevel);
    if (isFailure(requirements)) {
      return this.createFailureResult(requirements.message);
    }

    const scrollCreation: ScrollCreation = {
      creatorId: characterId,
      spellName,
      spellLevel,
      daysRequired: requirements.daysRequired,
      materialCost: requirements.goldCost,
      progressPercentage: 0,
    };

    context.setTemporary(ContextKeys.SPELL_SCROLL_CREATION_PROJECT, scrollCreation);

    const message = `Started creating scroll of ${spellName} (level ${spellLevel}). Progress: 0%`;

    return this.createSuccessResult(message, {
      creatorId: scrollCreation.creatorId,
      spellName: scrollCreation.spellName,
      spellLevel: scrollCreation.spellLevel,
      daysRequired: scrollCreation.daysRequired,
      materialCost: scrollCreation.materialCost,
      progressPercentage: scrollCreation.progressPercentage,
    });
  }

  private calculateRequirements(
    character: Character,
    spellLevel: number
  ): {
    kind: 'success' | 'failure';
    daysRequired: number;
    goldCost: number;
    message: string;
  } {
    const isSpellcaster = ['Magic-User', 'Illusionist', 'Cleric', 'Druid'].includes(
      character.class
    );
    if (!isSpellcaster) {
      return {
        kind: 'failure',
        daysRequired: 0,
        goldCost: 0,
        message: 'Only spellcasters can create scrolls',
      };
    }

    const minimumCasterLevel = Math.max(1, spellLevel * 2 - 1);
    if (character.level < minimumCasterLevel) {
      return {
        kind: 'failure',
        daysRequired: 0,
        goldCost: 0,
        message: `You must be at least level ${minimumCasterLevel} to create a level ${spellLevel} scroll`,
      };
    }

    const baseDays = spellLevel * 2;
    const intelligenceModifier = character.abilityModifiers?.intelligenceLearnSpells || 0;
    const daysRequired = Math.max(1, baseDays - Math.floor(intelligenceModifier / 5));
    const goldCost = 100 * spellLevel ** 2;

    return {
      kind: 'success',
      daysRequired,
      goldCost,
      message: `Creating a level ${spellLevel} scroll will require ${daysRequired} days and ${goldCost} gold`,
    };
  }
}
