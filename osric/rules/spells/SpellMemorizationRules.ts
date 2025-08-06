import type { GameContext } from '../../core/GameContext';
import { BaseRule, type RuleResult } from '../../core/Rule';
import type { Character, Spell } from '../../types';
import { RULE_NAMES } from '../../types/constants';

/**
 * Rule for handling spell memorization mechanics in the OSRIC system.
 *
 * Preserves OSRIC spell memorization mechanics:
 * - Spell slot validation by class and level
 * - Rest requirements for memorization
 * - Bonus spells from high ability scores
 * - Spell replacement mechanics
 * - Class-specific memorization rules
 */
export class SpellMemorizationRules extends BaseRule {
  public readonly name = RULE_NAMES.SPELL_MEMORIZATION;
  public readonly description = 'Handles OSRIC spell memorization and slot allocation';

  public canApply(context: GameContext): boolean {
    // This rule applies when we have spell memorization temporary data
    const caster = context.getTemporary<Character>('memorizeSpell_caster');
    const spell = context.getTemporary<Spell>('memorizeSpell_spell');
    return !!(caster && spell);
  }

  public async execute(context: GameContext): Promise<RuleResult> {
    try {
      const caster = context.getTemporary<Character>('memorizeSpell_caster');
      const spell = context.getTemporary<Spell>('memorizeSpell_spell');
      const spellLevel = context.getTemporary<number>('memorizeSpell_level');
      const replaceSpell = context.getTemporary<string>('memorizeSpell_replaceSpell');

      if (!caster || !spell || !spellLevel) {
        return this.createFailureResult('Missing memorization data in context');
      }

      // Validate memorization prerequisites
      const validationResult = this.validateMemorization(caster, spell, spellLevel);
      if (!validationResult.success) {
        return validationResult;
      }

      // Handle spell replacement if specified
      let updatedCaster = caster;
      if (replaceSpell) {
        updatedCaster = this.replaceMemorizedSpell(caster, replaceSpell, spell, spellLevel);
      } else {
        updatedCaster = this.memorizeNewSpell(caster, spell, spellLevel);
      }

      // Update the caster in context
      context.setEntity(caster.id, updatedCaster);

      const action = replaceSpell ? 'replaced' : 'memorized';
      return this.createSuccessResult(`${caster.name} ${action} ${spell.name}`, {
        spellMemorized: spell.name,
        level: spellLevel,
        replacedSpell: replaceSpell,
      });
    } catch (error) {
      return this.createFailureResult(
        `Error in spell memorization: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Validate that the spell can be memorized by this caster
   * Preserves OSRIC memorization requirements
   */
  private validateMemorization(caster: Character, spell: Spell, spellLevel: number): RuleResult {
    // Check if caster can cast spells of this level
    if (!this.canCastSpellLevel(caster, spellLevel)) {
      return this.createFailureResult(`${caster.name} cannot cast spells of level ${spellLevel}`);
    }

    // Check if spell matches caster's class
    if (!this.isSpellValidForClass(caster, spell)) {
      return this.createFailureResult(`${spell.name} is not available to ${caster.class}s`);
    }

    // For arcane casters, check if spell is in spellbook
    if (this.isArcaneCaster(caster)) {
      if (!this.isSpellInSpellbook(caster, spell)) {
        return this.createFailureResult(`${spell.name} is not in ${caster.name}'s spellbook`);
      }
    }

    // Check intelligence requirements for arcane casters
    if (this.isArcaneCaster(caster)) {
      const maxSpellLevel = this.getMaxSpellLevelFromIntelligence(caster.abilities.intelligence);
      if (maxSpellLevel === null || spellLevel > maxSpellLevel) {
        return this.createFailureResult(
          `${caster.name}'s intelligence is too low to memorize level ${spellLevel} spells`
        );
      }
    }

    return this.createSuccessResult('Memorization validation passed');
  }

  /**
   * Check if character can cast spells of the given level
   */
  private canCastSpellLevel(caster: Character, spellLevel: number): boolean {
    return !!caster.spellSlots[spellLevel] && caster.spellSlots[spellLevel] > 0;
  }

  /**
   * Check if spell is valid for the character's class
   */
  private isSpellValidForClass(caster: Character, spell: Spell): boolean {
    const characterClass = caster.class;

    // Map character classes to spell classes
    const classSpellMapping: Record<string, string[]> = {
      'Magic-User': ['Magic-User'],
      Illusionist: ['Illusionist'],
      Cleric: ['Cleric'],
      Druid: ['Druid'],
      Paladin: ['Cleric'], // Paladins use cleric spells
      Ranger: ['Druid'], // Rangers use druid spells
    };

    const validSpellClasses = classSpellMapping[characterClass] || [];
    return validSpellClasses.includes(spell.class);
  }

  /**
   * Check if character is an arcane caster
   */
  private isArcaneCaster(caster: Character): boolean {
    return ['Magic-User', 'Illusionist'].includes(caster.class);
  }

  /**
   * Check if spell is in character's spellbook (for arcane casters)
   */
  private isSpellInSpellbook(caster: Character, spell: Spell): boolean {
    if (!caster.spellbook) {
      return false;
    }

    return caster.spellbook.some(
      (spellbookSpell) => spellbookSpell.name === spell.name && spellbookSpell.level === spell.level
    );
  }

  /**
   * Calculate maximum spell level based on intelligence
   * Preserves OSRIC intelligence-based spell level limits
   */
  private getMaxSpellLevelFromIntelligence(intelligence: number): number | null {
    if (intelligence < 9) return null;
    if (intelligence <= 9) return 4;
    if (intelligence <= 12) return 5;
    if (intelligence <= 14) return 6;
    if (intelligence <= 16) return 7;
    if (intelligence <= 17) return 8;
    return 9; // Intelligence 18+
  }

  /**
   * Memorize a new spell in an available slot
   */
  private memorizeNewSpell(caster: Character, spell: Spell, spellLevel: number): Character {
    const currentMemorized = caster.memorizedSpells[spellLevel] || [];

    return {
      ...caster,
      memorizedSpells: {
        ...caster.memorizedSpells,
        [spellLevel]: [...currentMemorized, spell],
      },
    };
  }

  /**
   * Replace an already memorized spell with a new one
   */
  private replaceMemorizedSpell(
    caster: Character,
    replaceSpellName: string,
    newSpell: Spell,
    spellLevel: number
  ): Character {
    const currentMemorized = caster.memorizedSpells[spellLevel] || [];

    // Find and replace the specified spell
    const updatedMemorized = currentMemorized.map((memorizedSpell) =>
      memorizedSpell.name === replaceSpellName ? newSpell : memorizedSpell
    );

    return {
      ...caster,
      memorizedSpells: {
        ...caster.memorizedSpells,
        [spellLevel]: updatedMemorized,
      },
    };
  }

  /**
   * Calculate total spell slots including bonus spells from wisdom
   * Preserves OSRIC bonus spell mechanics for divine casters
   */
  public static calculateTotalSpellSlots(caster: Character): Record<number, number> {
    const baseSlots = { ...caster.spellSlots };

    // Add bonus spells from wisdom for divine casters
    if (['Cleric', 'Druid', 'Paladin', 'Ranger'].includes(caster.class)) {
      const bonusSpells = SpellMemorizationRules.getBonusSpellsFromWisdom(caster.abilities.wisdom);

      for (const [levelStr, bonusCount] of Object.entries(bonusSpells)) {
        const level = Number.parseInt(levelStr, 10);
        if (baseSlots[level]) {
          baseSlots[level] = (baseSlots[level] || 0) + bonusCount;
        }
      }
    }

    return baseSlots;
  }

  /**
   * Calculate bonus spells from high wisdom for divine casters
   * Preserves OSRIC wisdom bonus spell table
   */
  private static getBonusSpellsFromWisdom(wisdom: number): Record<number, number> {
    const bonusSpells: Record<number, number> = {};

    if (wisdom >= 13) bonusSpells[1] = 1;
    if (wisdom >= 14) bonusSpells[1] = 2;
    if (wisdom >= 15) bonusSpells[2] = 1;
    if (wisdom >= 16) bonusSpells[2] = 2;
    if (wisdom >= 17) bonusSpells[3] = 1;
    if (wisdom >= 18) bonusSpells[3] = 2;

    return bonusSpells;
  }

  /**
   * Check if character needs rest to memorize spells
   * OSRIC requires full rest for spell memorization
   */
  public static requiresRest(_caster: Character): boolean {
    // In OSRIC, spellcasters must rest 8 hours before memorizing
    // This would track when the character last memorized spells
    // For now, simplified to always require rest
    return true;
  }

  /**
   * Clear all memorized spells (typically done after rest before memorizing new ones)
   */
  public static clearMemorizedSpells(caster: Character): Character {
    return {
      ...caster,
      memorizedSpells: {},
    };
  }
}
