import {
  determineLevel,
  getExperienceForNextLevel,
  getLevelProgressionTable,
  getLevelTitle,
  getTrainingRequirements,
  meetsTrainingRequirements,
} from '@osric/rules/experience/LevelProgressionRules.js';
import { BaseCommand, type CommandResult, type EntityId } from '../../core/Command';
import { DiceEngine } from '../../core/Dice';
import type { GameContext } from '../../core/GameContext';
import { COMMAND_TYPES, RULE_NAMES } from '../../types/constants';
import type { Character } from '../../types/entities';

export interface LevelUpParameters {
  characterId: string | import('@osric/types').CharacterId;
  targetLevel?: number;
  bypassTraining?: boolean;
  trainerDetails?: {
    hasTrainer: boolean;
    trainerLevel?: number;
    availableGold?: number;
  };
  rollHitPoints?: boolean;
}

export class LevelUpCommand extends BaseCommand<LevelUpParameters> {
  readonly type = COMMAND_TYPES.LEVEL_UP;
  readonly parameters: LevelUpParameters;

  constructor(parameters: LevelUpParameters) {
    super(parameters, parameters.characterId as EntityId);
    this.parameters = parameters;
  }

  async execute(context: GameContext): Promise<CommandResult> {
    try {
      const {
        characterId,
        targetLevel,
        bypassTraining = false,
        trainerDetails,
        rollHitPoints = true,
      } = this.parameters;

      const character = context.getEntity<Character>(characterId);
      if (!character) {
        return this.createFailureResult(`Character with ID "${characterId}" not found`);
      }

      const currentLevel = character.experience.level;
      const maxPossibleLevel = determineLevel(character.class, character.experience.current);
      const finalTargetLevel = targetLevel || Math.min(currentLevel + 1, maxPossibleLevel);

      if (finalTargetLevel <= currentLevel) {
        return this.createFailureResult(
          `Cannot advance to level ${finalTargetLevel}. Character is already level ${currentLevel}.`
        );
      }

      if (finalTargetLevel > maxPossibleLevel) {
        return this.createFailureResult(
          `Insufficient experience for level ${finalTargetLevel}. Current experience allows level ${maxPossibleLevel}.`
        );
      }

      if (finalTargetLevel > currentLevel + 1) {
        return this.createFailureResult(
          'Characters can only advance one level at a time. Use multiple level-up commands for higher advancement.'
        );
      }

      if (!bypassTraining) {
        const trainingCheck = this.validateTrainingRequirements(
          character,
          finalTargetLevel,
          trainerDetails
        );

        if (!trainingCheck.success) {
          return trainingCheck;
        }
      }

      const levelAdvancement = this.calculateLevelAdvancement(
        character,
        finalTargetLevel,
        rollHitPoints
      );
      const updatedCharacter = this.applyLevelAdvancement(character, levelAdvancement);

      context.setEntity(characterId, updatedCharacter);

      const resultData = {
        characterId,
        previousLevel: currentLevel,
        newLevel: finalTargetLevel,
        hitPointsGained: levelAdvancement.hitPointsGained,
        newHitPoints: updatedCharacter.hitPoints,
        newTitle: getLevelTitle(character.class, finalTargetLevel),
        spellSlotsUpdated: levelAdvancement.spellSlotsUpdated,
        newAbilities: levelAdvancement.newAbilities,
        trainingCost: levelAdvancement.trainingCost,
      };

      const message =
        `${character.name} advanced to level ${finalTargetLevel} (${resultData.newTitle})! ` +
        `Gained ${levelAdvancement.hitPointsGained} hit points.`;

      return this.createSuccessResult(message, resultData);
    } catch (error) {
      return this.createFailureResult(
        `Failed to level up character: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  canExecute(context: GameContext): boolean {
    return this.validateEntitiesExist(context);
  }

  getRequiredRules(): string[] {
    return [
      RULE_NAMES.LEVEL_PROGRESSION,
      RULE_NAMES.TRAINING_REQUIREMENTS,
      RULE_NAMES.HIT_POINT_ADVANCEMENT,
    ];
  }

  private validateTrainingRequirements(
    character: Character,
    targetLevel: number,
    trainerDetails?: LevelUpParameters['trainerDetails']
  ): CommandResult {
    const currentLevel = character.experience.level;
    const requirements = getTrainingRequirements(character.class, currentLevel, targetLevel);

    const hasTrainer = trainerDetails?.hasTrainer ?? false;
    const availableGold = trainerDetails?.availableGold ?? character.currency.gold;

    const trainingMet = meetsTrainingRequirements(requirements, {
      timeAvailable: 52,
      goldAvailable: availableGold,
      hasTrainer,
    });

    if (!trainingMet) {
      return this.createFailureResult(
        `Training requirements not met: Need ${requirements.timeRequired} weeks, ${requirements.costRequired} gold${requirements.trainerRequired ? ', and a trainer' : ''}`,
        undefined,
        {
          requirements,
        }
      );
    }

    return this.createSuccessResult('Training requirements validated');
  }

  private calculateLevelAdvancement(
    character: Character,
    targetLevel: number,
    rollHitPoints: boolean
  ) {
    const progressionTable = getLevelProgressionTable(character.class);
    const levelEntry = progressionTable.find((entry) => entry.level === targetLevel);

    if (!levelEntry) {
      throw new Error(
        `No level progression data found for ${character.class} level ${targetLevel}`
      );
    }

    const hitPointsGained = this.calculateHitPointGain(character, rollHitPoints);

    const currentLevel = character.experience.level;
    const trainingRequirements = getTrainingRequirements(
      character.class,
      currentLevel,
      targetLevel
    );
    const trainingCost = trainingRequirements.costRequired;

    const spellSlotsUpdated = this.updateSpellSlots(character, targetLevel);

    const newAbilities: string[] = [];

    return {
      hitPointsGained,
      trainingCost,
      spellSlotsUpdated,
      newAbilities,
    };
  }

  private calculateHitPointGain(character: Character, rollHitPoints: boolean): number {
    const hitDiceByClass: Record<string, number> = {
      Fighter: 10,
      Paladin: 10,
      Ranger: 10,
      Cleric: 8,
      Druid: 8,
      'Magic-User': 4,
      Illusionist: 4,
      Thief: 6,
      Assassin: 6,
      Monk: 4,
    };

    const hitDiceType = hitDiceByClass[character.class] || 6;

    let hitPointsGained: number;

    if (rollHitPoints) {
      const diceResult = DiceEngine.roll(`1d${hitDiceType}`);
      hitPointsGained = diceResult.total;
    } else {
      hitPointsGained = Math.ceil((hitDiceType + 1) / 2);
    }

    const constitutionBonus = Math.floor((character.abilities.constitution - 10) / 2);
    hitPointsGained += constitutionBonus;

    return Math.max(1, hitPointsGained);
  }

  private getConstitutionHitPointModifier(constitution: number): number {
    if (constitution >= 18) return 4;
    if (constitution >= 17) return 3;
    if (constitution >= 16) return 2;
    if (constitution >= 15) return 1;
    if (constitution >= 14) return 0;
    if (constitution >= 7) return 0;
    if (constitution >= 4) return -1;
    return -2;
  }

  private updateSpellSlots(character: Character, _targetLevel: number): boolean {
    const spellcastingClasses = [
      'Cleric',
      'Magic-User',
      'Druid',
      'Paladin',
      'Ranger',
      'Illusionist',
    ];

    if (!spellcastingClasses.includes(character.class)) {
      return false;
    }

    return true;
  }

  private applyLevelAdvancement(
    character: Character,
    advancement: ReturnType<typeof this.calculateLevelAdvancement>
  ): Character {
    const targetLevel = character.experience.level + 1;
    const newExperienceRequired = getExperienceForNextLevel(character.class, targetLevel);

    return {
      ...character,
      experience: {
        ...character.experience,
        level: targetLevel,
        requiredForNextLevel: newExperienceRequired,
      },
      hitPoints: {
        current: character.hitPoints.current + advancement.hitPointsGained,
        maximum: character.hitPoints.maximum + advancement.hitPointsGained,
      },
      currency: {
        ...character.currency,
        gold: character.currency.gold - advancement.trainingCost,
      },
    };
  }
}
