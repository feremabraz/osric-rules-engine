import type { Character } from '@osric/types/character';
import { RULE_NAMES } from '@osric/types/constants';
import { ContextKeys } from '../../core/ContextKeys';
import type { GameContext } from '../../core/GameContext';
import { BaseRule, type RuleResult } from '../../core/Rule';
import type { ResearchDifficultyFactors } from '../../types/spell-types';

export class SpellResearchRequirementsRules extends BaseRule {
  name = RULE_NAMES.SPELL_RESEARCH_REQUIREMENTS;
  description = 'Validate requirements for beginning spell research';

  canApply(context: GameContext): boolean {
    const researchRequest = context.getTemporary(ContextKeys.SPELL_RESEARCH_REQUEST);
    return researchRequest !== null;
  }

  async execute(context: GameContext): Promise<RuleResult> {
    const researchRequest = context.getTemporary<{
      character: Character;
      spellName: string;
      spellLevel: number;
      spellRarity: number;
    }>(ContextKeys.SPELL_RESEARCH_REQUEST);

    if (!researchRequest) {
      return this.createFailureResult('No spell research request found');
    }

    const { character, spellName, spellLevel, spellRarity } = researchRequest;

    const maxSpellLevel = Math.min(9, Math.ceil(character.level / 2));
    if (spellLevel > maxSpellLevel) {
      return this.createFailureResult(
        `${character.name} cannot research level ${spellLevel} spells yet (max level: ${maxSpellLevel})`
      );
    }

    const factors = this.calculateResearchFactors(character, spellLevel, spellRarity, 0);
    const requirements = this.calculateResearchRequirements(factors);

    if (!requirements.canResearch) {
      return this.createFailureResult(requirements.message);
    }

    const message =
      `${character.name} can research "${spellName}" (level ${spellLevel}). ` +
      `Requirements: ${requirements.baseDays} days, ${requirements.baseCost} gp, ` +
      `Intelligence ${requirements.minIntelligence}+, Level ${requirements.minLevel}+`;

    return this.createSuccessResult(message, {
      spellName,
      spellLevel,
      spellRarity,
      requirements,
      factors,
    });
  }

  private calculateResearchFactors(
    character: Character,
    spellLevel: number,
    rarity: number,
    goldInvested: number
  ): ResearchDifficultyFactors {
    return {
      spellLevel,
      casterLevel: character.level,
      intelligence: character.abilities.intelligence,
      resources: goldInvested,
      rarity,
    };
  }

  private calculateResearchRequirements(factors: ResearchDifficultyFactors): {
    baseDays: number;
    baseCost: number;
    minIntelligence: number;
    minLevel: number;
    canResearch: boolean;
    message: string;
  } {
    const baseDays = factors.spellLevel * factors.rarity * 7;
    const baseCost = factors.spellLevel * factors.spellLevel * 1000;

    const minIntelligence = 9 + factors.spellLevel;
    const minLevel = factors.spellLevel * 2;

    const canResearch = factors.intelligence >= minIntelligence && factors.casterLevel >= minLevel;

    const message = canResearch
      ? `Research requires approximately ${baseDays} days and ${baseCost} gold pieces.`
      : `You don't meet the requirements for researching a level ${factors.spellLevel} spell.`;

    return {
      baseDays,
      baseCost,
      minIntelligence,
      minLevel,
      canResearch,
      message,
    };
  }
}
