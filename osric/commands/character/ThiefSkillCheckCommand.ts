/**
 * ThiefSkillCheckCommand - OSRIC Thief Skills Check
 *
 * Handles all thief skill checks according to OSRIC rules:
 * - Pick Locks
 * - Find/Remove Traps
 * - Move Silently
 * - Hide in Shadows
 * - Hear Noise
 * - Climb Walls
 * - Read Languages
 *
 * PRESERVATION: All OSRIC thief skill mechanics and progression preserved exactly.
 */

import { BaseCommand, type CommandResult } from '../../core/Command';
import type { GameContext } from '../../core/GameContext';
import { COMMAND_TYPES } from '../../types/constants';
import type { Character } from '../../types/entities';

export interface ThiefSkillCheckParameters {
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
    difficulty?: 'easy' | 'normal' | 'hard' | 'very-hard'; // Difficulty modifiers
    equipment?: number; // Equipment bonus/penalty
    lighting?: 'bright' | 'dim' | 'dark' | 'pitch-black'; // Lighting conditions
    time?: 'rushed' | 'normal' | 'careful'; // Time taken
    noise?: 'silent' | 'quiet' | 'normal' | 'loud'; // Ambient noise (for hearing)
    surface?: 'easy' | 'normal' | 'difficult' | 'treacherous'; // Climbing surface
  };
  targetDifficulty?: number; // Override base percentage for specific scenarios
}

export class ThiefSkillCheckCommand extends BaseCommand {
  readonly type = COMMAND_TYPES.THIEF_SKILL_CHECK;

  constructor(private parameters: ThiefSkillCheckParameters) {
    super(parameters.characterId);
  }

  async execute(context: GameContext): Promise<CommandResult> {
    try {
      const { characterId, skillType, situationalModifiers, targetDifficulty } = this.parameters;

      // Get the character
      const character = context.getEntity<Character>(characterId);
      if (!character) {
        return this.createFailureResult(`Character with ID "${characterId}" not found`);
      }

      // Validate character is a thief or has thief abilities
      if (!this.canUseThiefSkills(character)) {
        return this.createFailureResult(
          `${character.name} does not have thief skills (must be Thief, Assassin, or multi-class with Thief)`
        );
      }

      // Set up temporary data for rules processing
      context.setTemporary('thief-skill-params', this.parameters);

      // Get base skill percentage for this character and skill
      const baseSkillPercent = this.getBaseSkillPercentage(character, skillType);

      // Apply situational modifiers
      const modifiedSkillPercent = this.applyModifiers(
        baseSkillPercent,
        situationalModifiers,
        skillType
      );

      // Use target difficulty if provided, otherwise use modified percentage
      const finalSkillPercent = targetDifficulty ?? modifiedSkillPercent;

      // Roll percentile dice (1d100)
      const roll = Math.floor(Math.random() * 100) + 1;
      const success = roll <= finalSkillPercent;

      // Create detailed result
      const modifierDescriptions = this.getModifierDescriptions(situationalModifiers, skillType);

      return this.createSuccessResult(
        `${character.name} ${success ? 'succeeded' : 'failed'} ${skillType} check (rolled ${roll} vs ${finalSkillPercent}%)`,
        {
          characterId,
          skillType,
          roll,
          targetNumber: finalSkillPercent,
          baseSkillPercent,
          modifiedSkillPercent,
          success,
          modifiers: modifierDescriptions,
          criticalFailure: roll === 100,
          criticalSuccess: roll === 1,
        }
      );
    } catch (error) {
      return this.createFailureResult(
        `Failed to perform thief skill check: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  canExecute(context: GameContext): boolean {
    if (!this.validateEntities(context)) {
      return false;
    }

    // Additional validation: check if character can use thief skills
    const character = context.getEntity<Character>(this.parameters.characterId);
    if (!character) {
      return false;
    }

    return this.canUseThiefSkills(character);
  }

  getRequiredRules(): string[] {
    return ['thief-skills'];
  }

  /**
   * Check if character can use thief skills
   */
  private canUseThiefSkills(character: Character): boolean {
    const characterClass = character.class.toLowerCase();

    // Pure thief or assassin classes
    if (characterClass === 'thief' || characterClass === 'assassin') {
      return true;
    }

    // Multi-class characters with thief
    if (characterClass.includes('thief')) {
      return true;
    }

    return false;
  }

  /**
   * Get base skill percentage for character and skill type
   */
  private getBaseSkillPercentage(character: Character, skillType: string): number {
    const level = character.experience.level;
    const characterClass = character.class.toLowerCase();

    // OSRIC thief skill progression table
    const thiefSkillTable: Record<string, number[]> = {
      'pick-locks': [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80],
      'find-traps': [20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90],
      'move-silently': [15, 21, 27, 33, 40, 47, 55, 62, 70, 78, 85, 93, 99, 99, 99],
      'hide-shadows': [10, 15, 20, 25, 31, 37, 43, 49, 56, 63, 70, 77, 85, 93, 99],
      'hear-noise': [10, 10, 15, 15, 20, 20, 25, 25, 30, 30, 35, 35, 40, 40, 50],
      'climb-walls': [85, 86, 87, 88, 90, 92, 94, 96, 98, 99, 99, 99, 99, 99, 99],
      'read-languages': [0, 0, 0, 0, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70],
    };

    // Get base percentage from table (levels 1-15, capped at 15)
    const tableLevel = Math.min(level, 15);
    const skillProgression = thiefSkillTable[skillType];

    if (!skillProgression) {
      return 0; // Unknown skill type
    }

    let basePercent = skillProgression[tableLevel - 1] || 0;

    // Apply racial modifiers
    basePercent += this.getRacialModifier(character, skillType);

    // Apply dexterity modifiers for relevant skills
    if (this.isDexterityBasedSkill(skillType)) {
      basePercent += this.getDexterityModifier(character.abilities.dexterity);
    }

    // Assassins have different progression for some skills
    if (characterClass === 'assassin') {
      basePercent = this.getAssassinSkillModifier(basePercent, skillType);
    }

    // Multi-class penalty
    if (characterClass.includes('/')) {
      basePercent = Math.floor(basePercent * 0.8); // 20% penalty for multi-class
    }

    return Math.max(0, Math.min(99, basePercent)); // Cap between 0-99%
  }

  /**
   * Apply situational modifiers to skill check
   */
  private applyModifiers(
    basePercent: number,
    modifiers: ThiefSkillCheckParameters['situationalModifiers'],
    skillType: string
  ): number {
    let modifiedPercent = basePercent;

    if (!modifiers) return modifiedPercent;

    // Difficulty modifiers
    if (modifiers.difficulty) {
      const difficultyMod = {
        easy: +20,
        normal: 0,
        hard: -20,
        'very-hard': -40,
      }[modifiers.difficulty];
      modifiedPercent += difficultyMod;
    }

    // Equipment modifiers
    if (modifiers.equipment) {
      modifiedPercent += modifiers.equipment;
    }

    // Time modifiers
    if (modifiers.time) {
      const timeMod = {
        rushed: -20,
        normal: 0,
        careful: +10,
      }[modifiers.time];
      modifiedPercent += timeMod;
    }

    // Skill-specific modifiers
    modifiedPercent += this.getSkillSpecificModifiers(modifiers, skillType);

    return Math.max(1, Math.min(99, modifiedPercent)); // Always 1-99% chance
  }

  /**
   * Get skill-specific modifiers
   */
  private getSkillSpecificModifiers(
    modifiers: ThiefSkillCheckParameters['situationalModifiers'],
    skillType: string
  ): number {
    let modifier = 0;

    // Lighting effects on stealth skills
    if ((skillType === 'move-silently' || skillType === 'hide-shadows') && modifiers?.lighting) {
      const lightingMod = {
        bright: -10,
        dim: 0,
        dark: +10,
        'pitch-black': +20,
      }[modifiers.lighting];
      modifier += lightingMod;
    }

    // Noise effects on hearing
    if (skillType === 'hear-noise' && modifiers?.noise) {
      const noiseMod = {
        silent: +20,
        quiet: +10,
        normal: 0,
        loud: -20,
      }[modifiers.noise];
      modifier += noiseMod;
    }

    // Surface effects on climbing
    if (skillType === 'climb-walls' && modifiers?.surface) {
      const surfaceMod = {
        easy: +10,
        normal: 0,
        difficult: -15,
        treacherous: -30,
      }[modifiers.surface];
      modifier += surfaceMod;
    }

    return modifier;
  }

  /**
   * Get racial modifiers for thief skills
   */
  private getRacialModifier(character: Character, skillType: string): number {
    const race = character.race.toLowerCase();

    // OSRIC racial thief skill modifiers
    const racialModifiers: Record<string, Record<string, number>> = {
      halfling: {
        'move-silently': +5,
        'hide-shadows': +5,
        'hear-noise': +5,
        'pick-locks': +5,
      },
      elf: {
        'move-silently': +5,
        'hide-shadows': +10,
        'hear-noise': +5,
      },
      'half-elf': {
        'move-silently': +10,
        'hide-shadows': +5,
        'hear-noise': +5,
      },
    };

    return racialModifiers[race]?.[skillType] || 0;
  }

  /**
   * Check if skill is dexterity-based
   */
  private isDexterityBasedSkill(skillType: string): boolean {
    return ['pick-locks', 'move-silently', 'hide-shadows'].includes(skillType);
  }

  /**
   * Get dexterity modifier for thief skills
   */
  private getDexterityModifier(dexterity: number): number {
    // OSRIC dexterity adjustments to thief skills
    if (dexterity >= 17) return +15;
    if (dexterity >= 16) return +10;
    if (dexterity >= 15) return +5;
    if (dexterity >= 9) return 0;
    if (dexterity >= 8) return -10;
    if (dexterity >= 7) return -15;
    return -20;
  }

  /**
   * Apply assassin-specific skill modifiers
   */
  private getAssassinSkillModifier(basePercent: number, skillType: string): number {
    // Assassins have different progression for some skills
    switch (skillType) {
      case 'move-silently':
      case 'hide-shadows':
        return Math.floor(basePercent * 1.1); // 10% bonus
      case 'climb-walls':
        return Math.floor(basePercent * 0.9); // 10% penalty
      default:
        return basePercent;
    }
  }

  /**
   * Get descriptions of applied modifiers
   */
  private getModifierDescriptions(
    modifiers: ThiefSkillCheckParameters['situationalModifiers'],
    skillType: string
  ): string[] {
    const descriptions: string[] = [];

    if (!modifiers) return descriptions;

    if (modifiers.difficulty && modifiers.difficulty !== 'normal') {
      descriptions.push(`Difficulty: ${modifiers.difficulty}`);
    }

    if (modifiers.equipment) {
      descriptions.push(`Equipment: ${modifiers.equipment > 0 ? '+' : ''}${modifiers.equipment}%`);
    }

    if (modifiers.time && modifiers.time !== 'normal') {
      descriptions.push(`Time: ${modifiers.time}`);
    }

    if (modifiers.lighting && ['move-silently', 'hide-shadows'].includes(skillType)) {
      descriptions.push(`Lighting: ${modifiers.lighting}`);
    }

    if (modifiers.noise && skillType === 'hear-noise') {
      descriptions.push(`Noise level: ${modifiers.noise}`);
    }

    if (modifiers.surface && skillType === 'climb-walls') {
      descriptions.push(`Surface: ${modifiers.surface}`);
    }

    return descriptions;
  }
}
