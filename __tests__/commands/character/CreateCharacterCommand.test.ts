import { createStore } from 'jotai';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  CharacterTemplates,
  CreateCharacterCommand,
  type CreateCharacterParameters,
} from '../../../osric/commands/character/CreateCharacterCommand';
import { GameContext } from '../../../osric/core/GameContext';
import type { Alignment, CharacterClass, CharacterRace } from '../../../osric/types/entities';

type AbilityScoreMethod = 'standard3d6' | 'arranged3d6' | '4d6dropLowest';

describe('CreateCharacterCommand', () => {
  let context: GameContext;

  beforeEach(() => {
    const store = createStore();
    context = new GameContext(store);
  });

  describe('Parameter Validation', () => {
    it('should validate required character name', async () => {
      const command = new CreateCharacterCommand({
        name: '',
        race: 'Human',
        characterClass: 'Fighter',
        alignment: 'Lawful Good',
        abilityScoreMethod: 'standard3d6',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Character name is required');
    });

    it('should validate character name length', async () => {
      const longName = 'A'.repeat(51);
      const command = new CreateCharacterCommand({
        name: longName,
        race: 'Human',
        characterClass: 'Fighter',
        alignment: 'Lawful Good',
        abilityScoreMethod: 'standard3d6',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Character name must be 50 characters or less');
    });

    it('should validate OSRIC race support', async () => {
      const validRaces = ['Human', 'Dwarf', 'Elf', 'Gnome', 'Half-Elf', 'Halfling', 'Half-Orc'];

      for (const race of validRaces) {
        const command = new CreateCharacterCommand({
          name: 'Test Character',
          race: race as CharacterRace,
          characterClass: 'Fighter',
          alignment: 'Lawful Good',
          abilityScoreMethod: 'standard3d6',
        });

        const result = await command.execute(context);
        expect(result.success).toBe(true);
        expect(result.message).toContain('Character creation initiated');
      }
    });

    it('should reject invalid races', async () => {
      const command = new CreateCharacterCommand({
        name: 'Test Character',
        race: 'Dragon' as CharacterRace,
        characterClass: 'Fighter',
        alignment: 'Lawful Good',
        abilityScoreMethod: 'standard3d6',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid race: Dragon');
    });

    it('should validate OSRIC class support', async () => {
      const validClasses = [
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

      for (const characterClass of validClasses) {
        const command = new CreateCharacterCommand({
          name: 'Test Character',
          race: 'Human',
          characterClass: characterClass as CharacterClass,
          alignment: 'Lawful Good',
          abilityScoreMethod: 'standard3d6',
        });

        const result = await command.execute(context);
        expect(result.success).toBe(true);
        expect(result.message).toContain('Character creation initiated');
      }
    });

    it('should reject invalid classes', async () => {
      const command = new CreateCharacterCommand({
        name: 'Test Character',
        race: 'Human',
        characterClass: 'Wizard' as CharacterClass,
        alignment: 'Lawful Good',
        abilityScoreMethod: 'standard3d6',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid character class: Wizard');
    });

    it('should validate OSRIC alignment support', async () => {
      const validAlignments = [
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

      for (const alignment of validAlignments) {
        const command = new CreateCharacterCommand({
          name: 'Test Character',
          race: 'Human',
          characterClass: 'Fighter',
          alignment: alignment as Alignment,
          abilityScoreMethod: 'standard3d6',
        });

        const result = await command.execute(context);
        expect(result.success).toBe(true);
        expect(result.message).toContain('Character creation initiated');
      }
    });

    it('should reject invalid alignments', async () => {
      const command = new CreateCharacterCommand({
        name: 'Test Character',
        race: 'Human',
        characterClass: 'Fighter',
        alignment: 'Lawful Stupid' as Alignment,
        abilityScoreMethod: 'standard3d6',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid alignment: Lawful Stupid');
    });

    it('should validate ability score generation methods', async () => {
      const methodsWithoutArranged = ['standard3d6', '4d6dropLowest'];

      for (const method of methodsWithoutArranged) {
        const command = new CreateCharacterCommand({
          name: 'Test Character',
          race: 'Human',
          characterClass: 'Fighter',
          alignment: 'Lawful Good',
          abilityScoreMethod: method as AbilityScoreMethod,
        });

        const result = await command.execute(context);
        expect(result.success).toBe(true);
        expect(result.message).toContain('Character creation initiated');
      }

      const commandWithArranged = new CreateCharacterCommand({
        name: 'Test Character',
        race: 'Human',
        characterClass: 'Fighter',
        alignment: 'Lawful Good',
        abilityScoreMethod: 'arranged3d6',
        arrangedScores: {
          strength: 15,
          dexterity: 12,
          constitution: 14,
          intelligence: 10,
          wisdom: 13,
          charisma: 8,
        },
      });

      const result = await commandWithArranged.execute(context);
      expect(result.success).toBe(true);
      expect(result.message).toContain('Character creation initiated');
    });

    it('should require arranged scores for arranged3d6 method', async () => {
      const command = new CreateCharacterCommand({
        name: 'Test Character',
        race: 'Human',
        characterClass: 'Fighter',
        alignment: 'Lawful Good',
        abilityScoreMethod: 'arranged3d6',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(false);
      expect(result.message).toContain(
        'Arranged scores must be provided when using arranged3d6 generation method'
      );
    });

    it('should validate arranged ability scores range', async () => {
      const command = new CreateCharacterCommand({
        name: 'Test Character',
        race: 'Human',
        characterClass: 'Fighter',
        alignment: 'Lawful Good',
        abilityScoreMethod: 'arranged3d6',
        arrangedScores: {
          strength: 25,
          dexterity: 12,
          constitution: 14,
          intelligence: 10,
          wisdom: 13,
          charisma: 8,
        },
      });

      const result = await command.execute(context);
      expect(result.success).toBe(false);
      expect(result.message).toContain('strength score must be between 3 and 18');
    });
  });

  describe('Command Execution', () => {
    it('should execute successfully with valid parameters', async () => {
      const command = new CreateCharacterCommand({
        name: 'Sir Validus',
        race: 'Human',
        characterClass: 'Fighter',
        alignment: 'Lawful Good',
        abilityScoreMethod: 'standard3d6',
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);
      expect(result.message).toContain('Character creation initiated for Sir Validus');
      expect(result.data).toMatchObject({
        characterName: 'Sir Validus',
        race: 'Human',
        characterClass: 'Fighter',
      });
    });

    it('should store creation parameters in context', async () => {
      const parameters = {
        name: 'Test Character',
        race: 'Elf' as const,
        characterClass: 'Magic-User' as const,
        alignment: 'Chaotic Good' as const,
        abilityScoreMethod: '4d6dropLowest' as const,
      };

      const command = new CreateCharacterCommand(parameters);
      const result = await command.execute(context);

      expect(result.success).toBe(true);

      const storedData = context.getTemporary('character-creation');
      expect(storedData).toMatchObject(parameters);
      expect(storedData).toHaveProperty('characterId');
    });

    it('should generate unique character IDs', async () => {
      const command1 = new CreateCharacterCommand({
        name: 'Character One',
        race: 'Human',
        characterClass: 'Fighter',
        alignment: 'Lawful Good',
        abilityScoreMethod: 'standard3d6',
      });

      const command2 = new CreateCharacterCommand({
        name: 'Character Two',
        race: 'Human',
        characterClass: 'Fighter',
        alignment: 'Lawful Good',
        abilityScoreMethod: 'standard3d6',
      });

      await command1.execute(context);
      const data1 = context.getTemporary('character-creation') as CreateCharacterParameters & {
        characterId: string;
      };

      context.setTemporary('character-creation', null);

      await command2.execute(context);
      const data2 = context.getTemporary('character-creation') as CreateCharacterParameters & {
        characterId: string;
      };

      expect(data1.characterId).not.toBe(data2.characterId);
    });

    it('should handle arranged scores properly', async () => {
      const arrangedScores = {
        strength: 16,
        dexterity: 14,
        constitution: 15,
        intelligence: 12,
        wisdom: 13,
        charisma: 10,
      };

      const command = new CreateCharacterCommand({
        name: 'Arranged Character',
        race: 'Human',
        characterClass: 'Fighter',
        alignment: 'Lawful Good',
        abilityScoreMethod: 'arranged3d6',
        arrangedScores,
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);

      const data = context.getTemporary('character-creation') as CreateCharacterParameters & {
        characterId: string;
      };
      expect(data.arrangedScores).toEqual(arrangedScores);
    });
  });

  describe('OSRIC Character Templates', () => {
    it('should provide human fighter template', () => {
      const template = CharacterTemplates.humanFighter('Test Fighter');

      expect(template).toMatchObject({
        name: 'Test Fighter',
        race: 'Human',
        characterClass: 'Fighter',
        alignment: 'Lawful Good',
        abilityScoreMethod: '4d6dropLowest',
      });
    });

    it('should provide elf fighter/magic-user template', () => {
      const template = CharacterTemplates.elfFighterMagicUser('Test Elf');

      expect(template).toMatchObject({
        name: 'Test Elf',
        race: 'Elf',
        characterClass: 'Fighter',
        alignment: 'Chaotic Good',
        abilityScoreMethod: '4d6dropLowest',
      });
    });

    it('should provide halfling thief template', () => {
      const template = CharacterTemplates.halflingThief('Test Halfling');

      expect(template).toMatchObject({
        name: 'Test Halfling',
        race: 'Halfling',
        characterClass: 'Thief',
        alignment: 'True Neutral',
        abilityScoreMethod: 'arranged3d6',
      });
    });

    it('should provide dwarf fighter template', () => {
      const template = CharacterTemplates.dwarfFighter('Test Dwarf');

      expect(template).toMatchObject({
        name: 'Test Dwarf',
        race: 'Dwarf',
        characterClass: 'Fighter',
        alignment: 'Lawful Good',
        abilityScoreMethod: '4d6dropLowest',
      });
    });

    it('should provide human cleric template', () => {
      const template = CharacterTemplates.humanCleric('Test Cleric');

      expect(template).toMatchObject({
        name: 'Test Cleric',
        race: 'Human',
        characterClass: 'Cleric',
        alignment: 'Lawful Good',
        abilityScoreMethod: 'standard3d6',
      });
    });
  });

  describe('Command Properties', () => {
    it('should have correct command type', () => {
      const command = new CreateCharacterCommand({
        name: 'Test',
        race: 'Human',
        characterClass: 'Fighter',
        alignment: 'Lawful Good',
        abilityScoreMethod: 'standard3d6',
      });

      expect(command.type).toBe('create-character');
    });

    it('should provide required rules list', () => {
      const command = new CreateCharacterCommand({
        name: 'Test',
        race: 'Human',
        characterClass: 'Fighter',
        alignment: 'Lawful Good',
        abilityScoreMethod: 'standard3d6',
      });

      const requiredRules = command.getRequiredRules();
      expect(requiredRules).toContain('ability-score-generation');
      expect(requiredRules).toContain('racial-ability-adjustments');
      expect(requiredRules).toContain('class-requirement-validation');
      expect(requiredRules).toContain('character-initialization');
    });

    it('should allow access to creation parameters', () => {
      const parameters = {
        name: 'Test Character',
        race: 'Human' as const,
        characterClass: 'Fighter' as const,
        alignment: 'Lawful Good' as const,
        abilityScoreMethod: 'standard3d6' as const,
      };

      const command = new CreateCharacterCommand(parameters);
      expect(command.creationParameters).toEqual(parameters);
    });

    it('should validate canExecute with name check', () => {
      const validCommand = new CreateCharacterCommand({
        name: 'Valid Name',
        race: 'Human',
        characterClass: 'Fighter',
        alignment: 'Lawful Good',
        abilityScoreMethod: 'standard3d6',
      });

      const invalidCommand = new CreateCharacterCommand({
        name: '',
        race: 'Human',
        characterClass: 'Fighter',
        alignment: 'Lawful Good',
        abilityScoreMethod: 'standard3d6',
      });

      expect(validCommand.canExecute(context)).toBe(true);
      expect(invalidCommand.canExecute(context)).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle multiple validation errors', async () => {
      const command = new CreateCharacterCommand({
        name: '',
        race: 'InvalidRace' as CharacterRace,
        characterClass: 'InvalidClass' as CharacterClass,
        alignment: 'Lawful Good',
        abilityScoreMethod: 'invalidMethod' as AbilityScoreMethod,
      });

      const result = await command.execute(context);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Character name is required');
      expect(result.message).toContain('Invalid race');
      expect(result.message).toContain('Invalid character class');
      expect(result.message).toContain('Invalid ability score generation method');
    });

    it('should handle exceptions gracefully', async () => {
      const command = new CreateCharacterCommand({
        name: 'Test Character',
        race: 'Human',
        characterClass: 'Fighter',
        alignment: 'Lawful Good',
        abilityScoreMethod: 'arranged3d6',
        arrangedScores: {
          strength: -5,
          dexterity: 12,
          constitution: 14,
          intelligence: 10,
          wisdom: 13,
          charisma: 8,
        },
      });

      const result = await command.execute(context);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Character creation failed');
    });
  });
});
