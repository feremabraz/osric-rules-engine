import type { GameContext } from '../../core/GameContext';
import { BaseRule, type RuleResult } from '../../core/Rule';
import type { Character, Spell } from '../../types';
import { RULE_NAMES } from '../../types/constants';

export class SpellMemorizationRules extends BaseRule {
  public readonly name = RULE_NAMES.SPELL_MEMORIZATION;
  public readonly description = 'Handles OSRIC spell memorization and slot allocation';

  public canApply(context: GameContext): boolean {
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

      const validationResult = this.validateMemorization(caster, spell, spellLevel);
      if (!validationResult.success) {
        return validationResult;
      }

      let updatedCaster = caster;
      if (replaceSpell) {
        updatedCaster = this.replaceMemorizedSpell(caster, replaceSpell, spell, spellLevel);
      } else {
        updatedCaster = this.memorizeNewSpell(caster, spell, spellLevel);
      }

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

  private validateMemorization(caster: Character, spell: Spell, spellLevel: number): RuleResult {
    if (!this.canCastSpellLevel(caster, spellLevel)) {
      return this.createFailureResult(`${caster.name} cannot cast spells of level ${spellLevel}`);
    }

    if (!this.isSpellValidForClass(caster, spell)) {
      return this.createFailureResult(`${spell.name} is not available to ${caster.class}s`);
    }

    if (this.isArcaneCaster(caster)) {
      if (!this.isSpellInSpellbook(caster, spell)) {
        return this.createFailureResult(`${spell.name} is not in ${caster.name}'s spellbook`);
      }
    }

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

  private canCastSpellLevel(caster: Character, spellLevel: number): boolean {
    return !!caster.spellSlots[spellLevel] && caster.spellSlots[spellLevel] > 0;
  }

  private isSpellValidForClass(caster: Character, spell: Spell): boolean {
    const characterClass = caster.class;

    const classSpellMapping: Record<string, string[]> = {
      'Magic-User': ['Magic-User'],
      Illusionist: ['Illusionist'],
      Cleric: ['Cleric'],
      Druid: ['Druid'],
      Paladin: ['Cleric'],
      Ranger: ['Druid'],
    };

    const validSpellClasses = classSpellMapping[characterClass] || [];
    return validSpellClasses.includes(spell.class);
  }

  private isArcaneCaster(caster: Character): boolean {
    return ['Magic-User', 'Illusionist'].includes(caster.class);
  }

  private isSpellInSpellbook(caster: Character, spell: Spell): boolean {
    if (!caster.spellbook) {
      return false;
    }

    return caster.spellbook.some(
      (spellbookSpell) => spellbookSpell.name === spell.name && spellbookSpell.level === spell.level
    );
  }

  private getMaxSpellLevelFromIntelligence(intelligence: number): number | null {
    if (intelligence < 9) return null;
    if (intelligence <= 9) return 4;
    if (intelligence <= 12) return 5;
    if (intelligence <= 14) return 6;
    if (intelligence <= 16) return 7;
    if (intelligence <= 17) return 8;
    return 9;
  }

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

  private replaceMemorizedSpell(
    caster: Character,
    replaceSpellName: string,
    newSpell: Spell,
    spellLevel: number
  ): Character {
    const currentMemorized = caster.memorizedSpells[spellLevel] || [];

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

  public static calculateTotalSpellSlots(caster: Character): Record<number, number> {
    const baseSlots = { ...caster.spellSlots };

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

  public static requiresRest(_caster: Character): boolean {
    return true;
  }

  public static clearMemorizedSpells(caster: Character): Character {
    return {
      ...caster,
      memorizedSpells: {},
    };
  }
}
