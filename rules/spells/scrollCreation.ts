import type { Character, Spell } from '@rules/types';
import { roll } from '@rules/utils/dice';
import type { MagicScroll, ScrollCastingCheck, ScrollCreation } from './advancedSpellTypes';

/**
 * Calculates requirements for creating a magic scroll
 */
export const calculateScrollRequirements = (
  character: Character,
  spellLevel: number
): {
  canCreate: boolean;
  daysRequired: number;
  goldCost: number;
  message: string;
} => {
  // Check if character is a spellcaster
  const isSpellcaster = ['Magic-User', 'Illusionist', 'Cleric', 'Druid'].includes(character.class);

  if (!isSpellcaster) {
    return {
      canCreate: false,
      daysRequired: 0,
      goldCost: 0,
      message: 'Only spellcasters can create scrolls.',
    };
  }

  // Check if character is high enough level to cast spell
  const minimumCasterLevel = Math.max(1, spellLevel * 2 - 1);

  if (character.level < minimumCasterLevel) {
    return {
      canCreate: false,
      daysRequired: 0,
      goldCost: 0,
      message: `You must be at least level ${minimumCasterLevel} to create a level ${spellLevel} scroll.`,
    };
  }

  // Calculate requirements
  const baseDays = spellLevel * 2;
  const daysRequired = Math.max(
    1,
    baseDays - Math.floor((character.abilityModifiers.intelligenceLearnSpells || 0) / 5)
  );

  // Gold cost is 100gp × spell level squared
  const goldCost = 100 * spellLevel ** 2;

  return {
    canCreate: true,
    daysRequired,
    goldCost,
    message: `Creating a level ${spellLevel} scroll will require ${daysRequired} days and ${goldCost} gold.`,
  };
};

/**
 * Start scroll creation process
 */
export const startScrollCreation = (
  character: Character,
  spellName: string,
  spellLevel: number
): ScrollCreation => {
  const requirements = calculateScrollRequirements(character, spellLevel);

  if (!requirements.canCreate) {
    throw new Error(requirements.message);
  }

  return {
    creatorId: character.id,
    spellName,
    spellLevel,
    daysRequired: requirements.daysRequired,
    materialCost: requirements.goldCost,
    progressPercentage: 0,
  };
};

/**
 * Update scroll creation progress
 */
export const updateScrollProgress = (
  scrollCreation: ScrollCreation,
  daysWorked: number
): ScrollCreation => {
  const newProgress = Math.min(
    100,
    scrollCreation.progressPercentage + (daysWorked / scrollCreation.daysRequired) * 100
  );

  return {
    ...scrollCreation,
    progressPercentage: newProgress,
  };
};

/**
 * Check if scroll can be used by character
 */
export const canUseScroll = (character: Character, scroll: MagicScroll): boolean => {
  return scroll.userClasses.includes(character.class);
};

/**
 * Calculate scroll casting failure chance
 */
export const calculateScrollCastingCheck = (
  caster: Character,
  scroll: MagicScroll
): ScrollCastingCheck => {
  const levelDifference = Math.max(0, scroll.minCasterLevel - caster.level);

  // Base 5% failure chance per level difference
  const failureChance = Math.min(95, levelDifference * 5);

  // If failure occurs, there's a chance for backfire
  const backfireChance = Math.min(50, failureChance / 2);

  return {
    scroll,
    caster,
    failureChance,
    backfireChance,
  };
};

/**
 * Attempt to cast a spell from a scroll
 */
export const castScrollSpell = (
  castingCheck: ScrollCastingCheck
): {
  success: boolean;
  backfired: boolean;
  message: string;
  spell: Spell | null;
} => {
  const { scroll, caster, failureChance, backfireChance } = castingCheck;

  // Roll for success
  const failureRoll = roll(100);
  const success = failureRoll > failureChance;

  if (success) {
    return {
      success: true,
      backfired: false,
      message: `${caster.name} successfully casts ${scroll.spell.name} from the scroll.`,
      spell: scroll.spell,
    };
  }

  // Check for backfire
  const backfireRoll = roll(100);
  const backfired = backfireRoll <= backfireChance;

  if (backfired) {
    const backfireMessage =
      scroll.failureEffect || 'The spell backfires with unpredictable results!';

    return {
      success: false,
      backfired: true,
      message: `${caster.name} fails to cast the scroll and ${backfireMessage}`,
      spell: null,
    };
  }

  return {
    success: false,
    backfired: false,
    message: `${caster.name} fails to cast ${scroll.spell.name} from the scroll, but nothing bad happens.`,
    spell: null,
  };
};
