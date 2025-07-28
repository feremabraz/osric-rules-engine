import { rollDice } from '@rules/dice';
import type { ActionResult, Character, Monster, Spell, SpellResult } from '@rules/types';
import { findSpellByName } from './spellList';
import { forgetSpell } from './spellMemorization';

export interface SpellCastingOptions {
  ignoreComponents: boolean;
  ignoreMemorization: boolean;
}

export interface SpellCastResult extends ActionResult {
  spell?: Spell;
  spellResult?: SpellResult;
}

/**
 * Check if the character meets the requirements to cast a spell
 * @param caster The character casting the spell
 * @param spell The spell being cast
 * @param options Spell casting options
 * @returns An object with success flag and message
 */
export function canCastSpell(
  caster: Character,
  spell: Spell,
  options: Partial<SpellCastingOptions> = {}
): { success: boolean; message: string } {
  const { ignoreComponents = false, ignoreMemorization = false } = options;

  // Check if the caster is a valid class for this spell
  const isValidClass =
    caster.class === spell.class || (caster.classes && caster.classes[spell.class] !== undefined);

  if (!isValidClass) {
    return {
      success: false,
      message: `${caster.name} cannot cast ${spell.name} (incompatible class).`,
    };
  }

  // Check if the spell is memorized (unless ignoring)
  if (!ignoreMemorization) {
    const memorizedSpells = caster.memorizedSpells[spell.level] || [];
    const hasMemorized = memorizedSpells.some((s) => s.name === spell.name);

    if (!hasMemorized) {
      return {
        success: false,
        message: `${caster.name} has not memorized ${spell.name}.`,
      };
    }
  }

  // Check for material components (unless ignoring)
  if (!ignoreComponents && spell.materialComponents && spell.materialComponents.length > 0) {
    // In a full implementation, this would check the character's inventory
    // for now we'll assume they have the materials
    const hasComponents = true;

    if (!hasComponents) {
      return {
        success: false,
        message: `${caster.name} is missing the material components for ${spell.name}.`,
      };
    }
  }

  return {
    success: true,
    message: `${caster.name} can cast ${spell.name}.`,
  };
}

/**
 * Calculate the spell's saving throw target value
 * @param caster The character casting the spell
 * @param spell The spell being cast
 * @returns The target value for saving throws or null if no save is allowed
 */
export function calculateSpellSavingThrow(caster: Character, spell: Spell): number | null {
  if (spell.savingThrow === 'None') {
    return null;
  }

  // Base saving throw value depends on the spell level and caster's level
  // This is a simplified version - in OSRIC the target would check their
  // own saving throw table based on their class and level
  const baseSave = 20 - caster.level;

  // Apply any relevant modifiers
  // For example, some items might grant bonuses/penalties
  const modifier = 0;

  // Return the final value
  return Math.max(1, baseSave - modifier);
}

/**
 * Cast a spell and resolve its effects
 * @param caster The character casting the spell
 * @param spellName The name of the spell to cast
 * @param targets The targets of the spell
 * @param options Spell casting options
 * @returns The result of the spell cast
 */
export function castSpell(
  caster: Character,
  spellName: string,
  targets: (Character | Monster)[],
  options: Partial<SpellCastingOptions> = {}
): SpellCastResult {
  // Find the spell
  const spell = findSpellByName(spellName);

  if (!spell) {
    return {
      success: false,
      message: `Spell "${spellName}" not found.`,
      damage: null,
      effects: null,
    };
  }

  // Check if the character can cast the spell
  const canCast = canCastSpell(caster, spell, options);

  if (!canCast.success) {
    return {
      success: false,
      message: canCast.message,
      damage: null,
      effects: null,
    };
  }

  // If not ignoring memorization, forget the spell (it's been cast)
  if (!options.ignoreMemorization) {
    const forgetResult = forgetSpell(caster, spell.name);

    if (!forgetResult.success) {
      // This shouldn't happen if canCastSpell passed, but just in case
      return {
        success: false,
        message: `Error: ${forgetResult.message}`,
        damage: null,
        effects: null,
      };
    }
  }

  // Apply the spell's effect
  const spellResult = spell.effect(caster, targets);

  // Process saving throws for targets
  if (spell.savingThrow !== 'None') {
    const saveTarget = calculateSpellSavingThrow(caster, spell);

    // Resolve individual saving throws for each target
    // This would normally modify spellResult based on who saved
    targets.forEach((target, index) => {
      if (saveTarget && 'savingThrows' in target) {
        // Roll a d20 saving throw
        const saveRoll = rollDice(1, 20, 0);

        // Check if the target saved
        const saved = saveRoll.result >= saveTarget;

        // Apply appropriate modifications based on save results
        // This is a simplified implementation
        if (saved && spellResult.damage && spellResult.damage[index]) {
          // Half damage on successful save for damaging spells
          spellResult.damage[index] = Math.floor(spellResult.damage[index] / 2);
        }
      }
    });
  }

  // Construct and return the final result
  return {
    success: true,
    message: spellResult.narrative,
    damage: spellResult.damage,
    effects: spellResult.statusEffects?.map((effect) => effect.name) || null,
    spell,
    spellResult,
  };
}

/**
 * Get the range of the spell in meters, accounting for caster level
 * @param spell The spell to check
 * @param casterLevel The level of the caster
 * @returns The range in meters
 */
export function getSpellRange(spell: Spell, casterLevel: number): number {
  // Handle special ranges
  if (spell.range === 'Self' || spell.range === 'Touch') {
    return 0;
  }

  // Handle formulas like "18 meters + 1.5 meters per level"
  if (spell.range.includes('per level')) {
    const parts = spell.range.split('+');

    if (parts.length === 2) {
      const baseRange = Number.parseFloat(parts[0].trim());
      const perLevelPart = parts[1].trim();
      const perLevelMatch = perLevelPart.match(/([0-9.]+) meters per level/);

      if (perLevelMatch?.at(1)) {
        const perLevelAmount = Number.parseFloat(perLevelMatch[1]);
        return baseRange + perLevelAmount * casterLevel;
      }
    }
  }

  // Try to extract a simple numeric value
  const numericMatch = spell.range.match(/([0-9.]+) meters/);
  if (numericMatch?.at(1)) {
    return Number.parseFloat(numericMatch[1]);
  }

  // Default for unknown formats
  return 0;
}

/**
 * Get the duration of the spell in rounds, accounting for caster level
 * @param spell The spell to check
 * @param casterLevel The level of the caster
 * @returns The duration in rounds or -1 for permanent/instantaneous effects
 */
export function getSpellDuration(spell: Spell, casterLevel: number): number {
  // Handle special durations
  if (spell.duration === 'Instantaneous') {
    return 0;
  }

  if (spell.duration === 'Permanent') {
    return -1;
  }

  // Handle formulas like "5 rounds per level"
  if (spell.duration.includes('per level')) {
    const match = spell.duration.match(/([0-9.]+) rounds? per level/);

    if (match?.at(1)) {
      const perLevelAmount = Number.parseFloat(match[1]);
      return Math.floor(perLevelAmount * casterLevel);
    }
  }

  // Handle simple durations like "3 rounds"
  const roundsMatch = spell.duration.match(/([0-9.]+) rounds?/);
  if (roundsMatch?.at(1)) {
    return Number.parseInt(roundsMatch[1], 10);
  }

  // Handle turn-based durations (convert to rounds, 1 turn = 10 rounds in OSRIC)
  const turnsMatch = spell.duration.match(/([0-9.]+) turns?/);
  if (turnsMatch?.at(1)) {
    return Number.parseInt(turnsMatch[1], 10) * 10;
  }

  // Default for unknown formats
  return 1;
}
