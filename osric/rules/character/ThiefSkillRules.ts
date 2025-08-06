/**
 * ThiefSkillRules - OSRIC Thief Skills Rule Implementation
 *
 * Handles validation and processing of thief skill checks according to OSRIC rules.
 * PRESERVATION: All OSRIC thief skill mechanics and calculations preserved exactly.
 */

import type { Command } from '../../core/Command';
import type { GameContext } from '../../core/GameContext';
import { BaseRule, type RuleResult } from '../../core/Rule';
import { COMMAND_TYPES, RULE_NAMES } from '../../types/constants';
import type { Character } from '../../types/entities';

interface ThiefSkillCheckParameters {
  characterId: string;
  skillType:
    | 'pick-locks'
    | 'find-traps'
    | 'move-silently'
    | 'hide-shadows'
    | 'hear-noise'
    | 'climb-walls'
    | 'read-languages';
  situationalModifiers?: {
    difficulty?: 'easy' | 'normal' | 'hard' | 'very-hard';
    equipment?: number;
    lighting?: 'bright' | 'dim' | 'dark' | 'pitch-black';
    time?: 'rushed' | 'normal' | 'careful';
    noise?: 'silent' | 'quiet' | 'normal' | 'loud';
    surface?: 'easy' | 'normal' | 'difficult' | 'treacherous';
  };
  targetDifficulty?: number;
}

export class ThiefSkillRule extends BaseRule {
  readonly name = RULE_NAMES.THIEF_SKILLS;
  readonly priority = 500; // Normal priority for skill checks

  canApply(_context: GameContext, command: Command): boolean {
    return command.type === COMMAND_TYPES.THIEF_SKILL_CHECK;
  }

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const skillData = context.getTemporary<ThiefSkillCheckParameters>('thief-skill-params');

    if (!skillData) {
      return this.createFailureResult('No thief skill check data provided');
    }

    try {
      const character = context.getEntity<Character>(skillData.characterId);
      if (!character) {
        return this.createFailureResult(`Character ${skillData.characterId} not found`);
      }

      // Validate character can use thief skills
      const validationResult = this.validateThiefSkillUse(character, skillData.skillType);
      if (!validationResult.success) {
        return validationResult;
      }

      // Calculate skill success probability
      const skillCalculation = this.calculateSkillChance(character, skillData);

      // Apply any special rules or restrictions
      const specialRules = this.applySpecialRules(character, skillData, skillCalculation);

      return this.createSuccessResult('Thief skill validation complete', {
        characterId: skillData.characterId,
        skillType: skillData.skillType,
        baseChance: skillCalculation.baseChance,
        finalChance: skillCalculation.finalChance,
        modifiers: skillCalculation.modifiers,
        specialRules,
        canAttempt: validationResult.canAttempt,
        restrictions: validationResult.restrictions,
      });
    } catch (error) {
      return this.createFailureResult(
        `Failed to process thief skill rule: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Validate that character can use the specified thief skill
   */
  private validateThiefSkillUse(
    character: Character,
    skillType: string
  ): RuleResult & { canAttempt?: boolean; restrictions?: string[] } {
    const characterClass = character.class.toLowerCase();
    const level = character.experience.level;
    const restrictions: string[] = [];

    // Check if character has thief abilities
    const hasThiefSkills =
      characterClass === 'thief' ||
      characterClass === 'assassin' ||
      characterClass.includes('thief');

    if (!hasThiefSkills) {
      return {
        success: false,
        message: 'Character does not have thief skills',
        canAttempt: false,
      };
    }

    // Check level requirements for certain skills
    if (skillType === 'read-languages' && level < 4) {
      return {
        success: false,
        message: 'Read Languages skill requires level 4 or higher',
        canAttempt: false,
      };
    }

    // Check for class-specific restrictions
    if (characterClass === 'assassin') {
      // Assassins have some skill restrictions
      if (skillType === 'find-traps' && level < 3) {
        restrictions.push('Assassins cannot find traps until level 3');
      }
    }

    // Check for racial restrictions
    const race = character.race.toLowerCase();
    if (race === 'dwarf' && skillType === 'climb-walls') {
      restrictions.push('Dwarves have -10% penalty to climb walls due to their build');
    }

    return {
      success: true,
      message: 'Character can use thief skill',
      canAttempt: true,
      restrictions,
    };
  }

  /**
   * Calculate the base and modified skill chance
   */
  private calculateSkillChance(
    character: Character,
    skillData: ThiefSkillCheckParameters
  ): {
    baseChance: number;
    finalChance: number;
    modifiers: Array<{ source: string; modifier: number; description: string }>;
  } {
    const modifiers: Array<{ source: string; modifier: number; description: string }> = [];

    // Get base skill percentage from OSRIC tables
    const baseChance = this.getBaseSkillPercentage(character, skillData.skillType, modifiers);
    let finalChance = baseChance;

    // Apply situational modifiers
    if (skillData.situationalModifiers) {
      finalChance = this.applySituationalModifiers(
        finalChance,
        skillData.situationalModifiers,
        skillData.skillType,
        modifiers
      );
    }

    // Apply target difficulty override if provided
    if (skillData.targetDifficulty !== undefined) {
      modifiers.push({
        source: 'override',
        modifier: skillData.targetDifficulty - finalChance,
        description: `Target difficulty override: ${skillData.targetDifficulty}%`,
      });
      finalChance = skillData.targetDifficulty;
    }

    // Ensure final chance is within valid range (1-99%)
    finalChance = Math.max(1, Math.min(99, finalChance));

    return { baseChance, finalChance, modifiers };
  }

  /**
   * Get base skill percentage from OSRIC progression tables
   */
  private getBaseSkillPercentage(
    character: Character,
    skillType: string,
    modifiers: Array<{ source: string; modifier: number; description: string }>
  ): number {
    const level = Math.min(character.experience.level, 15); // Cap at level 15 for table
    const characterClass = character.class.toLowerCase();

    // OSRIC thief skill base percentages by level (1-15)
    const skillTables: Record<string, number[]> = {
      'pick-locks': [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80],
      'find-traps': [20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90],
      'move-silently': [15, 21, 27, 33, 40, 47, 55, 62, 70, 78, 85, 93, 99, 99, 99],
      'hide-shadows': [10, 15, 20, 25, 31, 37, 43, 49, 56, 63, 70, 77, 85, 93, 99],
      'hear-noise': [10, 10, 15, 15, 20, 20, 25, 25, 30, 30, 35, 35, 40, 40, 50],
      'climb-walls': [85, 86, 87, 88, 90, 92, 94, 96, 98, 99, 99, 99, 99, 99, 99],
      'read-languages': [0, 0, 0, 0, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70],
    };

    let basePercent = skillTables[skillType]?.[level - 1] || 0;

    // Apply racial modifiers
    const racialMod = this.getRacialModifier(character, skillType);
    if (racialMod !== 0) {
      modifiers.push({
        source: 'racial',
        modifier: racialMod,
        description: `${character.race} racial modifier`,
      });
      basePercent += racialMod;
    }

    // Apply ability score modifiers
    const abilityMod = this.getAbilityModifier(character, skillType);
    if (abilityMod !== 0) {
      modifiers.push({
        source: 'ability',
        modifier: abilityMod,
        description: 'Ability score modifier',
      });
      basePercent += abilityMod;
    }

    // Apply class-specific modifiers
    const classMod = this.getClassModifier(character, skillType);
    if (classMod !== 0) {
      modifiers.push({
        source: 'class',
        modifier: classMod,
        description: `${character.class} class modifier`,
      });
      basePercent += classMod;
    }

    // Multi-class penalty
    if (characterClass.includes('/')) {
      const penalty = Math.floor(basePercent * -0.2); // 20% penalty
      modifiers.push({
        source: 'multi-class',
        modifier: penalty,
        description: 'Multi-class penalty (-20%)',
      });
      basePercent += penalty;
    }

    return Math.max(0, basePercent);
  }

  /**
   * Apply situational modifiers to skill check
   */
  private applySituationalModifiers(
    baseChance: number,
    situationalMods: NonNullable<ThiefSkillCheckParameters['situationalModifiers']>,
    skillType: string,
    modifiers: Array<{ source: string; modifier: number; description: string }>
  ): number {
    let modifiedChance = baseChance;

    // Difficulty modifiers
    if (situationalMods.difficulty && situationalMods.difficulty !== 'normal') {
      const difficultyMods = {
        easy: 20,
        hard: -20,
        'very-hard': -40,
      };
      const mod = difficultyMods[situationalMods.difficulty as keyof typeof difficultyMods];
      if (mod) {
        modifiers.push({
          source: 'difficulty',
          modifier: mod,
          description: `${situationalMods.difficulty} difficulty`,
        });
        modifiedChance += mod;
      }
    }

    // Equipment modifiers
    if (situationalMods.equipment) {
      modifiers.push({
        source: 'equipment',
        modifier: situationalMods.equipment,
        description: 'Equipment bonus/penalty',
      });
      modifiedChance += situationalMods.equipment;
    }

    // Time modifiers
    if (situationalMods.time && situationalMods.time !== 'normal') {
      const timeMods = {
        rushed: -20,
        careful: 10,
      };
      const mod = timeMods[situationalMods.time as keyof typeof timeMods];
      if (mod) {
        modifiers.push({
          source: 'time',
          modifier: mod,
          description: `${situationalMods.time} time taken`,
        });
        modifiedChance += mod;
      }
    }

    // Skill-specific environmental modifiers
    modifiedChance += this.applyEnvironmentalModifiers(situationalMods, skillType, modifiers);

    return modifiedChance;
  }

  /**
   * Apply environmental modifiers specific to each skill
   */
  private applyEnvironmentalModifiers(
    situationalMods: NonNullable<ThiefSkillCheckParameters['situationalModifiers']>,
    skillType: string,
    modifiers: Array<{ source: string; modifier: number; description: string }>
  ): number {
    let environmentalMod = 0;

    // Lighting modifiers for stealth skills
    if (['move-silently', 'hide-shadows'].includes(skillType) && situationalMods.lighting) {
      const lightingMods = {
        bright: -10,
        dim: 0,
        dark: 10,
        'pitch-black': 20,
      };
      const mod = lightingMods[situationalMods.lighting];
      if (mod !== 0) {
        modifiers.push({
          source: 'lighting',
          modifier: mod,
          description: `${situationalMods.lighting} lighting`,
        });
        environmentalMod += mod;
      }
    }

    // Noise modifiers for hearing
    if (skillType === 'hear-noise' && situationalMods.noise) {
      const noiseMods = {
        silent: 20,
        quiet: 10,
        normal: 0,
        loud: -20,
      };
      const mod = noiseMods[situationalMods.noise];
      if (mod !== 0) {
        modifiers.push({
          source: 'noise',
          modifier: mod,
          description: `${situationalMods.noise} ambient noise`,
        });
        environmentalMod += mod;
      }
    }

    // Surface modifiers for climbing
    if (skillType === 'climb-walls' && situationalMods.surface) {
      const surfaceMods = {
        easy: 10,
        normal: 0,
        difficult: -15,
        treacherous: -30,
      };
      const mod = surfaceMods[situationalMods.surface];
      if (mod !== 0) {
        modifiers.push({
          source: 'surface',
          modifier: mod,
          description: `${situationalMods.surface} climbing surface`,
        });
        environmentalMod += mod;
      }
    }

    return environmentalMod;
  }

  /**
   * Get racial modifiers for thief skills
   */
  private getRacialModifier(character: Character, skillType: string): number {
    const race = character.race.toLowerCase();

    const racialMods: Record<string, Record<string, number>> = {
      halfling: {
        'move-silently': 5,
        'hide-shadows': 5,
        'hear-noise': 5,
        'pick-locks': 5,
      },
      elf: {
        'move-silently': 5,
        'hide-shadows': 10,
        'hear-noise': 5,
      },
      'half-elf': {
        'move-silently': 10,
        'hide-shadows': 5,
        'hear-noise': 5,
      },
      dwarf: {
        'climb-walls': -10, // Dwarves are poor climbers
      },
    };

    return racialMods[race]?.[skillType] || 0;
  }

  /**
   * Get ability score modifiers for thief skills
   */
  private getAbilityModifier(character: Character, skillType: string): number {
    // Dexterity affects most thief skills
    if (['pick-locks', 'move-silently', 'hide-shadows'].includes(skillType)) {
      return this.getDexterityModifier(character.abilities.dexterity);
    }

    // Intelligence affects read languages
    if (skillType === 'read-languages') {
      return this.getIntelligenceModifier(character.abilities.intelligence);
    }

    return 0;
  }

  /**
   * Get dexterity modifier for applicable skills
   */
  private getDexterityModifier(dexterity: number): number {
    if (dexterity >= 17) return 15;
    if (dexterity >= 16) return 10;
    if (dexterity >= 15) return 5;
    if (dexterity >= 9) return 0;
    if (dexterity >= 8) return -10;
    if (dexterity >= 7) return -15;
    return -20;
  }

  /**
   * Get intelligence modifier for read languages
   */
  private getIntelligenceModifier(intelligence: number): number {
    if (intelligence >= 17) return 10;
    if (intelligence >= 15) return 5;
    if (intelligence >= 13) return 0;
    if (intelligence >= 9) return 0;
    if (intelligence >= 7) return -5;
    return -10;
  }

  /**
   * Get class-specific modifiers
   */
  private getClassModifier(character: Character, skillType: string): number {
    const characterClass = character.class.toLowerCase();

    if (characterClass === 'assassin') {
      // Assassins get bonuses to stealth skills
      if (skillType === 'move-silently' || skillType === 'hide-shadows') {
        return Math.floor(character.experience.level * 0.5); // Small level-based bonus
      }
      // But penalty to climbing
      if (skillType === 'climb-walls') {
        return -5;
      }
    }

    return 0;
  }

  /**
   * Apply special rules for specific skills or situations
   */
  private applySpecialRules(
    character: Character,
    skillData: ThiefSkillCheckParameters,
    _skillCalculation: { baseChance: number; finalChance: number }
  ): string[] {
    const specialRules: string[] = [];

    // Level-based restrictions
    if (skillData.skillType === 'read-languages' && character.experience.level < 4) {
      specialRules.push('Read Languages requires level 4 minimum');
    }

    // Critical success/failure rules
    specialRules.push('Natural 1 always succeeds, natural 100 always fails');

    // Armor restrictions for some skills
    if (['move-silently', 'hide-shadows', 'climb-walls'].includes(skillData.skillType)) {
      specialRules.push('Heavy armor imposes penalties to this skill');
    }

    // Time requirements
    if (skillData.skillType === 'find-traps') {
      specialRules.push('Finding traps requires careful searching (1 turn per 10-foot area)');
    }

    if (skillData.skillType === 'pick-locks') {
      specialRules.push("Lock picking requires thieves' tools and takes 1-4 rounds");
    }

    return specialRules;
  }
}
