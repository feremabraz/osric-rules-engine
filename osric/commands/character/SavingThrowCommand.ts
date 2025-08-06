import { BaseCommand, type CommandResult } from '../../core/Command';
import type { GameContext } from '../../core/GameContext';
import { COMMAND_TYPES } from '../../types/constants';
import type { Character } from '../../types/entities';

export interface SavingThrowParameters {
  characterId: string;
  saveType:
    | 'paralyzation-poison-death'
    | 'petrification-polymorph'
    | 'rod-staff-wand'
    | 'breath-weapon'
    | 'spell';
  situationalModifiers?: {
    magicItemBonus?: number;
    spellBonus?: number;
    classBonus?: number;
    racialBonus?: number;
    wisdomBonus?: number;
    dexterityBonus?: number;
    constitution?: number;
    difficulty?: 'easy' | 'normal' | 'hard' | 'very-hard';
  };
  targetNumber?: number;
  description?: string;
}

export class SavingThrowCommand extends BaseCommand {
  readonly type = COMMAND_TYPES.SAVING_THROW;

  constructor(private parameters: SavingThrowParameters) {
    super(parameters.characterId);
  }

  async execute(context: GameContext): Promise<CommandResult> {
    try {
      const { characterId, saveType, situationalModifiers, targetNumber, description } =
        this.parameters;

      const validSaveTypes = [
        'paralyzation-poison-death',
        'petrification-polymorph',
        'rod-staff-wand',
        'breath-weapon',
        'spell',
      ];
      if (!validSaveTypes.includes(saveType)) {
        return this.createFailureResult(`Invalid save type: ${saveType}`);
      }

      if (situationalModifiers) {
        if (situationalModifiers.magicItemBonus !== undefined) {
          if (
            situationalModifiers.magicItemBonus < -10 ||
            situationalModifiers.magicItemBonus > 10
          ) {
            return this.createFailureResult('Magic item bonus must be between -10 and +10');
          }
        }
      }

      if (targetNumber !== undefined) {
        if (targetNumber < 2 || targetNumber > 20) {
          return this.createFailureResult('Target number must be between 2 and 20');
        }
      }

      const character = context.getEntity<Character>(characterId);
      if (!character) {
        return this.createFailureResult(`Character with ID "${characterId}" not found`);
      }

      if (character.hitPoints.current <= 0) {
        return this.createFailureResult('Cannot make saving throws while unconscious or dead');
      }

      context.setTemporary('saving-throw-params', this.parameters);

      const baseSaveNumber = this.getBaseSavingThrow(character, saveType);

      const modifiedSaveNumber = this.applyModifiers(
        baseSaveNumber,
        situationalModifiers,
        saveType,
        character
      );

      const finalSaveNumber = targetNumber ?? modifiedSaveNumber;

      const roll = Math.floor(Math.random() * 20) + 1;
      const success = roll >= finalSaveNumber;

      const modifierDescriptions = this.getModifierDescriptions(situationalModifiers, saveType);
      const saveDescription = description || this.getSaveTypeDescription(saveType);
      const isMultiClass = character.classes && Object.keys(character.classes).length > 1;

      return this.createSuccessResult(
        `${character.name} ${success ? 'succeeded' : 'failed'} ${saveDescription} saving throw (rolled ${roll} vs ${finalSaveNumber})`,
        {
          characterId,
          characterClass: character.class,
          saveType,
          roll,
          targetNumber: finalSaveNumber,
          baseSaveNumber,
          modifiedSaveNumber,
          success,
          modifiers: modifierDescriptions,
          isMultiClass,
          specialAbilities: this.getSpecialAbilities(character),
          racialBonuses: this.getRacialBonuses(character),
          abilityModifiers: this.getAbilityModifierNames(character, saveType),
          difficulty: situationalModifiers?.difficulty,
          criticalFailure: roll === 1,
          criticalSuccess: roll === 20,
          description: saveDescription,
        }
      );
    } catch (error) {
      return this.createFailureResult(
        `Failed to perform saving throw: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  canExecute(context: GameContext): boolean {
    return this.validateEntities(context);
  }

  getRequiredRules(): string[] {
    return ['saving-throws'];
  }

  private getBaseSavingThrow(character: Character, saveType: string): number {
    const level = character.experience.level;
    const characterClass = character.class.toLowerCase();

    return this.getSavingThrowByClass(characterClass, level, saveType);
  }

  private getSavingThrowByClass(characterClass: string, level: number, saveType: string): number {
    if (characterClass.includes('/')) {
      const classes = characterClass.split('/');
      const saves = classes.map((cls) => this.getSingleClassSave(cls.trim(), level, saveType));
      return Math.min(...saves);
    }

    return this.getSingleClassSave(characterClass, level, saveType);
  }

  private getSingleClassSave(characterClass: string, level: number, saveType: string): number {
    const savingThrowTables: Record<string, Record<string, number[]>> = {
      fighter: {
        'paralyzation-poison-death': [
          16, 15, 15, 13, 13, 11, 11, 10, 10, 8, 8, 7, 7, 5, 5, 4, 4, 3,
        ],
        'petrification-polymorph': [17, 16, 16, 14, 14, 12, 12, 11, 11, 9, 9, 8, 8, 6, 6, 5, 5, 4],
        'rod-staff-wand': [17, 16, 16, 14, 14, 12, 12, 11, 11, 9, 9, 8, 8, 6, 6, 5, 5, 4],
        'breath-weapon': [20, 19, 19, 17, 17, 15, 15, 14, 14, 12, 12, 11, 11, 9, 9, 8, 8, 7],
        spell: [19, 18, 18, 16, 16, 14, 14, 13, 13, 11, 11, 10, 10, 8, 8, 7, 7, 6],
      },
      cleric: {
        'paralyzation-poison-death': [10, 9, 9, 7, 7, 6, 6, 5, 5, 4, 4, 3, 3, 2, 2, 2, 2, 2],
        'petrification-polymorph': [13, 12, 12, 10, 10, 9, 9, 8, 8, 7, 7, 6, 6, 5, 5, 4, 4, 4],
        'rod-staff-wand': [16, 15, 15, 13, 13, 12, 12, 11, 11, 10, 10, 9, 9, 8, 8, 7, 7, 7],
        'breath-weapon': [16, 15, 15, 13, 13, 12, 12, 11, 11, 10, 10, 9, 9, 8, 8, 7, 7, 7],
        spell: [15, 14, 14, 12, 12, 11, 11, 10, 10, 9, 9, 8, 8, 7, 7, 6, 6, 6],
      },
      'magic-user': {
        'paralyzation-poison-death': [14, 13, 13, 11, 11, 10, 10, 8, 8, 7, 7, 5, 5, 4, 4, 3, 3, 3],
        'petrification-polymorph': [13, 12, 12, 10, 10, 9, 9, 7, 7, 6, 6, 4, 4, 3, 3, 2, 2, 2],
        'rod-staff-wand': [11, 10, 10, 8, 8, 7, 7, 5, 5, 4, 4, 2, 2, 2, 2, 2, 2, 2],
        'breath-weapon': [16, 15, 15, 13, 13, 12, 12, 10, 10, 9, 9, 7, 7, 6, 6, 5, 5, 5],
        spell: [12, 11, 11, 9, 9, 8, 8, 6, 6, 5, 5, 3, 3, 2, 2, 2, 2, 2],
      },
      thief: {
        'paralyzation-poison-death': [13, 12, 12, 11, 11, 10, 10, 9, 9, 8, 8, 7, 7, 6, 6, 5, 5, 4],
        'petrification-polymorph': [12, 11, 11, 10, 10, 9, 9, 8, 8, 7, 7, 6, 6, 5, 5, 4, 4, 3],
        'rod-staff-wand': [14, 13, 13, 12, 12, 11, 11, 10, 10, 9, 9, 8, 8, 7, 7, 6, 6, 5],
        'breath-weapon': [16, 15, 15, 14, 14, 13, 13, 12, 12, 11, 11, 10, 10, 9, 9, 8, 8, 7],
        spell: [15, 14, 14, 13, 13, 12, 12, 11, 11, 10, 10, 9, 9, 8, 8, 7, 7, 6],
      },
    };

    let classTable = savingThrowTables[characterClass];

    if (!classTable) {
      if (characterClass === 'paladin' || characterClass === 'ranger') {
        classTable = savingThrowTables.fighter;
      } else if (characterClass === 'druid') {
        classTable = savingThrowTables.cleric;
      } else if (characterClass === 'illusionist') {
        classTable = savingThrowTables['magic-user'];
      } else if (characterClass === 'assassin') {
        classTable = savingThrowTables.thief;
      } else {
        classTable = savingThrowTables.fighter;
      }
    }

    const saveArray = classTable[saveType];
    if (!saveArray) {
      return 20;
    }

    const tableIndex = Math.min(level - 1, saveArray.length - 1);
    return saveArray[tableIndex];
  }

  private applyModifiers(
    baseSave: number,
    modifiers: SavingThrowParameters['situationalModifiers'],
    saveType: string,
    character: Character
  ): number {
    let modifiedSave = baseSave;

    if (!modifiers) return modifiedSave;

    if (modifiers.magicItemBonus) {
      modifiedSave += modifiers.magicItemBonus;
    }

    if (modifiers.spellBonus) {
      modifiedSave += modifiers.spellBonus;
    }

    if (modifiers.classBonus) {
      modifiedSave += modifiers.classBonus;
    }

    if (modifiers.racialBonus) {
      modifiedSave += modifiers.racialBonus;
    }

    modifiedSave += this.getAbilityModifiers(character, saveType, modifiers);

    if (modifiers.difficulty && modifiers.difficulty !== 'normal') {
      const difficultyMod = {
        easy: -2,
        hard: +2,
        'very-hard': +4,
      }[modifiers.difficulty];
      modifiedSave += difficultyMod;
    }

    return Math.max(2, Math.min(20, modifiedSave));
  }

  private getAbilityModifiers(
    character: Character,
    saveType: string,
    modifiers: SavingThrowParameters['situationalModifiers']
  ): number {
    let modifier = 0;

    if (saveType === 'paralyzation-poison-death') {
      const constitution = modifiers?.constitution ?? character.abilities.constitution;
      modifier += this.getConstitutionSaveBonus(constitution);
    }

    if (saveType === 'spell' || saveType === 'rod-staff-wand') {
      if (modifiers?.wisdomBonus) {
        modifier += modifiers.wisdomBonus;
      } else {
        modifier += this.getWisdomSaveBonus(character.abilities.wisdom);
      }
    }

    if (saveType === 'breath-weapon') {
      if (modifiers?.dexterityBonus) {
        modifier += modifiers.dexterityBonus;
      } else {
        modifier += this.getDexteritySaveBonus(character.abilities.dexterity);
      }
    }

    return modifier;
  }

  private getConstitutionSaveBonus(constitution: number): number {
    if (constitution >= 17) return -4;
    if (constitution >= 16) return -3;
    if (constitution >= 15) return -2;
    if (constitution >= 14) return -1;
    if (constitution >= 7) return 0;
    if (constitution >= 4) return +1;
    return +2;
  }

  private getWisdomSaveBonus(wisdom: number): number {
    if (wisdom >= 17) return -3;
    if (wisdom >= 15) return -2;
    if (wisdom >= 13) return -1;
    if (wisdom >= 6) return 0;
    if (wisdom >= 4) return +1;
    return +2;
  }

  private getDexteritySaveBonus(dexterity: number): number {
    if (dexterity >= 17) return -3;
    if (dexterity >= 15) return -2;
    if (dexterity >= 13) return -1;
    if (dexterity >= 6) return 0;
    if (dexterity >= 4) return +1;
    return +2;
  }

  private getModifierDescriptions(
    modifiers: SavingThrowParameters['situationalModifiers'],
    saveType: string
  ): string[] {
    const descriptions: string[] = [];

    if (!modifiers) return descriptions;

    if (modifiers.magicItemBonus) {
      descriptions.push('magic-item');
    }

    if (modifiers.spellBonus) {
      descriptions.push('spell');
    }

    if (modifiers.classBonus) {
      descriptions.push('class');
    }

    if (modifiers.racialBonus) {
      descriptions.push('racial');
    }

    if (modifiers.difficulty && modifiers.difficulty !== 'normal') {
      descriptions.push('difficulty');
    }

    if (saveType === 'paralyzation-poison-death' && modifiers.constitution) {
      descriptions.push('constitution');
    }

    if ((saveType === 'spell' || saveType === 'rod-staff-wand') && modifiers.wisdomBonus) {
      descriptions.push('wisdom');
    }

    if (saveType === 'breath-weapon' && modifiers.dexterityBonus) {
      descriptions.push('dexterity');
    }

    return descriptions;
  }

  private getSaveTypeDescription(saveType: string): string {
    const descriptions = {
      'paralyzation-poison-death': 'Paralyzation, Poison, or Death Magic',
      'petrification-polymorph': 'Petrification or Polymorph',
      'rod-staff-wand': 'Rod, Staff, or Wand',
      'breath-weapon': 'Breath Weapon',
      spell: 'Spell',
    };

    return descriptions[saveType as keyof typeof descriptions] || saveType;
  }

  private getSpecialAbilities(character: Character): string[] {
    const abilities: string[] = [];

    if (character.class.toLowerCase().includes('paladin')) {
      abilities.push('paladin');
    }

    if (character.class.toLowerCase().includes('monk')) {
      abilities.push('monk');
    }

    return abilities;
  }

  private getRacialBonuses(character: Character): string[] {
    const bonuses: string[] = [];

    if (character.race.toLowerCase().includes('dwarf')) {
      bonuses.push('dwarf');
    }

    if (character.race.toLowerCase().includes('halfling')) {
      bonuses.push('halfling');
    }

    return bonuses;
  }

  private getAbilityModifierNames(character: Character, saveType: string): string[] {
    const modifiers: string[] = [];

    if (saveType === 'paralyzation-poison-death' && character.abilities.constitution > 15) {
      modifiers.push('constitution');
    }

    if (
      (saveType === 'spell' || saveType === 'rod-staff-wand') &&
      character.abilities.wisdom > 15
    ) {
      modifiers.push('wisdom');
    }

    if (saveType === 'breath-weapon' && character.abilities.dexterity > 15) {
      modifiers.push('dexterity');
    }

    return modifiers;
  }
}
