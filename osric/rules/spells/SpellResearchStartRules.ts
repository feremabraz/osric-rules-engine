import type { Character } from '@osric/types/character';
import { ContextKeys } from '../../core/ContextKeys';
import type { GameContext } from '../../core/GameContext';
import { BaseRule, type RuleResult } from '../../core/Rule';
import type { ResearchDifficultyFactors, SpellResearch } from '../../types/spell-types';

export class SpellResearchStartRules extends BaseRule {
  name = 'spell-research-start';
  description = 'Begin a new spell research project';

  canApply(context: GameContext): boolean {
    const researchStart = context.getTemporary(ContextKeys.SPELL_RESEARCH_START);
    return researchStart !== null;
  }

  async execute(context: GameContext): Promise<RuleResult> {
    const researchStart = context.getTemporary<{
      character: Character;
      spellName: string;
      spellLevel: number;
      spellRarity: number;
    }>(ContextKeys.SPELL_RESEARCH_START);

    if (!researchStart) {
      return this.createFailureResult('No research start data found');
    }

    const { character, spellName, spellLevel, spellRarity } = researchStart;

    const factors = this.calculateResearchFactors(character, spellLevel, spellRarity, 0);
    const requirements = this.calculateResearchRequirements(factors);

    if (!requirements.canResearch) {
      return this.createFailureResult(requirements.message);
    }

    const baseFailureChance = spellLevel * 5;
    const intelligenceBonus = Math.max(0, character.abilities.intelligence - 12) * 2;
    const levelBonus = Math.max(0, character.level - requirements.minLevel) * 3;
    const finalFailureChance = Math.max(1, baseFailureChance - intelligenceBonus - levelBonus);

    const research: SpellResearch = {
      researcherId: character.id,
      spellName,
      targetLevel: spellLevel,
      daysSpent: 0,
      goldSpent: 0,
      progressPercentage: 0,
      estimatedCompletion: requirements.baseDays,
      notes: `Research began on a level ${spellLevel} spell with complexity rating ${spellRarity}.`,
      failureChance: finalFailureChance,
    };

    context.setTemporary(ContextKeys.SPELL_RESEARCH_ACTIVE, research);

    const message =
      `${character.name} begins researching "${spellName}". ` +
      `Estimated completion: ${requirements.baseDays} days, ` +
      `failure chance: ${finalFailureChance}%`;

    return this.createSuccessResult(message, {
      research,
      requirements,
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
