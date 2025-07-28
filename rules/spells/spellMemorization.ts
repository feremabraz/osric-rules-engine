import type { Character, Spell, SpellClass, SpellSlots } from '@rules/types';
import { findSpellByName } from './spellList';
import { getBonusSpellsFromWisdom, getSpellSlots } from './spellProgression';

export interface MemorizationResult {
  success: boolean;
  message: string;
  memorizedSpells?: Record<number, Spell[]>;
}

export interface SpellMemorizationOptions {
  requiresRest: boolean;
  enforceSlotLimits: boolean;
}

/**
 * Checks if a character can memorize a given spell
 *
 * @param character The character attempting to memorize
 * @param spell The spell to be memorized
 * @returns True if the character can memorize this spell
 */
export function canMemorizeSpell(character: Character, spell: Spell): boolean {
  // Check if the character's class can cast this type of spell
  const isValidClass =
    character.class === spell.class ||
    // Handle multi-class characters
    character.classes?.[spell.class];

  if (!isValidClass) {
    return false;
  }

  // Check if the spell level is available to the character
  const characterLevel = character.classes?.[spell.class] || character.level;
  const spellSlots = getSpellSlots(spell.class, characterLevel);

  // If there are no slots for this level, character can't cast it
  if (!spellSlots[spell.level]) {
    return false;
  }

  // For Magic-Users and Illusionists, they must have the spell in their spellbook
  if (spell.class === 'Magic-User' || spell.class === 'Illusionist') {
    const hasSpellInBook = character.spellbook.some((bookSpell) => bookSpell.name === spell.name);

    if (!hasSpellInBook) {
      return false;
    }
  }

  return true;
}

/**
 * Counts the number of spells a character has memorized by level
 *
 * @param character The character to check
 * @returns A record of counts by spell level
 */
export function countMemorizedSpellsByLevel(character: Character): Record<number, number> {
  const counts: Record<number, number> = {};

  // Initialize counts object with zeros
  for (let i = 1; i <= 9; i++) {
    counts[i] = 0;
  }

  // Count spells
  for (const [level, spells] of Object.entries(character.memorizedSpells)) {
    counts[Number(level)] = spells.length;
  }

  return counts;
}

/**
 * Get the total spell slots available to a character, including bonus slots
 * from high ability scores
 *
 * @param character The character to check
 * @returns SpellSlots object with available slots
 */
export function getTotalSpellSlots(character: Character): SpellSlots {
  // If the character doesn't have a spellcasting class, return empty slots
  if (
    !character.class ||
    !['Magic-User', 'Cleric', 'Druid', 'Illusionist'].includes(character.class)
  ) {
    return {};
  }

  // Get base slots from the character's class and level
  const characterClass = character.class as SpellClass;
  const baseSlots = getSpellSlots(characterClass, character.level);
  const result = { ...baseSlots };

  // Add bonus slots from Wisdom for Clerics and Druids
  if (character.class === 'Cleric' || character.class === 'Druid') {
    const bonusSlots = getBonusSpellsFromWisdom(character.abilities.wisdom);

    // Add the bonus slots to the existing slots
    for (const [level, count] of Object.entries(bonusSlots)) {
      const numLevel = Number(level);

      // Only add bonus spells if the character can already cast spells of this level
      if (baseSlots[numLevel]) {
        result[numLevel] = (result[numLevel] || 0) + count;
      }
    }
  }

  return result;
}

/**
 * Attempt to memorize a spell
 *
 * @param character The character attempting to memorize
 * @param spellName The name of the spell to memorize
 * @param options Options for memorization
 * @returns Result of the memorization attempt
 */
export function memorizeSpell(
  character: Character,
  spellName: string,
  options: SpellMemorizationOptions = { requiresRest: true, enforceSlotLimits: true }
): MemorizationResult {
  // Find the spell
  const spell = findSpellByName(spellName);

  if (!spell) {
    return {
      success: false,
      message: `Spell "${spellName}" not found.`,
    };
  }

  // Check if the character can memorize this spell
  if (!canMemorizeSpell(character, spell)) {
    return {
      success: false,
      message: `${character.name} cannot memorize ${spell.name} (incompatible class or level).`,
    };
  }

  // Get available slots
  const availableSlots = getTotalSpellSlots(character);

  // Count currently memorized spells
  const memorizedCounts = countMemorizedSpellsByLevel(character);

  // Check if there's room in the spell slots
  if (
    options.enforceSlotLimits &&
    memorizedCounts[spell.level] >= (availableSlots[spell.level] || 0)
  ) {
    return {
      success: false,
      message: `${character.name} has no available spell slots for level ${spell.level} spells.`,
    };
  }

  // Create a copy of the character's memorized spells
  const memorizedSpells = { ...character.memorizedSpells };

  // Initialize the level array if it doesn't exist
  if (!memorizedSpells[spell.level]) {
    memorizedSpells[spell.level] = [];
  }

  // Add the spell
  memorizedSpells[spell.level] = [...memorizedSpells[spell.level], spell];

  return {
    success: true,
    message: `${character.name} ${options.requiresRest ? 'will memorize' : 'has memorized'} ${spell.name}.${
      options.requiresRest ? ' The spell will be available after resting.' : ''
    }`,
    memorizedSpells,
  };
}

/**
 * Forget (or cast) a memorized spell
 *
 * @param character The character forgetting the spell
 * @param spellName The name of the spell to forget
 * @param index Optional index if multiple copies are memorized
 * @returns Result of the forgetting attempt
 */
export function forgetSpell(
  character: Character,
  spellName: string,
  index = 0
): MemorizationResult {
  // Create a deep copy of the current memorized spells
  const memorizedSpells: Record<number, Spell[]> = {};
  let found = false;
  let foundIndex = 0;

  // Copy all the spells except the one being forgotten
  for (const [level, spells] of Object.entries(character.memorizedSpells)) {
    const numLevel = Number(level);
    memorizedSpells[numLevel] = [];

    for (const spell of spells) {
      if (spell.name.toLowerCase() === spellName.toLowerCase()) {
        if (foundIndex === index) {
          found = true;
          // Skip this spell (don't add it to the new array)
        } else {
          memorizedSpells[numLevel].push(spell);
        }
        foundIndex++;
      } else {
        memorizedSpells[numLevel].push(spell);
      }
    }

    // Remove empty arrays
    if (memorizedSpells[numLevel].length === 0) {
      delete memorizedSpells[numLevel];
    }
  }

  if (!found) {
    return {
      success: false,
      message: `${character.name} does not have ${spellName} memorized.`,
    };
  }

  return {
    success: true,
    message: `${character.name} has forgotten ${spellName}.`,
    memorizedSpells,
  };
}

/**
 * Prepares all memorized spells after a rest period
 *
 * @param character The character preparing spells
 * @returns The updated character with prepared spells
 */
export function prepareSpellsAfterRest(character: Character): Character {
  // In OSRIC, spells are memorized during rest, so we return
  // the character with their memorizedSpells unchanged
  return {
    ...character,
    // Any other rest-related updates would go here
  };
}

/**
 * Reset all spell slots (forget all spells)
 *
 * @param character The character to reset
 * @returns The updated character with no memorized spells
 */
export function resetSpellSlots(character: Character): Character {
  return {
    ...character,
    memorizedSpells: {},
  };
}
