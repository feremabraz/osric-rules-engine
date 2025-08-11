import { createCharacterId } from '@osric/types';
import { CreateCharacterValidator } from '@osric/types';
import type {
  AbilityScores,
  Alignment,
  CharacterClass,
  Character as CharacterData,
  CharacterRace,
} from '@osric/types/character';
import { BaseCommand, type CommandResult } from '../../core/Command';
import type { GameContext } from '../../core/GameContext';
import { ValidationEngine, type ValidationRule } from '../../core/ValidationEngine';
import { COMMAND_TYPES, RULE_NAMES } from '../../types/constants';

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

export class CreateCharacterCommand extends BaseCommand<CreateCharacterParameters> {
  readonly type = COMMAND_TYPES.CREATE_CHARACTER;

  constructor(
    parameters: CreateCharacterParameters,
    actorId = 'game-master',
    targetIds: string[] = []
  ) {
    super(parameters, actorId, targetIds);
  }

  protected getValidationRules(): ValidationRule[] {
    // kept for backward compatibility; not used as we call centralized validator below
    return [];
  }

  protected validateParameters(): void {
    const result = CreateCharacterValidator.validate(
      this.parameters as unknown as Record<string, unknown>
    );
    if (!result.valid) {
      const errorMessages = result.errors.map((error) =>
        typeof error === 'string' ? error : error.message
      );
      throw new Error(`Parameter validation failed: ${errorMessages.join(', ')}`);
    }
  }

  async execute(context: GameContext): Promise<CommandResult> {
    try {
      // Validation is already done in constructor via super() call
      const characterId = createCharacterId(this.generateCharacterId());

      context.setTemporary('character:creation:context', { characterId });
      context.setTemporary('character:creation:params', { ...this.parameters });

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
      RULE_NAMES.ABILITY_SCORE_GENERATION,
      RULE_NAMES.RACIAL_ABILITIES,
      RULE_NAMES.CLASS_REQUIREMENTS,
      RULE_NAMES.CHARACTER_INITIALIZATION,
    ];
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
