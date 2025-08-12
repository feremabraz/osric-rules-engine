import type { Command } from '@osric/core/Command';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, isFailure, isSuccess } from '@osric/core/Rule';
import type { RuleResult } from '@osric/core/Rule';
import type { CharacterId } from '@osric/types';
import type { Character } from '@osric/types/character';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';

interface TrainingRequestData {
  characterId: string | CharacterId;
  trainingType: 'level_advancement' | 'new_skill' | 'skill_improvement';
  targetLevel?: number;
  skillType?: string;
}

interface TrainingRequirements {
  timeRequired: number;
  costRequired: number;
  trainerRequired: boolean;
  trainerLevel?: number;
  locationRequired?: string;
  prerequisites: string[];
}

interface TrainingResult {
  kind: 'success' | 'failure';
  timeSpent: number;
  costPaid: number;
  benefits?: string[];
  message: string;
}

export class TrainingRule extends BaseRule {
  readonly name = RULE_NAMES.TRAINING_REQUIREMENTS;

  canApply(context: GameContext, command: Command): boolean {
    if (command.type !== COMMAND_TYPES.LEVEL_UP) {
      return false;
    }

    const data = context.getTemporary<TrainingRequestData>('training-request-params');
    if (!data?.characterId || !data?.trainingType) {
      return false;
    }

    const character = context.getEntity<Character>(data.characterId);
    return character !== undefined;
  }

  async apply(context: GameContext, _command: Command): Promise<RuleResult> {
    const data = context.getTemporary<TrainingRequestData>('training-request-params');

    if (!data) {
      return this.createFailureResult('No training request data provided');
    }

    const character = context.getEntity<Character>(data.characterId);

    if (!character) {
      return this.createFailureResult('Character not found');
    }

    const requirements = this.calculateTrainingRequirements(character, data);

    const prerequisiteCheck = this.checkPrerequisites(character, requirements);
    if (isFailure(prerequisiteCheck)) {
      return this.createFailureResult(prerequisiteCheck.message);
    }

    const result = this.processTraining(character, data, requirements);

    if (isSuccess(result)) {
      this.applyTrainingEffects(character, data, context);
    }

    return this.createSuccessResult(result.message, { result });
  }

  private calculateTrainingRequirements(
    character: Character,
    data: TrainingRequestData
  ): TrainingRequirements {
    switch (data.trainingType) {
      case 'level_advancement':
        return this.calculateLevelTrainingRequirements(
          character,
          data.targetLevel || character.level + 1
        );

      case 'new_skill':
        return this.calculateNewSkillRequirements(character, data.skillType || 'general');

      case 'skill_improvement':
        return this.calculateSkillImprovementRequirements(character, data.skillType || 'general');

      default:
        return {
          timeRequired: 1,
          costRequired: 0,
          trainerRequired: false,
          prerequisites: [],
        };
    }
  }

  private calculateLevelTrainingRequirements(
    character: Character,
    targetLevel: number
  ): TrainingRequirements {
    const levelDifference = targetLevel - character.level;

    const baseTimeWeeks = Math.max(1, targetLevel);
    const timeRequired = baseTimeWeeks * levelDifference;

    const baseCost = this.getBaseLevelTrainingCost(character);
    const costRequired = baseCost * targetLevel;

    const trainerRequired = targetLevel > 3;
    const trainerLevel = trainerRequired ? targetLevel + 1 : undefined;

    return {
      timeRequired,
      costRequired,
      trainerRequired,
      trainerLevel,
      locationRequired: trainerRequired ? 'civilized settlement' : undefined,
      prerequisites: this.getLevelAdvancementPrerequisites(character, targetLevel),
    };
  }

  private calculateNewSkillRequirements(
    _character: Character,
    _skillType: string
  ): TrainingRequirements {
    return {
      timeRequired: 8,
      costRequired: 500,
      trainerRequired: true,
      trainerLevel: 3,
      locationRequired: 'guild hall or academy',
      prerequisites: ['Intelligence 12+', 'Available skill slot'],
    };
  }

  private calculateSkillImprovementRequirements(
    _character: Character,
    _skillType: string
  ): TrainingRequirements {
    return {
      timeRequired: 4,
      costRequired: 250,
      trainerRequired: true,
      trainerLevel: 5,
      prerequisites: ['Previous skill level', 'Practice time completed'],
    };
  }

  private getBaseLevelTrainingCost(character: Character): number {
    const classCostMultipliers: Record<string, number> = {
      Fighter: 100,
      Cleric: 150,
      'Magic-User': 200,
      Thief: 125,
      Assassin: 175,
      Druid: 175,
      Paladin: 200,
      Ranger: 175,
      Illusionist: 175,
      Monk: 100,
      Bard: 150,
    };

    return classCostMultipliers[character.class] || 100;
  }

  private getLevelAdvancementPrerequisites(character: Character, targetLevel: number): string[] {
    const prerequisites: string[] = [];

    prerequisites.push(`${this.getRequiredExperience(targetLevel)} XP`);

    if (targetLevel > 8) {
      prerequisites.push('Prime requisite 15+');
    }

    const classPrereqs = this.getClassSpecificPrerequisites(character, targetLevel);
    prerequisites.push(...classPrereqs);

    return prerequisites;
  }

  private getRequiredExperience(targetLevel: number): number {
    return targetLevel ** 3 * 1000;
  }

  private getClassSpecificPrerequisites(character: Character, targetLevel: number): string[] {
    const prerequisites: string[] = [];

    switch (character.class) {
      case 'Cleric':
        if (targetLevel > 7) {
          prerequisites.push('Established shrine or temple');
        }
        break;

      case 'Magic-User':
      case 'Illusionist':
        if (targetLevel > 5) {
          prerequisites.push('Access to spell research facilities');
        }
        break;

      case 'Paladin':
        prerequisites.push('Lawful Good alignment maintained');
        if (targetLevel > 8) {
          prerequisites.push('Completed holy quest');
        }
        break;

      case 'Ranger':
        prerequisites.push('Good alignment maintained');
        break;
    }

    return prerequisites;
  }

  private checkPrerequisites(
    character: Character,
    requirements: TrainingRequirements
  ): { kind: 'success' | 'failure'; message: string } {
    if (requirements.prerequisites.some((p) => p.includes('XP'))) {
      const requiredXP = Number.parseInt(
        requirements.prerequisites.find((p) => p.includes('XP'))?.split(' ')[0] || '0'
      );
      if (character.experience.current < requiredXP) {
        return {
          kind: 'failure',
          message: `Insufficient experience points. Need ${requiredXP}, have ${character.experience.current}`,
        };
      }
    }

    if (requirements.prerequisites.some((p) => p.includes('Prime requisite'))) {
      const primeRequisite = this.getPrimeRequisite(character);
      if (primeRequisite < 15) {
        return {
          kind: 'failure',
          message: 'Prime requisite ability score too low for advanced training',
        };
      }
    }

    return { kind: 'success', message: 'Prerequisites satisfied' };
  }

  private getPrimeRequisite(character: Character): number {
    const primeRequisites: Record<string, keyof typeof character.abilities> = {
      Fighter: 'strength',
      Cleric: 'wisdom',
      'Magic-User': 'intelligence',
      Thief: 'dexterity',
      Assassin: 'dexterity',
      Druid: 'wisdom',
      Paladin: 'charisma',
      Ranger: 'strength',
      Illusionist: 'intelligence',
      Monk: 'wisdom',
      Bard: 'charisma',
    };

    const requisite = primeRequisites[character.class];
    return requisite ? character.abilities[requisite] : 10;
  }

  private processTraining(
    _character: Character,
    data: TrainingRequestData,
    requirements: TrainingRequirements
  ): TrainingResult {
    const succeeded = this.rollTrainingSuccess(data.trainingType);

    if (succeeded) {
      return {
        kind: 'success',
        timeSpent: requirements.timeRequired,
        costPaid: requirements.costRequired,
        benefits: this.getTrainingBenefits(data.trainingType),
        message: `Training completed successfully in ${requirements.timeRequired} weeks`,
      };
    }

    return {
      kind: 'failure',
      timeSpent: Math.floor(requirements.timeRequired / 2),
      costPaid: Math.floor(requirements.costRequired / 2),
      message: 'Training failed. Partial time and cost expended.',
    };
  }

  private rollTrainingSuccess(trainingType: string): boolean {
    const baseChance: Record<string, number> = {
      level_advancement: 0.9,
      new_skill: 0.7,
      skill_improvement: 0.8,
    };

    return Math.random() < (baseChance[trainingType] || 0.5);
  }

  private getTrainingBenefits(trainingType: string): string[] {
    switch (trainingType) {
      case 'level_advancement':
        return ['Level increased', 'Hit points gained', 'Abilities improved'];

      case 'new_skill':
        return ['New skill acquired', 'Skill points allocated'];

      case 'skill_improvement':
        return ['Skill level increased', 'Proficiency bonus improved'];

      default:
        return [];
    }
  }

  private applyTrainingEffects(
    _character: Character,
    _data: TrainingRequestData,
    _context: GameContext
  ): void {}
}
