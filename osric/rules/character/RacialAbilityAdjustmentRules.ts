/**
 * Racial Ability Adjustments Rules for OSRIC Character Creation
 * Handles racial modifiers to ability scores as per OSRIC rules
 */

import type { Command } from '@osric/core/Command';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule } from '@osric/core/Rule';
import type { RuleResult } from '@osric/core/Rule';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';

import type { AbilityScores, CharacterRace } from '@osric/types/character';

interface RacialModifiers {
  strength?: number;
  dexterity?: number;
  constitution?: number;
  intelligence?: number;
  wisdom?: number;
  charisma?: number;
}

interface CreateCharacterParams {
  race: CharacterRace;
  name: string;
  characterClass: string;
  alignment: string;
  abilityScoreMethod: string;
}

/**
 * Racial ability score modifiers as defined in OSRIC
 */
const RACIAL_MODIFIERS: Record<CharacterRace, RacialModifiers> = {
  Human: {
    // Humans get no racial modifiers - they're versatile
  },
  Dwarf: {
    constitution: 1,
    charisma: -1,
  },
  Elf: {
    dexterity: 1,
    constitution: -1,
  },
  Gnome: {
    intelligence: 1,
    wisdom: -1,
  },
  'Half-Elf': {
    // Half-elves get no stat modifiers but have other advantages
  },
  Halfling: {
    dexterity: 1,
    strength: -1,
  },
  'Half-Orc': {
    strength: 1,
    intelligence: -2,
    charisma: -1,
  },
};

export class RacialAbilityAdjustmentRules extends BaseRule {
  readonly name = RULE_NAMES.RACIAL_ABILITIES;
  readonly priority = 300; // After base generation, before class validation

  async apply(context: GameContext, _command: Command): Promise<RuleResult> {
    try {
      // Get the base ability scores from previous rule
      const baseScores = this.getRequiredContext<AbilityScores>(
        context,
        'character:creation:ability-scores'
      );

      // Get character creation parameters
      const creationParams = this.getRequiredContext<CreateCharacterParams>(
        context,
        'character:creation:params'
      );

      const race = creationParams.race;
      const racialMods = RACIAL_MODIFIERS[race] || {};

      // Apply racial modifiers
      const adjustedScores: AbilityScores = {
        strength: this.applyModifier(baseScores.strength, racialMods.strength),
        dexterity: this.applyModifier(baseScores.dexterity, racialMods.dexterity),
        constitution: this.applyModifier(baseScores.constitution, racialMods.constitution),
        intelligence: this.applyModifier(baseScores.intelligence, racialMods.intelligence),
        wisdom: this.applyModifier(baseScores.wisdom, racialMods.wisdom),
        charisma: this.applyModifier(baseScores.charisma, racialMods.charisma),
      };

      // Ensure scores don't go below 3 or above 18 (some exceptions may apply)
      const finalScores = this.enforceAbilityLimits(adjustedScores);

      // Store the racially-adjusted scores (use existing key for now)
      this.setContext(context, 'character:creation:ability-scores', finalScores);

      const modifierSummary = this.createModifierSummary(race, racialMods);

      return this.createSuccessResult(`Applied ${race} racial modifiers to ability scores`, {
        race,
        baseScores,
        adjustedScores: finalScores,
        modifiers: racialMods,
        summary: modifierSummary,
        effects: [modifierSummary],
      });
    } catch (error) {
      return this.createFailureResult(
        `Failed to apply racial ability adjustments: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  canApply(context: GameContext, command: Command): boolean {
    // Only applies to character creation commands
    if (command.type !== COMMAND_TYPES.CREATE_CHARACTER) {
      return false;
    }

    // Must have base ability scores from previous rule
    const baseScores = this.getOptionalContext<AbilityScores>(
      context,
      'character:creation:ability-scores'
    );

    return baseScores !== null;
  }

  getPrerequisites(): string[] {
    return [RULE_NAMES.ABILITY_SCORE_GENERATION];
  }

  /**
   * Apply a racial modifier to an ability score
   */
  private applyModifier(baseScore: number, modifier?: number): number {
    if (modifier === undefined) {
      return baseScore;
    }
    return baseScore + modifier;
  }

  /**
   * Enforce ability score limits (3-18 normally, with some racial exceptions)
   */
  private enforceAbilityLimits(scores: AbilityScores): AbilityScores {
    const enforceLimit = (score: number): number => {
      return Math.max(3, Math.min(18, score));
    };

    return {
      strength: enforceLimit(scores.strength),
      dexterity: enforceLimit(scores.dexterity),
      constitution: enforceLimit(scores.constitution),
      intelligence: enforceLimit(scores.intelligence),
      wisdom: enforceLimit(scores.wisdom),
      charisma: enforceLimit(scores.charisma),
    };
  }

  /**
   * Create a human-readable summary of applied modifiers
   */
  private createModifierSummary(race: CharacterRace, modifiers: RacialModifiers): string {
    const mods: string[] = [];

    for (const [ability, modifier] of Object.entries(modifiers)) {
      if (modifier !== undefined && modifier !== 0) {
        const sign = modifier > 0 ? '+' : '';
        mods.push(`${ability} ${sign}${modifier}`);
      }
    }

    if (mods.length === 0) {
      return `${race} receive no racial ability score modifiers`;
    }

    return `${race} racial modifiers: ${mods.join(', ')}`;
  }
}
