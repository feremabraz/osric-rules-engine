import type { Character } from '@rules/types';
import { roll } from '@rules/utils/dice';
import type { ResearchDifficultyFactors, SpellResearch } from './advancedSpellTypes';

/**
 * Begin new spell research project
 */
export const beginSpellResearch = ({
  character,
  spellName,
  spellLevel,
  spellRarity,
}: {
  character: Character;
  spellName: string;
  spellLevel: number;
  spellRarity: number;
}): SpellResearch | null => {
  // Check if spell level is appropriate for character
  const maxSpellLevel = Math.min(9, Math.ceil(character.level / 2));

  if (spellLevel > maxSpellLevel) {
    // Character can't research spells of this level yet
    return null;
  }

  // Calculate research difficulty factors
  const factors = calculateResearchFactors(character, spellLevel, spellRarity, 0);

  // Calculate estimated time to completion
  const estimatedDays = calculateResearchTime(factors);

  // Calculate chance of failure
  const failureChance = calculateSuccessChance(factors);

  // Create new research project
  return {
    researcherId: character.id,
    spellName,
    targetLevel: spellLevel,
    daysSpent: 0,
    goldSpent: 0,
    progressPercentage: 0,
    estimatedCompletion: estimatedDays,
    notes: `Research began on a level ${spellLevel} spell with complexity rating ${spellRarity}.`,
    failureChance: 100 - failureChance, // Convert success chance to failure chance
  };
};

/**
 * Continue working on an existing research project
 */
export const continueResearch = ({
  research,
  character,
  daysSpent,
  goldSpent,
}: {
  research: SpellResearch;
  character: Character;
  daysSpent: number;
  goldSpent: number;
}): SpellResearch => {
  // Calculate progress rate based on character's intelligence
  const baseProgressRate = 0.5 + (character.abilities.intelligence - 10) * 0.1;

  // Gold spent improves progress rate (with diminishing returns)
  const goldBonus = Math.min(1.0, (goldSpent / 1000) * 0.2);

  // Calculate progress made during this research period
  const progressRate = baseProgressRate + goldBonus;

  // Randomize progress with a chance of setbacks
  const progressRoll = Math.random();
  let progressMade: number;

  if (progressRoll < 0.1) {
    // Setback
    progressMade = -5 + Math.random() * 10;
  } else {
    // Normal progress
    progressMade = (daysSpent * progressRate * 100) / research.estimatedCompletion;
  }

  // Update research stats
  const updatedProgress = Math.min(100, Math.max(0, research.progressPercentage + progressMade));
  const newDaysSpent = research.daysSpent + daysSpent;
  const newGoldSpent = research.goldSpent + goldSpent;

  // Recalculate estimated completion time
  let newEstimatedCompletion = 0;
  if (updatedProgress < 100) {
    const remainingPercentage = 100 - updatedProgress;
    const progressPerDay = progressMade / daysSpent;
    newEstimatedCompletion = Math.ceil(remainingPercentage / progressPerDay);
  }

  return {
    ...research,
    daysSpent: newDaysSpent,
    goldSpent: newGoldSpent,
    progressPercentage: updatedProgress,
    estimatedCompletion: newEstimatedCompletion,
  };
};

/**
 * Calculate time required for spell research based on difficulty factors
 */
export const calculateResearchTime = (factors: ResearchDifficultyFactors): number => {
  // Base time is factor of spell level and rarity
  const baseTime = factors.spellLevel * factors.spellLevel * factors.rarity;

  // Intelligence reduces research time
  const intelligenceModifier = Math.max(0.5, 2 - factors.intelligence * 0.05);

  // Higher level casters research faster
  const levelModifier = Math.max(0.5, 1.5 - factors.casterLevel * 0.05);

  // Resources can speed up research
  const resourceModifier = Math.max(0.6, 1 - (factors.resources / 10000) * 0.4);

  // Calculate final time in days
  return Math.ceil(baseTime * intelligenceModifier * levelModifier * resourceModifier);
};

/**
 * Calculate gold cost for spell research
 */
export const calculateResearchCost = (spellLevel: number, rarity: number): number => {
  // Base cost increases exponentially with spell level
  const baseCost = spellLevel * spellLevel * 100;

  // Rarity multiplies cost
  const rarityMultiplier = 0.5 + rarity * 0.5;

  return Math.ceil(baseCost * rarityMultiplier);
};

/**
 * Calculate chance of successful spell research
 */
export const calculateSuccessChance = (factors: ResearchDifficultyFactors): number => {
  // Base chance of success
  const baseChance = 30;

  // Intelligence improves success chance
  const intelligenceBonus = (factors.intelligence - 10) * 3;

  // Level improves success chance
  const levelBonus = factors.casterLevel * 2;

  // Higher level spells are harder to research
  const levelPenalty = factors.spellLevel * factors.spellLevel * 2;

  // Rarity makes spells harder to research
  const rarityPenalty = factors.rarity * 3;

  // Resources improve success chance
  const resourceBonus = Math.min(30, (factors.resources / 1000) * 3);

  // Calculate final success chance (clamped between 5% and 95%)
  return Math.min(
    95,
    Math.max(
      5,
      baseChance + intelligenceBonus + levelBonus + resourceBonus - levelPenalty - rarityPenalty
    )
  );
};

/**
 * Calculate research difficulty factors based on character and desired spell
 */
export const calculateResearchFactors = (
  character: Character,
  spellLevel: number,
  rarity: number, // 1-10 scale where 10 is extremely rare/unique
  goldInvested: number
): ResearchDifficultyFactors => {
  return {
    spellLevel,
    casterLevel: character.level,
    intelligence: character.abilities.intelligence,
    resources: goldInvested,
    rarity,
  };
};

/**
 * Calculate the base time and cost for spell research
 */
export const calculateResearchRequirements = (
  factors: ResearchDifficultyFactors
): {
  baseDays: number;
  baseCost: number;
  minIntelligence: number;
  minLevel: number;
  canResearch: boolean;
  message: string;
} => {
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
};

/**
 * Begin spell research process
 */
export const startSpellResearch = (
  character: Character,
  spellName: string,
  spellLevel: number,
  rarity: number
): SpellResearch => {
  // Calculate initial resources required
  const factors = calculateResearchFactors(character, spellLevel, rarity, 0);
  const requirements = calculateResearchRequirements(factors);

  if (!requirements.canResearch) {
    throw new Error(requirements.message);
  }

  // Calculate failure chance (base 5% per spell level)
  const baseFailureChance = spellLevel * 5;

  // Intelligence reduces failure chance
  const intelligenceBonus = Math.max(0, character.abilities.intelligence - 12) * 2;

  // Level reduces failure chance
  const levelBonus = Math.max(0, character.level - requirements.minLevel) * 3;

  // Final failure chance (minimum 1%)
  const failureChance = Math.max(1, baseFailureChance - intelligenceBonus - levelBonus);

  return {
    researcherId: character.id,
    spellName,
    targetLevel: spellLevel,
    daysSpent: 0,
    goldSpent: 0,
    progressPercentage: 0,
    estimatedCompletion: requirements.baseDays,
    notes: '',
    failureChance,
  };
};

/**
 * Update spell research progress
 */
export const updateResearchProgress = (
  research: SpellResearch,
  daysWorked: number,
  goldSpent: number
): SpellResearch => {
  const newDaysSpent = research.daysSpent + daysWorked;
  const newGoldSpent = research.goldSpent + goldSpent;

  // Progress is a factor of time spent and resources invested
  const baseProgress = (daysWorked / research.estimatedCompletion) * 100;

  // Extra gold investment can speed up progress (diminishing returns)
  const goldBoost = Math.min(10, (goldSpent / 1000) * 5);

  const newProgressPercentage = Math.min(
    100,
    research.progressPercentage + baseProgress + goldBoost
  );

  return {
    ...research,
    daysSpent: newDaysSpent,
    goldSpent: newGoldSpent,
    progressPercentage: newProgressPercentage,
  };
};

/**
 * Attempt to complete spell research
 */
export const completeSpellResearch = (
  research: SpellResearch
): {
  success: boolean;
  message: string;
  catastrophe: boolean;
} => {
  // Research must be at 100% to attempt completion
  if (research.progressPercentage < 100) {
    return {
      success: false,
      message: 'Research is not yet complete.',
      catastrophe: false,
    };
  }

  // Roll for success
  const successRoll = roll(100);
  const success = successRoll > research.failureChance;

  if (success) {
    return {
      success: true,
      message: `The spell research is successful! You have created ${research.spellName}.`,
      catastrophe: false,
    };
  }

  // On failure, there's a chance of catastrophic backfire
  const catastropheRoll = roll(100);
  const catastrophe = catastropheRoll <= 10;

  if (catastrophe) {
    return {
      success: false,
      message: 'The spell research fails catastrophically! Wild magical energies are unleashed!',
      catastrophe: true,
    };
  }

  return {
    success: false,
    message: 'The spell research fails, but you can try again with additional resources.',
    catastrophe: false,
  };
};
