/**
 * SavingThrowRules - OSRIC Saving Throw Rule Implementation
 *
 * Handles validation and processing of saving throws according to OSRIC rules.
 * PRESERVATION: All OSRIC saving throw mechanics and calculations preserved exactly.
 */

import type { Command } from '../../core/Command';
import type { GameContext } from '../../core/GameContext';
import { BaseRule, type RuleResult } from '../../core/Rule';
import { COMMAND_TYPES, RULE_NAMES } from '../../types/constants';
import type { Character } from '../../types/entities';

interface SavingThrowParameters {
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

export class SavingThrowRule extends BaseRule {
  readonly name = RULE_NAMES.SAVING_THROWS;
  readonly priority = 500; // Normal priority for saving throws

  canApply(_context: GameContext, command: Command): boolean {
    return command.type === COMMAND_TYPES.SAVING_THROW;
  }

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const saveData = context.getTemporary<SavingThrowParameters>('saving-throw-params');

    if (!saveData) {
      return this.createFailureResult('No saving throw data provided');
    }

    // Validate saveType
    if (!saveData.saveType) {
      return this.createFailureResult(`Invalid save type: ${saveData.saveType}`);
    }

    try {
      const character = context.getEntity<Character>(saveData.characterId);
      if (!character) {
        return this.createFailureResult(`Character ${saveData.characterId} not found`);
      }

      // Validate the saving throw attempt
      const validationResult = this.validateSavingThrow(character, saveData);
      if (!validationResult.success) {
        return validationResult;
      }

      // Calculate saving throw target number
      const saveCalculation = this.calculateSavingThrow(character, saveData);

      // Apply special class/race modifications
      const specialModifications = this.applySpecialRules(character, saveData, saveCalculation);

      return this.createSuccessResult('Saving throw calculation complete', {
        characterId: saveData.characterId,
        saveType: saveData.saveType,
        baseSave: saveCalculation.baseSave,
        finalSave: saveCalculation.finalSave,
        modifiers: saveCalculation.modifiers,
        specialRules: specialModifications,
        canAttempt: validationResult.canAttempt,
        automaticSuccess: validationResult.automaticSuccess,
        automaticFailure: validationResult.automaticFailure,
      });
    } catch (error) {
      return this.createFailureResult(
        `Failed to process saving throw rule: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Validate that the saving throw can be attempted
   */
  private validateSavingThrow(
    character: Character,
    saveData: SavingThrowParameters
  ): RuleResult & { canAttempt?: boolean; automaticSuccess?: boolean; automaticFailure?: boolean } {
    // Check for conditions that prevent saving throws
    if (character.hitPoints.current <= 0) {
      return {
        success: false,
        message: 'Cannot make saving throws while unconscious or dead',
        canAttempt: false,
      };
    }

    // Check for automatic successes/failures based on class abilities
    const autoResult = this.checkAutomaticResults(character, saveData.saveType);
    if (autoResult) {
      return {
        success: true,
        message: autoResult.message,
        canAttempt: true,
        automaticSuccess: autoResult.type === 'success',
        automaticFailure: autoResult.type === 'failure',
      };
    }

    return {
      success: true,
      message: 'Saving throw can be attempted',
      canAttempt: true,
    };
  }

  /**
   * Check for automatic saving throw results
   */
  private checkAutomaticResults(
    character: Character,
    saveType: string
  ): { type: 'success' | 'failure'; message: string } | null {
    const characterClass = character.class.toLowerCase();
    const level = character.experience.level;

    // Paladin immunity to disease (automatic success vs certain poison/disease effects)
    if (characterClass === 'paladin' && saveType === 'paralyzation-poison-death') {
      if (level >= 3) {
        // Note: In a real implementation, you'd check if this is specifically a disease
        // For now, we don't auto-succeed, but could add this logic
      }
    }

    // Monks have special immunities at higher levels
    if (characterClass === 'monk') {
      if (level >= 7 && saveType === 'paralyzation-poison-death') {
        // Monks become immune to disease
      }
      if (level >= 9 && saveType === 'spell') {
        // Monks gain resistance to certain spells
      }
    }

    return null; // No automatic results in this case
  }

  /**
   * Calculate the final saving throw target number
   */
  private calculateSavingThrow(
    character: Character,
    saveData: SavingThrowParameters
  ): {
    baseSave: number;
    finalSave: number;
    modifiers: Array<{ source: string; modifier: number; description: string }>;
  } {
    const modifiers: Array<{ source: string; modifier: number; description: string }> = [];

    // Get base saving throw from OSRIC tables
    const baseSave = this.getBaseSavingThrow(character, saveData.saveType, modifiers);
    let finalSave = baseSave;

    // Apply situational modifiers
    if (saveData.situationalModifiers) {
      finalSave = this.applySituationalModifiers(
        finalSave,
        saveData.situationalModifiers,
        saveData.saveType,
        character,
        modifiers
      );
    }

    // Always apply ability score modifiers (even without situational modifiers)
    const abilityMod = this.getAbilityModifiers(
      character,
      saveData.saveType,
      saveData.situationalModifiers,
      modifiers
    );
    finalSave += abilityMod;

    // Apply target number override if provided
    if (saveData.targetNumber !== undefined) {
      modifiers.push({
        source: 'override',
        modifier: saveData.targetNumber - finalSave,
        description: `Target number override: ${saveData.targetNumber}`,
      });
      finalSave = saveData.targetNumber;
    }

    // Ensure final save is within valid range (2-20)
    finalSave = Math.max(2, Math.min(20, finalSave));

    return { baseSave, finalSave, modifiers };
  }

  /**
   * Get base saving throw number from OSRIC tables
   */
  private getBaseSavingThrow(
    character: Character,
    saveType: string,
    modifiers: Array<{ source: string; modifier: number; description: string }>
  ): number {
    const level = Math.min(character.experience.level, 20); // Cap at level 20
    const characterClass = character.class.toLowerCase();

    // Handle multi-class characters (use best save)
    if (character.classes && Object.keys(character.classes).length > 1) {
      const saves = Object.entries(character.classes).map(([cls, classLevel]) =>
        this.getSingleClassSave(cls.toLowerCase(), classLevel, saveType)
      );
      const bestSave = Math.min(...saves);

      modifiers.push({
        source: 'multi-class',
        modifier: bestSave - saves[0], // Show improvement from best class
        description: 'Multi-class (using best save)',
      });

      return bestSave;
    }

    return this.getSingleClassSave(characterClass, level, saveType);
  }

  /**
   * Get saving throw for a single class from OSRIC tables
   */
  private getSingleClassSave(characterClass: string, level: number, saveType: string): number {
    // OSRIC saving throw progression tables
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

    // Map other classes to base classes
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
      } else if (characterClass === 'monk') {
        classTable = savingThrowTables.thief; // Monks use thief saves
      } else {
        classTable = savingThrowTables.fighter; // Default
      }
    }

    const saveArray = classTable[saveType];
    if (!saveArray) {
      return 20; // Default high save if not found
    }

    // Get save for level (capped at array length)
    const tableIndex = Math.min(level - 1, saveArray.length - 1);
    return saveArray[tableIndex];
  }

  /**
   * Apply situational modifiers to saving throw
   */
  private applySituationalModifiers(
    baseSave: number,
    situationalMods: NonNullable<SavingThrowParameters['situationalModifiers']>,
    _saveType: string,
    _character: Character,
    modifiers: Array<{ source: string; modifier: number; description: string }>
  ): number {
    let modifiedSave = baseSave;

    // Magic item bonuses
    if (situationalMods.magicItemBonus) {
      modifiers.push({
        source: 'magic-items',
        modifier: situationalMods.magicItemBonus,
        description: 'Magic item bonuses',
      });
      modifiedSave += situationalMods.magicItemBonus;
    }

    // Spell bonuses (Bless, etc.)
    if (situationalMods.spellBonus) {
      modifiers.push({
        source: 'spells',
        modifier: situationalMods.spellBonus,
        description: 'Spell effects',
      });
      modifiedSave += situationalMods.spellBonus;
    }

    // Class bonuses (paladin aura, etc.)
    if (situationalMods.classBonus) {
      modifiers.push({
        source: 'class',
        modifier: situationalMods.classBonus,
        description: 'Class abilities',
      });
      modifiedSave += situationalMods.classBonus;
    }

    // Racial bonuses
    if (situationalMods.racialBonus) {
      modifiers.push({
        source: 'racial',
        modifier: situationalMods.racialBonus,
        description: 'Racial bonuses',
      });
      modifiedSave += situationalMods.racialBonus;
    }

    // Difficulty modifiers
    if (situationalMods.difficulty && situationalMods.difficulty !== 'normal') {
      const difficultyMods = {
        easy: -2,
        hard: 2,
        'very-hard': 4,
      };
      const mod = difficultyMods[situationalMods.difficulty as keyof typeof difficultyMods];
      if (mod) {
        modifiers.push({
          source: 'difficulty',
          modifier: mod,
          description: `${situationalMods.difficulty} difficulty`,
        });
        modifiedSave += mod;
      }
    }

    return modifiedSave;
  }

  /**
   * Calculate ability score modifiers for saving throws
   */
  private getAbilityModifiers(
    character: Character,
    saveType: string,
    modifiers: SavingThrowParameters['situationalModifiers'],
    modifiersList: Array<{ source: string; modifier: number; description: string }>
  ): number {
    let totalModifier = 0;

    // Constitution for poison/death
    if (saveType === 'paralyzation-poison-death') {
      const constitution = modifiers?.constitution ?? character.abilities.constitution;
      const constMod = this.getConstitutionSaveModifier(constitution);
      if (constMod !== 0) {
        modifiersList.push({
          source: 'abilities',
          modifier: constMod,
          description: 'Constitution modifier for poison/death saves',
        });
        totalModifier += constMod;
      }
    }

    // Wisdom for mental effects
    if (saveType === 'spell' || saveType === 'rod-staff-wand') {
      const wisdomMod =
        modifiers?.wisdomBonus !== undefined
          ? modifiers.wisdomBonus
          : this.getWisdomSaveModifier(character.abilities.wisdom);
      if (wisdomMod !== 0) {
        modifiersList.push({
          source: 'abilities',
          modifier: wisdomMod,
          description: 'Wisdom modifier for mental saves',
        });
        totalModifier += wisdomMod;
      }
    }

    // Dexterity for area effects
    if (saveType === 'breath-weapon') {
      const dexMod =
        modifiers?.dexterityBonus !== undefined
          ? modifiers.dexterityBonus
          : this.getDexteritySaveModifier(character.abilities.dexterity);
      if (dexMod !== 0) {
        modifiersList.push({
          source: 'abilities',
          modifier: dexMod,
          description: 'Dexterity modifier for breath weapon saves',
        });
        totalModifier += dexMod;
      }
    }

    return totalModifier;
  }

  /**
   * Get constitution modifier for poison/death saves
   */
  private getConstitutionSaveModifier(constitution: number): number {
    if (constitution >= 17) return -4;
    if (constitution >= 16) return -3;
    if (constitution >= 15) return -2;
    if (constitution >= 14) return -1;
    if (constitution >= 7) return 0;
    if (constitution >= 4) return 1;
    return 2;
  }

  /**
   * Get wisdom modifier for mental saves
   */
  private getWisdomSaveModifier(wisdom: number): number {
    if (wisdom >= 17) return -3;
    if (wisdom >= 15) return -2;
    if (wisdom >= 13) return -1;
    if (wisdom >= 6) return 0;
    if (wisdom >= 4) return 1;
    return 2;
  }

  /**
   * Get dexterity modifier for area saves
   */
  private getDexteritySaveModifier(dexterity: number): number {
    if (dexterity >= 17) return -3;
    if (dexterity >= 15) return -2;
    if (dexterity >= 13) return -1;
    if (dexterity >= 6) return 0;
    if (dexterity >= 4) return 1;
    return 2;
  }

  /**
   * Apply special class and race rules
   */
  private applySpecialRules(
    character: Character,
    saveData: SavingThrowParameters,
    _saveCalculation: { baseSave: number; finalSave: number }
  ): string[] {
    const specialRules: string[] = [];
    const characterClass = character.class.toLowerCase();
    const level = character.experience.level;

    // Class-specific special rules
    if (characterClass === 'paladin') {
      if (level >= 2) {
        specialRules.push('+2 bonus to all saving throws');
      }
      if (level >= 3 && saveData.saveType === 'paralyzation-poison-death') {
        specialRules.push('Immune to disease');
      }
    }

    if (characterClass === 'monk') {
      if (level >= 7) {
        specialRules.push('Immune to disease and charm');
      }
      if (level >= 9) {
        specialRules.push('Immune to poison');
      }
    }

    // Racial special rules
    const race = character.race.toLowerCase();
    if (race === 'dwarf') {
      if (saveData.saveType === 'rod-staff-wand' || saveData.saveType === 'spell') {
        specialRules.push('Dwarven resistance to magic');
      }
    }

    if (race === 'halfling') {
      if (saveData.saveType === 'rod-staff-wand' || saveData.saveType === 'spell') {
        specialRules.push('Halfling resistance to magic');
      }
    }

    // General rules
    specialRules.push('Natural 1 always fails, natural 20 always succeeds');

    return specialRules;
  }
}
