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
  arrangedScores?: AbilityScores;
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
    actorId = 'game-master'
  ) {
    super(actorId);
  }

  async execute(context: GameContext): Promise<CommandResult> {
    try {
      const validationResult = this.validateParameters();
      if (!validationResult.valid) {
        return this.createFailureResult(
          `Character creation failed: ${validationResult.errors.join(', ')}`
        );
      }

      const characterId = this.generateCharacterId();

      context.setTemporary('character-creation', {
        characterId,
        ...this.parameters,
      });

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

    if (!this.parameters.name || this.parameters.name.trim().length === 0) {
      errors.push('Character name is required');
    }

    if (this.parameters.name.length > 50) {
      errors.push('Character name must be 50 characters or less');
    }

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

    const validMethods = ['standard3d6', 'arranged3d6', '4d6dropLowest'];
    if (!validMethods.includes(this.parameters.abilityScoreMethod)) {
      errors.push(`Invalid ability score generation method: ${this.parameters.abilityScoreMethod}`);
    }

    if (this.parameters.abilityScoreMethod === 'arranged3d6' && !this.parameters.arrangedScores) {
      errors.push('Arranged scores must be provided when using arranged3d6 generation method');
    }

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
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `char_${timestamp}_${random}`;
  }

  get creationParameters(): CreateCharacterParameters {
    return { ...this.parameters };
  }
}

export function createCharacter(parameters: CreateCharacterParameters): CreateCharacterCommand {
  return new CreateCharacterCommand(parameters);
}

export const CharacterTemplates = {
  humanFighter: (name: string): CreateCharacterParameters => ({
    name,
    race: 'Human',
    characterClass: 'Fighter',
    alignment: 'Lawful Good',
    abilityScoreMethod: '4d6dropLowest',
  }),

  elfFighterMagicUser: (name: string): CreateCharacterParameters => ({
    name,
    race: 'Elf',
    characterClass: 'Fighter',
    alignment: 'Chaotic Good',
    abilityScoreMethod: '4d6dropLowest',
  }),

  halflingThief: (name: string): CreateCharacterParameters => ({
    name,
    race: 'Halfling',
    characterClass: 'Thief',
    alignment: 'True Neutral',
    abilityScoreMethod: 'arranged3d6',
  }),

  humanCleric: (name: string): CreateCharacterParameters => ({
    name,
    race: 'Human',
    characterClass: 'Cleric',
    alignment: 'Lawful Good',
    abilityScoreMethod: 'standard3d6',
  }),

  dwarfFighter: (name: string): CreateCharacterParameters => ({
    name,
    race: 'Dwarf',
    characterClass: 'Fighter',
    alignment: 'Lawful Good',
    abilityScoreMethod: '4d6dropLowest',
  }),
};
