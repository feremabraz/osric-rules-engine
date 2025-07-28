import type { SpellClass, SpellSlots } from '@rules/types';

/**
 * Defines how many spells each spellcasting class can cast at each level.
 * The numbers represent spell slots available per day.
 * These tables are based on OSRIC rules with metric system adjustments where applicable.
 */

export type SpellProgressionTable = Record<number, SpellSlots>;

// Magic-User Spell Progression
export const magicUserSpellProgression: SpellProgressionTable = {
  1: { 1: 1 },
  2: { 1: 2 },
  3: { 1: 2, 2: 1 },
  4: { 1: 3, 2: 2 },
  5: { 1: 4, 2: 2, 3: 1 },
  6: { 1: 4, 2: 2, 3: 2 },
  7: { 1: 4, 2: 3, 3: 2, 4: 1 },
  8: { 1: 4, 2: 3, 3: 3, 4: 2 },
  9: { 1: 4, 2: 3, 3: 3, 4: 2, 5: 1 },
  10: { 1: 4, 2: 4, 3: 3, 4: 2, 5: 2 },
  11: { 1: 4, 2: 4, 3: 4, 4: 3, 5: 3 },
  12: { 1: 4, 2: 4, 3: 4, 4: 4, 5: 4, 6: 1 },
  13: { 1: 5, 2: 5, 3: 5, 4: 4, 5: 4, 6: 2 },
  14: { 1: 5, 2: 5, 3: 5, 4: 4, 5: 4, 6: 2, 7: 1 },
  15: { 1: 5, 2: 5, 3: 5, 4: 5, 5: 5, 6: 3, 7: 2 },
  16: { 1: 5, 2: 5, 3: 5, 4: 5, 5: 5, 6: 3, 7: 2, 8: 1 },
  17: { 1: 5, 2: 5, 3: 5, 4: 5, 5: 5, 6: 4, 7: 3, 8: 2 },
  18: { 1: 5, 2: 5, 3: 5, 4: 5, 5: 5, 6: 4, 7: 3, 8: 2, 9: 1 },
  19: { 1: 5, 2: 5, 3: 5, 4: 5, 5: 5, 6: 5, 7: 4, 8: 3, 9: 1 },
  20: { 1: 5, 2: 5, 3: 5, 4: 5, 5: 5, 6: 5, 7: 4, 8: 3, 9: 2 },
};

// Cleric Spell Progression
export const clericSpellProgression: SpellProgressionTable = {
  1: { 1: 1 },
  2: { 1: 2 },
  3: { 1: 2, 2: 1 },
  4: { 1: 3, 2: 2 },
  5: { 1: 3, 2: 3, 3: 1 },
  6: { 1: 3, 2: 3, 3: 2 },
  7: { 1: 3, 2: 3, 3: 2, 4: 1 },
  8: { 1: 3, 2: 3, 3: 3, 4: 2 },
  9: { 1: 4, 2: 4, 3: 3, 4: 2, 5: 1 },
  10: { 1: 4, 2: 4, 3: 3, 4: 3, 5: 2 },
  11: { 1: 5, 2: 4, 3: 4, 4: 3, 5: 2, 6: 1 },
  12: { 1: 6, 2: 5, 3: 5, 4: 4, 5: 3, 6: 2 },
  13: { 1: 6, 2: 6, 3: 6, 4: 5, 5: 4, 6: 2 },
  14: { 1: 6, 2: 6, 3: 6, 4: 5, 5: 5, 6: 3, 7: 1 },
  15: { 1: 7, 2: 7, 3: 7, 4: 6, 5: 5, 6: 3, 7: 2 },
  16: { 1: 7, 2: 7, 3: 7, 4: 6, 5: 6, 6: 4, 7: 2 },
  17: { 1: 8, 2: 8, 3: 8, 4: 7, 5: 6, 6: 4, 7: 3 },
  18: { 1: 8, 2: 8, 3: 8, 4: 7, 5: 7, 6: 5, 7: 3 },
  19: { 1: 9, 2: 9, 3: 9, 4: 8, 5: 7, 6: 5, 7: 4 },
  20: { 1: 9, 2: 9, 3: 9, 4: 8, 5: 8, 6: 6, 7: 4 },
};

// Druid Spell Progression
export const druidSpellProgression: SpellProgressionTable = {
  1: { 1: 1 },
  2: { 1: 2 },
  3: { 1: 2, 2: 1 },
  4: { 1: 3, 2: 2 },
  5: { 1: 3, 2: 3, 3: 1 },
  6: { 1: 3, 2: 3, 3: 2 },
  7: { 1: 3, 2: 3, 3: 2, 4: 1 },
  8: { 1: 3, 2: 3, 3: 3, 4: 2 },
  9: { 1: 4, 2: 4, 3: 3, 4: 2, 5: 1 },
  10: { 1: 4, 2: 4, 3: 3, 4: 3, 5: 2 },
  11: { 1: 5, 2: 4, 3: 4, 4: 3, 5: 2, 6: 1 },
  12: { 1: 6, 2: 5, 3: 5, 4: 4, 5: 3, 6: 2 },
  13: { 1: 6, 2: 6, 3: 6, 4: 5, 5: 4, 6: 2 },
  14: { 1: 6, 2: 6, 3: 6, 4: 5, 5: 5, 6: 3, 7: 1 },
  15: { 1: 7, 2: 7, 3: 7, 4: 6, 5: 5, 6: 3, 7: 2 },
  16: { 1: 7, 2: 7, 3: 7, 4: 6, 5: 6, 6: 4, 7: 2 },
  17: { 1: 8, 2: 8, 3: 8, 4: 7, 5: 6, 6: 4, 7: 3 },
  18: { 1: 8, 2: 8, 3: 8, 4: 7, 5: 7, 6: 5, 7: 3 },
  19: { 1: 9, 2: 9, 3: 9, 4: 8, 5: 7, 6: 5, 7: 4 },
  20: { 1: 9, 2: 9, 3: 9, 4: 8, 5: 8, 6: 6, 7: 4 },
};

// Illusionist Spell Progression
export const illusionistSpellProgression: SpellProgressionTable = {
  1: { 1: 1 },
  2: { 1: 2 },
  3: { 1: 2, 2: 1 },
  4: { 1: 3, 2: 2 },
  5: { 1: 4, 2: 2, 3: 1 },
  6: { 1: 4, 2: 3, 3: 2 },
  7: { 1: 4, 2: 3, 3: 2, 4: 1 },
  8: { 1: 4, 2: 3, 3: 3, 4: 2 },
  9: { 1: 4, 2: 3, 3: 3, 4: 2, 5: 1 },
  10: { 1: 4, 2: 4, 3: 3, 4: 3, 5: 2 },
  11: { 1: 5, 2: 4, 3: 4, 4: 3, 5: 2, 6: 1 },
  12: { 1: 5, 2: 5, 3: 5, 4: 4, 5: 3, 6: 2 },
  13: { 1: 5, 2: 5, 3: 5, 4: 5, 5: 4, 6: 2 },
  14: { 1: 5, 2: 5, 3: 5, 4: 5, 5: 5, 6: 3, 7: 1 },
  15: { 1: 5, 2: 5, 3: 5, 4: 5, 5: 5, 6: 3, 7: 2 },
  16: { 1: 5, 2: 5, 3: 5, 4: 5, 5: 5, 6: 4, 7: 2 },
  17: { 1: 5, 2: 5, 3: 5, 4: 5, 5: 5, 6: 4, 7: 3 },
  18: { 1: 5, 2: 5, 3: 5, 4: 5, 5: 5, 6: 5, 7: 4 },
  19: { 1: 5, 2: 5, 3: 5, 4: 5, 5: 5, 6: 5, 7: 4 },
  20: { 1: 5, 2: 5, 3: 5, 4: 5, 5: 5, 6: 5, 7: 5 },
};

// Combined progression tables for all classes
export const spellProgressions: Record<SpellClass, SpellProgressionTable> = {
  'Magic-User': magicUserSpellProgression,
  Cleric: clericSpellProgression,
  Druid: druidSpellProgression,
  Illusionist: illusionistSpellProgression,
};

/**
 * Gets the number of spell slots a character of a given class and level has
 * @param spellClass The spellcasting class
 * @param characterLevel The character's level
 * @returns SpellSlots object with available slots by spell level
 */
export function getSpellSlots(spellClass: SpellClass, characterLevel: number): SpellSlots {
  const progression = spellProgressions[spellClass];

  // Cap at level 20
  const level = Math.min(characterLevel, 20);

  // Return empty slots if below level 1 or if the class doesn't cast spells
  if (level < 1 || !progression) {
    return {};
  }

  return progression[level] || {};
}

/**
 * Calculates additional spell slots from high wisdom (for Clerics and Druids)
 * @param wisdomScore The character's wisdom ability score
 * @returns Record of bonus spells by level
 */
export function getBonusSpellsFromWisdom(wisdomScore: number): Record<number, number> {
  const bonusSpells: Record<number, number> = {};

  if (wisdomScore >= 13) bonusSpells[1] = 1;
  if (wisdomScore >= 14) bonusSpells[1] = 2;
  if (wisdomScore >= 15) bonusSpells[2] = 1;
  if (wisdomScore >= 16) bonusSpells[2] = 2;
  if (wisdomScore >= 17) bonusSpells[3] = 1;
  if (wisdomScore >= 18) bonusSpells[3] = 2;

  return bonusSpells;
}

/**
 * Calculates the maximum spell level a Magic-User or Illusionist can learn
 * based on their Intelligence score
 * @param intelligenceScore The character's intelligence ability score
 * @returns The maximum spell level or null if they can't cast spells
 */
export function getMaxSpellLevelFromIntelligence(intelligenceScore: number): number | null {
  if (intelligenceScore < 9) return null;
  if (intelligenceScore <= 9) return 4;
  if (intelligenceScore <= 12) return 5;
  if (intelligenceScore <= 14) return 6;
  if (intelligenceScore <= 16) return 7;
  if (intelligenceScore <= 17) return 8;
  return 9; // Intelligence 18
}

/**
 * Calculates the chance to learn a spell for Magic-Users and Illusionists
 * based on their Intelligence score
 * @param intelligenceScore The character's intelligence ability score
 * @returns Percentage chance (0-100) to learn a spell or null if they can't cast spells
 */
export function getSpellLearningChance(intelligenceScore: number): number | null {
  if (intelligenceScore < 9) return null;
  if (intelligenceScore === 9) return 35;
  if (intelligenceScore === 10) return 40;
  if (intelligenceScore === 11) return 45;
  if (intelligenceScore === 12) return 50;
  if (intelligenceScore === 13) return 55;
  if (intelligenceScore === 14) return 60;
  if (intelligenceScore === 15) return 65;
  if (intelligenceScore === 16) return 70;
  if (intelligenceScore === 17) return 75;
  return 85; // Intelligence 18
}
