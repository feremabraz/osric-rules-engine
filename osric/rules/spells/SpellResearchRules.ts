import { rollDice } from '../../core/Dice';
import type { GameContext } from '../../core/GameContext';
import { BaseRule, type RuleResult } from '../../core/Rule';
import type { ResearchDifficultyFactors, SpellResearch } from '../../types/SpellTypes';
import type { Character } from '../../types/entities';

/**
 * Rule for validating spell research requirements
 * Based on OSRIC spell research mechanics
 */
export class SpellResearchRequirementsRule extends BaseRule {
  name = 'spell-research-requirements';
  description = 'Validate requirements for beginning spell research';

  canApply(context: GameContext): boolean {
    const researchRequest = context.getTemporary('researchRequest');
    return researchRequest !== null;
  }

  async execute(context: GameContext): Promise<RuleResult> {
    const researchRequest = context.getTemporary<{
      character: Character;
      spellName: string;
      spellLevel: number;
      spellRarity: number;
    }>('researchRequest');

    if (!researchRequest) {
      return this.createFailureResult('No spell research request found');
    }

    const { character, spellName, spellLevel, spellRarity } = researchRequest;

    // Check spell level is appropriate for character
    const maxSpellLevel = Math.min(9, Math.ceil(character.level / 2));
    if (spellLevel > maxSpellLevel) {
      return this.createFailureResult(
        `${character.name} cannot research level ${spellLevel} spells yet (max level: ${maxSpellLevel})`
      );
    }

    // Calculate requirements
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
    // Base calculations
    const baseDays = factors.spellLevel * factors.rarity * 7; // Days
    const baseCost = factors.spellLevel * factors.spellLevel * 1000; // Gold pieces

    // Required stats
    const minIntelligence = 9 + factors.spellLevel;
    const minLevel = factors.spellLevel * 2;

    // Check if character meets requirements
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

/**
 * Rule for starting a new spell research project
 * Based on OSRIC spell research initiation mechanics
 */
export class SpellResearchStartRule extends BaseRule {
  name = 'spell-research-start';
  description = 'Begin a new spell research project';

  canApply(context: GameContext): boolean {
    const researchStart = context.getTemporary('startResearch');
    return researchStart !== null;
  }

  async execute(context: GameContext): Promise<RuleResult> {
    const researchStart = context.getTemporary<{
      character: Character;
      spellName: string;
      spellLevel: number;
      spellRarity: number;
    }>('startResearch');

    if (!researchStart) {
      return this.createFailureResult('No research start data found');
    }

    const { character, spellName, spellLevel, spellRarity } = researchStart;

    // Calculate initial research factors
    const factors = this.calculateResearchFactors(character, spellLevel, spellRarity, 0);
    const requirements = this.calculateResearchRequirements(factors);

    if (!requirements.canResearch) {
      return this.createFailureResult(requirements.message);
    }

    // Calculate failure chance (base 5% per spell level)
    const baseFailureChance = spellLevel * 5;
    const intelligenceBonus = Math.max(0, character.abilities.intelligence - 12) * 2;
    const levelBonus = Math.max(0, character.level - requirements.minLevel) * 3;
    const finalFailureChance = Math.max(1, baseFailureChance - intelligenceBonus - levelBonus);

    // Create research project
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

    context.setTemporary('activeResearch', research);

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

/**
 * Rule for continuing work on an existing research project
 * Based on OSRIC research progress mechanics
 */
export class SpellResearchProgressRule extends BaseRule {
  name = 'spell-research-progress';
  description = 'Continue work on spell research project';

  canApply(context: GameContext): boolean {
    const researchProgress = context.getTemporary('continueResearch');
    return researchProgress !== null;
  }

  async execute(context: GameContext): Promise<RuleResult> {
    const researchProgress = context.getTemporary<{
      research: SpellResearch;
      character: Character;
      daysWorked: number;
      goldSpent: number;
    }>('continueResearch');

    if (!researchProgress) {
      return this.createFailureResult('No research progress data found');
    }

    const { research, character, daysWorked, goldSpent } = researchProgress;

    // Calculate progress rate based on character's intelligence
    const baseProgressRate = 0.5 + (character.abilities.intelligence - 10) * 0.1;

    // Gold spent improves progress rate (with diminishing returns)
    const goldBonus = Math.min(1.0, (goldSpent / 1000) * 0.2);

    // Calculate progress made during this research period
    const progressRate = baseProgressRate + goldBonus;

    // Randomize progress with a chance of setbacks
    const progressRoll = rollDice(1, 100);
    let progressMade: number;

    if (progressRoll.result <= 10) {
      // Setback (10% chance)
      const setbackRoll = rollDice(1, 10);
      progressMade = -5 + setbackRoll.result;
      context.setTemporary('researchSetback', true);
    } else {
      // Normal progress
      progressMade = (daysWorked * progressRate * 100) / research.estimatedCompletion;
    }

    // Update research stats
    const updatedProgress = Math.min(100, Math.max(0, research.progressPercentage + progressMade));
    const newDaysSpent = research.daysSpent + daysWorked;
    const newGoldSpent = research.goldSpent + goldSpent;

    // Recalculate estimated completion time
    let newEstimatedCompletion = 0;
    if (updatedProgress < 100) {
      const remainingPercentage = 100 - updatedProgress;
      const progressPerDay = progressMade / daysWorked;
      if (progressPerDay > 0) {
        newEstimatedCompletion = Math.ceil(remainingPercentage / progressPerDay);
      } else {
        newEstimatedCompletion = research.estimatedCompletion * 2; // Doubled if setback
      }
    }

    const updatedResearch: SpellResearch = {
      ...research,
      daysSpent: newDaysSpent,
      goldSpent: newGoldSpent,
      progressPercentage: updatedProgress,
      estimatedCompletion: newEstimatedCompletion,
    };

    context.setTemporary('activeResearch', updatedResearch);

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

/**
 * Rule for completing spell research
 * Based on OSRIC research completion and failure mechanics
 */
export class SpellResearchSuccessRule extends BaseRule {
  name = 'spell-research-success';
  description = 'Attempt to complete spell research';

  canApply(context: GameContext): boolean {
    const researchCompletion = context.getTemporary('completeResearch');
    return researchCompletion !== null;
  }

  async execute(context: GameContext): Promise<RuleResult> {
    const researchCompletion = context.getTemporary<{
      research: SpellResearch;
      character: Character;
    }>('completeResearch');

    if (!researchCompletion) {
      return this.createFailureResult('No research completion data found');
    }

    const { research, character } = researchCompletion;

    // Research must be at 100% to attempt completion
    if (research.progressPercentage < 100) {
      return this.createFailureResult(
        `Research is only ${research.progressPercentage.toFixed(1)}% complete. Cannot attempt completion yet.`
      );
    }

    // Roll for success
    const successRoll = rollDice(1, 100);
    const success = successRoll.result > research.failureChance;

    if (success) {
      // Add spell to character's known spells (would need spell learning implementation)
      const message = `SUCCESS! ${character.name} successfully completes research on "${research.spellName}"!`;

      context.setTemporary('researchCompleted', {
        spellName: research.spellName,
        spellLevel: research.targetLevel,
        totalTime: research.daysSpent,
        totalCost: research.goldSpent,
        success: true,
      });

      return this.createSuccessResult(message, {
        research,
        success: true,
        rollResult: successRoll.result,
        failureChance: research.failureChance,
      });
    }

    // Research failed - check for catastrophic failure
    const catastropheRoll = rollDice(1, 100);
    const catastrophe = catastropheRoll.result <= 10;

    if (catastrophe) {
      const message = `CATASTROPHIC FAILURE! ${character.name}'s research on "${research.spellName}" fails spectacularly! Wild magical energies are unleashed!`;

      context.setTemporary('researchCatastrophe', {
        character: character.id,
        spellLevel: research.targetLevel,
        damage: research.targetLevel * 2, // Damage based on spell level
      });

      return this.createFailureResult(message, {
        research,
        success: false,
        catastrophe: true,
        rollResult: successRoll.result,
        catastropheRoll: catastropheRoll.result,
      });
    }

    // Normal failure - can try again with additional resources
    const message = `Research failure. ${character.name}'s research on "${research.spellName}" fails, but the work can be continued with additional time and resources.`;

    // Reset progress to 75% to allow continuation
    const updatedResearch: SpellResearch = {
      ...research,
      progressPercentage: 75,
      failureChance: Math.max(1, research.failureChance - 5), // Slightly better chance next time
    };

    context.setTemporary('activeResearch', updatedResearch);

    return this.createFailureResult(message, {
      research: updatedResearch,
      success: false,
      catastrophe: false,
      rollResult: successRoll.result,
      canContinue: true,
    });
  }
}

/**
 * Rule for learning spells from external sources
 * Based on OSRIC spell learning mechanics (scrolls, other wizards, etc.)
 */
export class SpellLearningRule extends BaseRule {
  name = 'spell-learning';
  description = 'Learn spells from external sources';

  canApply(context: GameContext): boolean {
    const spellLearning = context.getTemporary('learnSpell');
    return spellLearning !== null;
  }

  async execute(context: GameContext): Promise<RuleResult> {
    const spellLearning = context.getTemporary<{
      character: Character;
      spellName: string;
      spellLevel: number;
      source: 'scroll' | 'spellbook' | 'tutor' | 'library';
      difficultyModifier?: number;
    }>('learnSpell');

    if (!spellLearning) {
      return this.createFailureResult('No spell learning data found');
    }

    const { character, spellName, spellLevel, source, difficultyModifier = 0 } = spellLearning;

    // Check if character can learn spells of this level
    const maxSpellLevel = Math.min(9, Math.ceil(character.level / 2));
    if (spellLevel > maxSpellLevel) {
      return this.createFailureResult(
        `${character.name} cannot learn level ${spellLevel} spells yet (max level: ${maxSpellLevel})`
      );
    }

    // Check if character already knows this spell
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

    // Calculate learning chance
    const baseChance = 50; // Base 50% chance
    const intelligenceBonus = (character.abilities.intelligence - 10) * 5;
    const levelBonus = character.level * 2;
    const spellLevelPenalty = spellLevel * 5;

    // Source modifiers
    let sourceModifier = 0;
    switch (source) {
      case 'scroll':
        sourceModifier = -10; // Harder to learn from scrolls
        break;
      case 'spellbook':
        sourceModifier = 0; // Standard difficulty
        break;
      case 'tutor':
        sourceModifier = 15; // Easier with a teacher
        break;
      case 'library':
        sourceModifier = 5; // Slight bonus from comprehensive study
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

    // Make the learning attempt
    const learningRoll = rollDice(1, 100);
    const success = learningRoll.result <= totalChance;

    if (success) {
      // Add spell to character's known spells
      const newSpell = {
        id: `${character.id}-${spellName}-${Date.now()}`,
        name: spellName,
        level: spellLevel,
        school: 'Unknown', // Would be determined by spell data
        components: ['V', 'S'], // Default components
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
        `(rolled ${learningRoll.result} vs ${totalChance}%)`;

      return this.createSuccessResult(message, {
        spellName,
        spellLevel,
        source,
        rollResult: learningRoll.result,
        successChance: totalChance,
        newSpell,
      });
    }

    // Learning failed
    const message =
      `${character.name} fails to learn "${spellName}" from ${source} ` +
      `(rolled ${learningRoll.result} vs ${totalChance}%)`;

    // Constitution loss on failure (studying complex magic is taxing)
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
            duration: constitutionLoss * 8, // 8 hours per point lost
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
      rollResult: learningRoll.result,
      successChance: totalChance,
      constitutionLoss,
    });
  }
}
