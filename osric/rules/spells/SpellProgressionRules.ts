import type { GameContext } from '../../core/GameContext';
import { BaseRule, type RuleResult } from '../../core/Rule';
import type { Character, SpellSlots } from '../../types';
import { RULE_NAMES } from '../../types/constants';

/**
 * Rule for handling spell progression and slot calculation in the OSRIC system.
 *
 * Preserves OSRIC spell progression mechanics:
 * - Spell slots by class and level (exact OSRIC tables)
 * - Bonus spells from high ability scores
 * - Intelligence limits for arcane casters
 * - Class-specific spell progression tables
 */
export class SpellProgressionRules extends BaseRule {
  public readonly name = RULE_NAMES.SPELL_PROGRESSION;
  public readonly description = 'Calculates spell slots and progression by OSRIC rules';

  public canApply(context: GameContext): boolean {
    // This rule applies when we need to calculate spell progression
    const character = context.getTemporary<Character>('calculateSpells_character');
    return !!character;
  }

  public async execute(context: GameContext): Promise<RuleResult> {
    try {
      const character = context.getTemporary<Character>('calculateSpells_character');

      if (!character) {
        return this.createFailureResult('Missing character in context');
      }

      // Calculate spell slots for the character
      const spellSlots = this.calculateSpellSlots(character);

      // Store results
      context.setTemporary('calculateSpells_result', spellSlots);

      return this.createSuccessResult(`Calculated spell slots for ${character.name}`, {
        spellSlots,
      });
    } catch (error) {
      return this.createFailureResult(
        `Error calculating spell progression: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Calculate total spell slots for a character based on class, level, and abilities
   * Preserves exact OSRIC spell progression tables
   */
  private calculateSpellSlots(character: Character): SpellSlots {
    const characterClass = character.class;
    const characterLevel = character.level;

    // Get base spell slots from class progression
    let baseSlots = this.getBaseSpellSlots(characterClass, characterLevel);

    // Add bonus spells from high abilities
    if (this.isDivineCaster(characterClass)) {
      const bonusSpells = this.getBonusSpellsFromWisdom(character.abilities.wisdom);
      baseSlots = this.addBonusSpells(baseSlots, bonusSpells);
    }

    // Validate against intelligence limits for arcane casters
    if (this.isArcaneCaster(characterClass)) {
      baseSlots = this.applyIntelligenceLimits(baseSlots, character.abilities.intelligence);
    }

    return baseSlots;
  }

  /**
   * Get base spell slots from OSRIC class progression tables
   * These are the exact values from the OSRIC rulebook
   */
  private getBaseSpellSlots(characterClass: string, characterLevel: number): SpellSlots {
    // Cap level at 20 for spell progression
    const level = Math.min(characterLevel, 20);

    switch (characterClass) {
      case 'Magic-User':
        return this.getMagicUserSpellSlots(level);
      case 'Cleric':
        return this.getClericSpellSlots(level);
      case 'Druid':
        return this.getDruidSpellSlots(level);
      case 'Illusionist':
        return this.getIllusionistSpellSlots(level);
      case 'Paladin':
        return this.getPaladinSpellSlots(level);
      case 'Ranger':
        return this.getRangerSpellSlots(level);
      default:
        return {}; // Non-spellcasting class
    }
  }

  /**
   * Magic-User spell progression - exact OSRIC table
   */
  private getMagicUserSpellSlots(level: number): SpellSlots {
    const progression: Record<number, SpellSlots> = {
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

    return progression[level] || {};
  }

  /**
   * Cleric spell progression - exact OSRIC table
   */
  private getClericSpellSlots(level: number): SpellSlots {
    const progression: Record<number, SpellSlots> = {
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

    return progression[level] || {};
  }

  /**
   * Druid spell progression - exact OSRIC table
   */
  private getDruidSpellSlots(level: number): SpellSlots {
    const progression: Record<number, SpellSlots> = {
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

    return progression[level] || {};
  }

  /**
   * Illusionist spell progression - exact OSRIC table
   */
  private getIllusionistSpellSlots(level: number): SpellSlots {
    const progression: Record<number, SpellSlots> = {
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

    return progression[level] || {};
  }

  /**
   * Paladin spell progression - starts at level 9
   */
  private getPaladinSpellSlots(level: number): SpellSlots {
    if (level < 9) return {};

    const progression: Record<number, SpellSlots> = {
      9: { 1: 1 },
      10: { 1: 2 },
      11: { 1: 2, 2: 1 },
      12: { 1: 2, 2: 2 },
      13: { 1: 2, 2: 2, 3: 1 },
      14: { 1: 3, 2: 2, 3: 1 },
      15: { 1: 3, 2: 2, 3: 1, 4: 1 },
      16: { 1: 3, 2: 3, 3: 1, 4: 1 },
      17: { 1: 3, 2: 3, 3: 2, 4: 1 },
      18: { 1: 3, 2: 3, 3: 3, 4: 1 },
      19: { 1: 3, 2: 3, 3: 3, 4: 2 },
      20: { 1: 3, 2: 3, 3: 3, 4: 3 },
    };

    return progression[level] || {};
  }

  /**
   * Ranger spell progression - starts at level 8
   */
  private getRangerSpellSlots(level: number): SpellSlots {
    if (level < 8) return {};

    const progression: Record<number, SpellSlots> = {
      8: { 1: 1 },
      9: { 1: 2 },
      10: { 1: 2, 2: 1 },
      11: { 1: 2, 2: 2 },
      12: { 1: 2, 2: 2, 3: 1 },
      13: { 1: 3, 2: 2, 3: 1 },
      14: { 1: 3, 2: 2, 3: 1 },
      15: { 1: 3, 2: 3, 3: 2 },
      16: { 1: 3, 2: 3, 3: 3 },
      17: { 1: 4, 2: 3, 3: 3 },
      18: { 1: 4, 2: 4, 3: 3 },
      19: { 1: 4, 2: 4, 3: 4 },
      20: { 1: 4, 2: 4, 3: 4 },
    };

    return progression[level] || {};
  }

  /**
   * Check if character class is a divine caster
   */
  private isDivineCaster(characterClass: string): boolean {
    return ['Cleric', 'Druid', 'Paladin', 'Ranger'].includes(characterClass);
  }

  /**
   * Check if character class is an arcane caster
   */
  private isArcaneCaster(characterClass: string): boolean {
    return ['Magic-User', 'Illusionist'].includes(characterClass);
  }

  /**
   * Calculate bonus spells from high wisdom for divine casters
   * Preserves exact OSRIC wisdom bonus spell table
   */
  private getBonusSpellsFromWisdom(wisdom: number): Record<number, number> {
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
   * Add bonus spells to base spell slots
   */
  private addBonusSpells(baseSlots: SpellSlots, bonusSpells: Record<number, number>): SpellSlots {
    const result = { ...baseSlots };

    for (const [levelStr, bonusCount] of Object.entries(bonusSpells)) {
      const level = Number.parseInt(levelStr, 10);
      if (result[level]) {
        result[level] = (result[level] || 0) + bonusCount;
      }
    }

    return result;
  }

  /**
   * Apply intelligence limits for arcane casters
   * Preserves OSRIC intelligence-based spell level restrictions
   */
  private applyIntelligenceLimits(spellSlots: SpellSlots, intelligence: number): SpellSlots {
    const maxSpellLevel = this.getMaxSpellLevelFromIntelligence(intelligence);

    if (maxSpellLevel === null) {
      return {}; // Cannot cast spells
    }

    const result: SpellSlots = {};
    for (const [levelStr, slots] of Object.entries(spellSlots)) {
      const level = Number.parseInt(levelStr, 10);
      if (level <= maxSpellLevel) {
        result[level] = slots;
      }
    }

    return result;
  }

  /**
   * Get maximum spell level based on intelligence
   * Preserves OSRIC intelligence table
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
}
