/**
 * ClassRequirementRules - OSRIC Character Class Requirements
 *
 * Migrated from rules/character/classRequirements.ts
 * PRESERVATION: All OSRIC class requirements and level limits preserved exactly
 */

import type { Command } from '@osric/core/Command';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';
import type { AbilityScores, CharacterClass, CharacterRace } from '@osric/types/entities';

interface CharacterCreationData {
  abilityScoreMethod: 'standard3d6' | 'arranged3d6' | '4d6dropLowest';
  race: CharacterRace;
  characterClass: CharacterClass;
  arrangedScores?: AbilityScores;
}

export class ClassRequirementRule extends BaseRule {
  readonly name = RULE_NAMES.CLASS_REQUIREMENTS;
  readonly priority = 25; // Execute after ability generation and racial adjustments

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const creationData = context.getTemporary('character-creation') as CharacterCreationData;
    const abilityScores = context.getTemporary('adjusted-ability-scores') as AbilityScores;

    if (!abilityScores || !creationData) {
      return this.createFailureResult('Missing ability scores or character creation data');
    }

    // Check class requirements
    const meetsRequirements = this.meetsClassRequirements(
      abilityScores,
      creationData.characterClass
    );

    if (!meetsRequirements) {
      const requirements = this.getClassRequirements(creationData.characterClass);
      return this.createFailureResult(
        `Character does not meet class requirements for ${creationData.characterClass}. Required: ${requirements}`,
        undefined,
        true // Critical failure - character creation should stop
      );
    }

    // Check racial level limits
    const levelLimits = this.getRacialLevelLimits(creationData.race, creationData.characterClass);

    return this.createSuccessResult(
      `Character meets requirements for ${creationData.characterClass}`,
      {
        characterClass: creationData.characterClass,
        race: creationData.race,
        abilityScores,
        levelLimits,
      }
    );
  }

  canApply(context: GameContext, command: Command): boolean {
    if (command.type !== COMMAND_TYPES.CREATE_CHARACTER) return false;

    const abilityScores = context.getTemporary('adjusted-ability-scores');
    const creationData = context.getTemporary('character-creation');

    return abilityScores != null && creationData != null;
  }

  /**
   * Check if ability scores meet class requirements
   * PRESERVED: Exact implementation from original rules/character/classRequirements.ts
   */
  private meetsClassRequirements(
    abilityScores: AbilityScores,
    characterClass: CharacterClass
  ): boolean {
    const requirements = CLASS_MINIMUM_SCORES[characterClass];
    if (!requirements) return false;

    return (
      abilityScores.strength >= requirements.strength &&
      abilityScores.dexterity >= requirements.dexterity &&
      abilityScores.constitution >= requirements.constitution &&
      abilityScores.intelligence >= requirements.intelligence &&
      abilityScores.wisdom >= requirements.wisdom &&
      abilityScores.charisma >= requirements.charisma
    );
  }

  /**
   * Get class requirements as human-readable string
   */
  private getClassRequirements(characterClass: CharacterClass): string {
    const req = CLASS_MINIMUM_SCORES[characterClass];
    if (!req) return 'Unknown';

    const parts: string[] = [];
    if (req.strength > 3) parts.push(`STR ${req.strength}+`);
    if (req.dexterity > 3) parts.push(`DEX ${req.dexterity}+`);
    if (req.constitution > 3) parts.push(`CON ${req.constitution}+`);
    if (req.intelligence > 3) parts.push(`INT ${req.intelligence}+`);
    if (req.wisdom > 3) parts.push(`WIS ${req.wisdom}+`);
    if (req.charisma > 3) parts.push(`CHA ${req.charisma}+`);

    return parts.join(', ');
  }

  /**
   * Get racial level limits for a character class
   * PRESERVED: Exact implementation from original
   */
  private getRacialLevelLimits(
    race: CharacterRace,
    characterClass: CharacterClass
  ): string | number {
    const raceData = RACIAL_LEVEL_LIMITS[race];
    if (!raceData) return 'Unlimited';

    const limit = raceData[characterClass];
    return limit || 'Prohibited';
  }
}

// ===== PRESERVED OSRIC DATA TABLES =====
// From original rules/character/classRequirements.ts

/**
 * Minimum ability scores required for each class
 * PRESERVED: Exact values from OSRIC (limited to defined CharacterClass types)
 */
const CLASS_MINIMUM_SCORES: Record<CharacterClass, AbilityScores> = {
  Fighter: {
    strength: 9,
    dexterity: 3,
    constitution: 3,
    intelligence: 3,
    wisdom: 3,
    charisma: 3,
  },
  Cleric: {
    strength: 3,
    dexterity: 3,
    constitution: 3,
    intelligence: 3,
    wisdom: 9,
    charisma: 3,
  },
  'Magic-User': {
    strength: 3,
    dexterity: 6,
    constitution: 3,
    intelligence: 9,
    wisdom: 3,
    charisma: 3,
  },
  Thief: {
    strength: 3,
    dexterity: 9,
    constitution: 3,
    intelligence: 3,
    wisdom: 3,
    charisma: 3,
  },
  Assassin: {
    strength: 12,
    dexterity: 12,
    constitution: 3,
    intelligence: 11,
    wisdom: 3,
    charisma: 3,
  },
  Druid: {
    strength: 3,
    dexterity: 3,
    constitution: 3,
    intelligence: 3,
    wisdom: 12,
    charisma: 15,
  },
  Illusionist: {
    strength: 3,
    dexterity: 16,
    constitution: 3,
    intelligence: 15,
    wisdom: 3,
    charisma: 3,
  },
  Paladin: {
    strength: 12,
    dexterity: 3,
    constitution: 9,
    intelligence: 9,
    wisdom: 13,
    charisma: 17,
  },
  Ranger: {
    strength: 13,
    dexterity: 6,
    constitution: 14,
    intelligence: 13,
    wisdom: 14,
    charisma: 3,
  },
  Monk: {
    strength: 15,
    dexterity: 15,
    constitution: 11,
    intelligence: 3,
    wisdom: 15,
    charisma: 3,
  },
};

/**
 * Racial level limits for each class combination
 * PRESERVED: Exact values from OSRIC (limited to defined CharacterClass types)
 * 'Unlimited' means no level restriction
 * Number means maximum level allowed
 * Missing entry means class is prohibited for that race
 */
const RACIAL_LEVEL_LIMITS: Record<
  CharacterRace,
  Partial<Record<CharacterClass, number | 'Unlimited'>>
> = {
  Human: {
    Fighter: 'Unlimited',
    Cleric: 'Unlimited',
    'Magic-User': 'Unlimited',
    Thief: 'Unlimited',
    Assassin: 'Unlimited',
    Druid: 'Unlimited',
    Illusionist: 'Unlimited',
    Paladin: 'Unlimited',
    Ranger: 'Unlimited',
  },
  Dwarf: {
    Fighter: 9,
    Cleric: 8,
    Thief: 'Unlimited',
    Assassin: 9,
  },
  Elf: {
    Fighter: 7,
    Cleric: 5,
    'Magic-User': 11,
    Thief: 'Unlimited',
    Assassin: 10,
    Ranger: 'Unlimited',
  },
  Gnome: {
    Fighter: 6,
    Cleric: 7,
    'Magic-User': 7,
    Thief: 'Unlimited',
    Assassin: 8,
    Illusionist: 'Unlimited',
  },
  'Half-Elf': {
    Fighter: 8,
    Cleric: 5,
    'Magic-User': 6,
    Thief: 'Unlimited',
    Assassin: 'Unlimited',
    Druid: 9,
    Ranger: 'Unlimited',
  },
  Halfling: {
    Fighter: 4,
    Cleric: 6,
    Thief: 'Unlimited',
    Druid: 6,
  },
  'Half-Orc': {
    Fighter: 10,
    Cleric: 4,
    Thief: 8,
    Assassin: 'Unlimited',
  },
};
