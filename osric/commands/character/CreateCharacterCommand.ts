/**
 * CreateCharacterCommand - OSRIC Character Creation Command
 *
 * Implements the complete OSRIC character creation process including:
 * - Ability score generation (multiple methods)
 * - Racial adjustments and requirements validation
 * - Class requirement checking
 * - Multi-class validation
 * - Character data initialization
 *
 * PRESERVATION: All OSRIC character creation rules and values are preserved exactly.
 */

import { BaseCommand, type CommandResult } from '../../core/Command';
import type { GameContext } from '../../core/GameContext';
import { COMMAND_TYPES } from '../../types/constants';
import type {
  AbilityScores,
  Alignment,
  CharacterClass,
  Character as CharacterData,
  CharacterRace,
} from '../../types/entities';

export interface CreateCharacterParameters {
  name: string;
  race: CharacterRace;
  characterClass: CharacterClass;
  alignment: Alignment;
  abilityScoreMethod: 'standard3d6' | 'arranged3d6' | '4d6dropLowest';
  arrangedScores?: AbilityScores; // Only used with arranged methods
  background?: {
    age?: number;
    height?: string;
    weight?: string;
    hair?: string;
    eyes?: string;
  };
}

export class CreateCharacterCommand extends BaseCommand {
  readonly type = COMMAND_TYPES.CREATE_CHARACTER;

  constructor(
    private parameters: CreateCharacterParameters,
    actorId = 'game-master' // Usually GM creates characters
  ) {
    super(actorId);
  }

  async execute(context: GameContext): Promise<CommandResult> {
    try {
      // Validate basic parameters
      const validationResult = this.validateParameters();
      if (!validationResult.valid) {
        return this.createFailureResult(
          `Character creation failed: ${validationResult.errors.join(', ')}`
        );
      }

      // Create character through rule chain execution
      const characterId = this.generateCharacterId();

      // Store creation parameters in temporary context for rules to use
      context.setTemporary('character-creation', {
        characterId,
        ...this.parameters,
      });

      // Rules will be executed by RuleEngine:
      // 1. AbilityScoreGenerationRules - Generate/validate ability scores
      // 2. RacialAbilityRules - Apply racial adjustments
      // 3. ClassRequirementRules - Validate class requirements
      // 4. CharacterInitializationRules - Set up character data

      return this.createSuccessResult(`Character creation initiated for ${this.parameters.name}`, {
        characterId,
        characterName: this.parameters.name,
        race: this.parameters.race,
        characterClass: this.parameters.characterClass,
      });
    } catch (error) {
      return this.createFailureResult(
        `Character creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  canExecute(_context: GameContext): boolean {
    // Basic validation - detailed validation happens in execute()
    return this.parameters.name.length > 0;
  }

  getRequiredRules(): string[] {
    return [
      'ability-score-generation',
      'racial-ability-adjustments',
      'class-requirement-validation',
      'character-initialization',
    ];
  }

  private validateParameters(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate name
    if (!this.parameters.name || this.parameters.name.trim().length === 0) {
      errors.push('Character name is required');
    }

    if (this.parameters.name.length > 50) {
      errors.push('Character name must be 50 characters or less');
    }

    // Validate race
    const validRaces: CharacterRace[] = [
      'Human',
      'Dwarf',
      'Elf',
      'Gnome',
      'Half-Elf',
      'Halfling',
      'Half-Orc',
    ];
    if (!validRaces.includes(this.parameters.race)) {
      errors.push(`Invalid race: ${this.parameters.race}`);
    }

    // Validate class
    const validClasses: CharacterClass[] = [
      'Fighter',
      'Paladin',
      'Ranger',
      'Magic-User',
      'Illusionist',
      'Cleric',
      'Druid',
      'Thief',
      'Assassin',
    ];
    if (!validClasses.includes(this.parameters.characterClass)) {
      errors.push(`Invalid character class: ${this.parameters.characterClass}`);
    }

    // Validate alignment
    const validAlignments: Alignment[] = [
      'Lawful Good',
      'Lawful Neutral',
      'Lawful Evil',
      'Neutral Good',
      'True Neutral',
      'Neutral Evil',
      'Chaotic Good',
      'Chaotic Neutral',
      'Chaotic Evil',
    ];
    if (!validAlignments.includes(this.parameters.alignment)) {
      errors.push(`Invalid alignment: ${this.parameters.alignment}`);
    }

    // Validate ability score method
    const validMethods = ['standard3d6', 'arranged3d6', '4d6dropLowest'];
    if (!validMethods.includes(this.parameters.abilityScoreMethod)) {
      errors.push(`Invalid ability score generation method: ${this.parameters.abilityScoreMethod}`);
    }

    // If using arranged scores method, validate they're provided
    if (this.parameters.abilityScoreMethod === 'arranged3d6' && !this.parameters.arrangedScores) {
      errors.push('Arranged scores must be provided when using arranged3d6 generation method');
    }

    // Validate arranged scores if provided
    if (this.parameters.arrangedScores) {
      const scores = this.parameters.arrangedScores;
      const abilities: (keyof AbilityScores)[] = [
        'strength',
        'dexterity',
        'constitution',
        'intelligence',
        'wisdom',
        'charisma',
      ];

      for (const ability of abilities) {
        const score = scores[ability];
        if (typeof score !== 'number' || score < 3 || score > 18) {
          errors.push(`${ability} score must be between 3 and 18, got: ${score}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private generateCharacterId(): string {
    // Generate a unique character ID
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `char_${timestamp}_${random}`;
  }

  // Public getter for parameters (useful for rules)
  get creationParameters(): CreateCharacterParameters {
    return { ...this.parameters };
  }
}

/**
 * Helper function to create character creation commands
 */
export function createCharacter(parameters: CreateCharacterParameters): CreateCharacterCommand {
  return new CreateCharacterCommand(parameters);
}

/**
 * Pre-configured character creation templates for common OSRIC character types
 */
export const CharacterTemplates = {
  /**
   * Human Fighter - Classic warrior build
   */
  humanFighter: (name: string): CreateCharacterParameters => ({
    name,
    race: 'Human',
    characterClass: 'Fighter',
    alignment: 'Lawful Good',
    abilityScoreMethod: '4d6dropLowest',
  }),

  /**
   * Elf Fighter/Magic-User - Classic multi-class
   */
  elfFighterMagicUser: (name: string): CreateCharacterParameters => ({
    name,
    race: 'Elf',
    characterClass: 'Fighter', // Multi-class handling in rules
    alignment: 'Chaotic Good',
    abilityScoreMethod: '4d6dropLowest',
  }),

  /**
   * Halfling Thief - Sneaky scout
   */
  halflingThief: (name: string): CreateCharacterParameters => ({
    name,
    race: 'Halfling',
    characterClass: 'Thief',
    alignment: 'True Neutral',
    abilityScoreMethod: 'arranged3d6',
  }),

  /**
   * Human Cleric - Divine spellcaster
   */
  humanCleric: (name: string): CreateCharacterParameters => ({
    name,
    race: 'Human',
    characterClass: 'Cleric',
    alignment: 'Lawful Good',
    abilityScoreMethod: 'standard3d6',
  }),

  /**
   * Dwarf Fighter - Hardy warrior
   */
  dwarfFighter: (name: string): CreateCharacterParameters => ({
    name,
    race: 'Dwarf',
    characterClass: 'Fighter',
    alignment: 'Lawful Good',
    abilityScoreMethod: '4d6dropLowest',
  }),
};
