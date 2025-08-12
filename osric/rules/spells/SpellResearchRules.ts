import type { Character } from '@osric/types/character';
import { ContextKeys } from '../../core/ContextKeys';
import { DiceEngine } from '../../core/Dice';
import type { GameContext } from '../../core/GameContext';
import { BaseRule, type RuleResult } from '../../core/Rule';
import type { ResearchDifficultyFactors, SpellResearch } from '../../types/spell-types';

export class SpellResearchRequirementsRules extends BaseRule {
  name = 'spell-research-requirements';
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

export class SpellResearchProgressRules extends BaseRule {
  name = 'spell-research-progress';
  description = 'Continue work on spell research project';

  canApply(context: GameContext): boolean {
    const researchProgress = context.getTemporary(ContextKeys.SPELL_RESEARCH_PROGRESS);
    return researchProgress !== null;
  }

  async execute(context: GameContext): Promise<RuleResult> {
    const researchProgress = context.getTemporary<{
      research: SpellResearch;
      character: Character;
      daysWorked: number;
      goldSpent: number;
    }>(ContextKeys.SPELL_RESEARCH_PROGRESS);

    if (!researchProgress) {
      return this.createFailureResult('No research progress data found');
    }

    const { research, character, daysWorked, goldSpent } = researchProgress;

    const baseProgressRate = 0.5 + (character.abilities.intelligence - 10) * 0.1;

    const goldBonus = Math.min(1.0, (goldSpent / 1000) * 0.2);

    const progressRate = baseProgressRate + goldBonus;

    const progressRoll = DiceEngine.roll('1d100');
    let progressMade: number;

    if (progressRoll.total <= 10) {
      const setbackRoll = DiceEngine.roll('1d10');
      progressMade = -5 + setbackRoll.total;
      context.setTemporary(ContextKeys.SPELL_RESEARCH_SETBACK, true);
    } else {
      progressMade = (daysWorked * progressRate * 100) / research.estimatedCompletion;
    }

    const updatedProgress = Math.min(100, Math.max(0, research.progressPercentage + progressMade));
    const newDaysSpent = research.daysSpent + daysWorked;
    const newGoldSpent = research.goldSpent + goldSpent;

    let newEstimatedCompletion = 0;
    if (updatedProgress < 100) {
      const remainingPercentage = 100 - updatedProgress;
      const progressPerDay = progressMade / daysWorked;
      if (progressPerDay > 0) {
        newEstimatedCompletion = Math.ceil(remainingPercentage / progressPerDay);
      } else {
        newEstimatedCompletion = research.estimatedCompletion * 2;
      }
    }

    const updatedResearch: SpellResearch = {
      ...research,
      daysSpent: newDaysSpent,
      goldSpent: newGoldSpent,
      progressPercentage: updatedProgress,
      estimatedCompletion: newEstimatedCompletion,
    };

    context.setTemporary(ContextKeys.SPELL_RESEARCH_ACTIVE, updatedResearch);

    let message: string;
    if (progressMade < 0) {
      message =
        `Research setback! ${character.name} lost ${Math.abs(progressMade).toFixed(1)}% progress ` +
        `due to experimental failures. Progress: ${updatedProgress.toFixed(1)}%`;
    } else {
      message =
        `${character.name} makes progress on "${research.spellName}". ` +
        `Progress: ${updatedProgress.toFixed(1)}% (${progressMade.toFixed(1)}% gained)`;
    }

    return this.createSuccessResult(message, {
      research: updatedResearch,
      progressMade,
      daysWorked,
      goldSpent,
    });
  }
}

export class SpellResearchSuccessRules extends BaseRule {
  name = 'spell-research-success';
  description = 'Attempt to complete spell research';

  canApply(context: GameContext): boolean {
    const researchCompletion = context.getTemporary(ContextKeys.SPELL_RESEARCH_COMPLETE);
    return researchCompletion !== null;
  }

  async execute(context: GameContext): Promise<RuleResult> {
    const researchCompletion = context.getTemporary<{
      research: SpellResearch;
      character: Character;
    }>(ContextKeys.SPELL_RESEARCH_COMPLETE);

    if (!researchCompletion) {
      return this.createFailureResult('No research completion data found');
    }

    const { research, character } = researchCompletion;

    if (research.progressPercentage < 100) {
      return this.createFailureResult(
        `Research is only ${research.progressPercentage.toFixed(1)}% complete. Cannot attempt completion yet.`
      );
    }

    const successRoll = DiceEngine.roll('1d100');
    const success = successRoll.total > research.failureChance;

    if (success) {
      const message = `SUCCESS! ${character.name} successfully completes research on "${research.spellName}"!`;

      context.setTemporary(ContextKeys.SPELL_RESEARCH_COMPLETED_EVENT, {
        spellName: research.spellName,
        spellLevel: research.targetLevel,
        totalTime: research.daysSpent,
        totalCost: research.goldSpent,
        kind: 'success' as const,
      });

      return this.createSuccessResult(message, {
        research,
        kind: 'success' as const,
        rollResult: successRoll.total,
        failureChance: research.failureChance,
      });
    }

    const catastropheRoll = DiceEngine.roll('1d100');
    const catastrophe = catastropheRoll.total <= 10;

    if (catastrophe) {
      const message = `CATASTROPHIC FAILURE! ${character.name}'s research on "${research.spellName}" fails spectacularly! Wild magical energies are unleashed!`;

      context.setTemporary(ContextKeys.SPELL_RESEARCH_CATASTROPHE, {
        character: character.id,
        spellLevel: research.targetLevel,
        damage: research.targetLevel * 2,
      });

      return this.createFailureResult(message, {
        research,
        kind: 'failure' as const,
        catastrophe: true,
        rollResult: successRoll.total,
        catastropheRoll: catastropheRoll.total,
      });
    }

    const message = `Research failure. ${character.name}'s research on "${research.spellName}" fails, but the work can be continued with additional time and resources.`;

    const updatedResearch: SpellResearch = {
      ...research,
      progressPercentage: 75,
      failureChance: Math.max(1, research.failureChance - 5),
    };

    context.setTemporary(ContextKeys.SPELL_RESEARCH_ACTIVE, updatedResearch);

    return this.createFailureResult(message, {
      research: updatedResearch,
      kind: 'failure' as const,
      catastrophe: false,
      rollResult: successRoll.total,
      canContinue: true,
    });
  }
}

export class SpellLearningRules extends BaseRule {
  name = 'spell-learning';
  description = 'Learn spells from external sources';

  canApply(context: GameContext): boolean {
    const spellLearning = context.getTemporary(ContextKeys.SPELL_RESEARCH_LEARN);
    return spellLearning !== null;
  }

  async execute(context: GameContext): Promise<RuleResult> {
    const spellLearning = context.getTemporary<{
      character: Character;
      spellName: string;
      spellLevel: number;
      source: 'scroll' | 'spellbook' | 'tutor' | 'library';
      difficultyModifier?: number;
    }>(ContextKeys.SPELL_RESEARCH_LEARN);

    if (!spellLearning) {
      return this.createFailureResult('No spell learning data found');
    }

    const { character, spellName, spellLevel, source, difficultyModifier = 0 } = spellLearning;

    const maxSpellLevel = Math.min(9, Math.ceil(character.level / 2));
    if (spellLevel > maxSpellLevel) {
      return this.createFailureResult(
        `${character.name} cannot learn level ${spellLevel} spells yet (max level: ${maxSpellLevel})`
      );
    }

    const extendedCharacter = character as Character & {
      spellsKnown?: Array<{ name: string; level: number }>;
    };
    const knownSpells = extendedCharacter.spellsKnown || [];
    const alreadyKnown = knownSpells.some(
      (spell: { name: string; level: number }) =>
        spell.name.toLowerCase() === spellName.toLowerCase() && spell.level === spellLevel
    );

    if (alreadyKnown) {
      return this.createFailureResult(`${character.name} already knows "${spellName}"`);
    }

    const baseChance = 50;
    const intelligenceBonus = (character.abilities.intelligence - 10) * 5;
    const levelBonus = character.level * 2;
    const spellLevelPenalty = spellLevel * 5;

    let sourceModifier = 0;
    switch (source) {
      case 'scroll':
        sourceModifier = -10;
        break;
      case 'spellbook':
        sourceModifier = 0;
        break;
      case 'tutor':
        sourceModifier = 15;
        break;
      case 'library':
        sourceModifier = 5;
        break;
    }

    const totalChance = Math.min(
      95,
      Math.max(
        5,
        baseChance +
          intelligenceBonus +
          levelBonus -
          spellLevelPenalty +
          sourceModifier +
          difficultyModifier
      )
    );

    const learningRoll = DiceEngine.roll('1d100');
    const success = learningRoll.total <= totalChance;

    if (success) {
      const newSpell = {
        id: `${character.id}-${spellName}-${Date.now()}`,
        name: spellName,
        level: spellLevel,
        school: 'Unknown',
        components: ['V', 'S'],
        castingTime: '1 round',
        range: 'Touch',
        duration: 'Instantaneous',
        description: `${spellName} (Level ${spellLevel} spell)`,
      };

      const updatedCharacter = {
        ...character,
        spellsKnown: [...knownSpells, newSpell],
      };

      context.setEntity(character.id, updatedCharacter);

      const message =
        `SUCCESS! ${character.name} learns "${spellName}" from ${source} ` +
        `(rolled ${learningRoll.total} vs ${totalChance}%)`;

      return this.createSuccessResult(message, {
        spellName,
        spellLevel,
        source,
        rollResult: learningRoll.total,
        successChance: totalChance,
        newSpell,
      });
    }

    const message =
      `${character.name} fails to learn "${spellName}" from ${source} ` +
      `(rolled ${learningRoll.total} vs ${totalChance}%)`;

    const constitutionLoss = spellLevel > 3 ? 1 : 0;
    if (constitutionLoss > 0) {
      const updatedCharacter = {
        ...character,
        abilities: {
          ...character.abilities,
          constitution: Math.max(1, character.abilities.constitution - constitutionLoss),
        },
        statusEffects: [
          ...character.statusEffects,
          {
            name: 'Constitution Loss (Spell Study)',
            duration: constitutionLoss * 8,
            description: `Lost ${constitutionLoss} constitution from intensive spell study`,
            effect: 'constitution_drain',
            savingThrow: null,
            endCondition: 'time',
          },
        ],
      };

      context.setEntity(character.id, updatedCharacter);
    }

    return this.createFailureResult(message, {
      spellName,
      spellLevel,
      source,
      rollResult: learningRoll.total,
      successChance: totalChance,
      constitutionLoss,
    });
  }
}
