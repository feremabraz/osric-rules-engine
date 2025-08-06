import type { Command } from '@osric/core/Command';
import type { GameContext } from '@osric/core/GameContext';
import { calculateMonsterXP } from '@osric/core/MonsterXP';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';
import type { Character, Monster } from '@osric/types/entities';

interface ExperienceGainParameters {
  characterId: string;
  experienceSource: {
    type: 'combat' | 'treasure' | 'story' | 'other';
    amount?: number;
    monsters?: Monster[];
    treasureValue?: number;
    description?: string;
  };
  partyShare?: {
    enabled: boolean;
    partyMemberIds: string[];
    equalShare: boolean;
  };
}

export class ExperienceGainRule extends BaseRule {
  readonly name = RULE_NAMES.EXPERIENCE_GAIN;
  readonly priority = 500;

  canApply(_context: GameContext, command: Command): boolean {
    return command.type === COMMAND_TYPES.GAIN_EXPERIENCE;
  }

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const gainData = context.getTemporary<ExperienceGainParameters>('experience-gain-params');

    if (!gainData) {
      return this.createFailureResult('No experience gain data provided');
    }

    try {
      const character = context.getEntity<Character>(gainData.characterId);
      if (!character) {
        return this.createFailureResult(`Character ${gainData.characterId} not found`);
      }

      let baseExperience = 0;
      const modifiers: string[] = [];

      switch (gainData.experienceSource.type) {
        case 'combat':
          if (gainData.experienceSource.monsters) {
            baseExperience = this.calculateCombatXP(
              gainData.experienceSource.monsters,
              gainData.partyShare
            );
            modifiers.push(`Combat XP from ${gainData.experienceSource.monsters.length} monsters`);
          }
          break;

        case 'treasure':
          if (gainData.experienceSource.treasureValue) {
            baseExperience = gainData.experienceSource.treasureValue;
            modifiers.push(`Treasure XP: ${gainData.experienceSource.treasureValue} gp`);
          }
          break;

        case 'story':
        case 'other':
          if (gainData.experienceSource.amount) {
            baseExperience = gainData.experienceSource.amount;
            modifiers.push(
              `${gainData.experienceSource.type} XP: ${gainData.experienceSource.amount}`
            );
          }
          break;
      }

      const finalExperience = this.applyCharacterModifiers(character, baseExperience, modifiers);

      const updatedCharacter = {
        ...character,
        experience: {
          ...character.experience,
          current: character.experience.current + finalExperience,
        },
      };

      context.setEntity(gainData.characterId, updatedCharacter);

      const description =
        gainData.experienceSource.description || `${gainData.experienceSource.type} experience`;

      return this.createSuccessResult(`Gained ${finalExperience} experience points`, {
        characterId: gainData.characterId,
        experienceGained: finalExperience,
        newTotal: updatedCharacter.experience.current,
        source: gainData.experienceSource.type,
        description,
        modifiers,
      });
    } catch (error) {
      return this.createFailureResult(
        `Failed to process experience gain: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private calculateCombatXP(
    monsters: Monster[],
    partyShare?: ExperienceGainParameters['partyShare']
  ): number {
    let totalXP = 0;

    for (const monster of monsters) {
      const monsterXP = calculateMonsterXP(monster);
      totalXP += monsterXP;
    }

    if (partyShare?.enabled && partyShare.partyMemberIds.length > 1) {
      if (partyShare.equalShare) {
        totalXP = Math.floor(totalXP / partyShare.partyMemberIds.length);
      }
    }

    return totalXP;
  }

  private applyCharacterModifiers(
    character: Character,
    baseExperience: number,
    modifiers: string[]
  ): number {
    let modifiedXP = baseExperience;

    const primeRequisiteBonus = this.getPrimeRequisiteBonus(character);
    if (primeRequisiteBonus !== 1.0) {
      const bonusXP = Math.floor(baseExperience * primeRequisiteBonus) - baseExperience;
      modifiedXP += bonusXP;

      const bonusPercent = Math.round((primeRequisiteBonus - 1.0) * 100);
      modifiers.push(
        `Prime requisite ${bonusPercent > 0 ? '+' : ''}${bonusPercent}%: ${bonusXP} XP`
      );
    }

    if (character.class.includes('/')) {
      const penalty = this.getMultiClassPenalty(character);
      if (penalty < 1.0) {
        const penaltyXP = modifiedXP - Math.floor(modifiedXP * penalty);
        modifiedXP -= penaltyXP;

        const penaltyPercent = Math.round((1.0 - penalty) * 100);
        modifiers.push(`Multi-class penalty -${penaltyPercent}%: -${penaltyXP} XP`);
      }
    }

    const levelLimitPenalty = this.getRacialLevelLimitPenalty(character);
    if (levelLimitPenalty < 1.0) {
      const penaltyXP = modifiedXP - Math.floor(modifiedXP * levelLimitPenalty);
      modifiedXP -= penaltyXP;

      const penaltyPercent = Math.round((1.0 - levelLimitPenalty) * 100);
      modifiers.push(`Racial level limit penalty -${penaltyPercent}%: -${penaltyXP} XP`);
    }

    return Math.max(0, Math.floor(modifiedXP));
  }

  private getPrimeRequisiteBonus(character: Character): number {
    const primeRequisiteScore = this.getPrimeRequisiteScore(character);

    if (primeRequisiteScore >= 16) return 1.1;
    if (primeRequisiteScore >= 15) return 1.05;
    if (primeRequisiteScore >= 13) return 1.0;
    if (primeRequisiteScore >= 9) return 1.0;
    if (primeRequisiteScore >= 6) return 0.95;
    return 0.9;
  }

  private getPrimeRequisiteScore(character: Character): number {
    const characterClass = character.class.toLowerCase();

    if (characterClass.includes('/')) {
      const classes = characterClass.split('/');
      return Math.max(...classes.map((cls: string) => this.getClassPrimeRequisite(cls, character)));
    }

    return this.getClassPrimeRequisite(characterClass, character);
  }

  private getClassPrimeRequisite(characterClass: string, character: Character): number {
    const abilities = character.abilities;

    switch (characterClass.toLowerCase()) {
      case 'fighter':
      case 'paladin':
      case 'ranger':
        return abilities.strength;
      case 'cleric':
      case 'druid':
        return abilities.wisdom;
      case 'magic-user':
      case 'illusionist':
        return abilities.intelligence;
      case 'thief':
      case 'assassin':
        return abilities.dexterity;
      default:
        return 13;
    }
  }

  private getMultiClassPenalty(character: Character): number {
    const classes = character.class.split('/');

    let penalty = 1.0 / classes.length;

    if (classes.length > 2) {
      penalty *= 0.9;
    }

    return penalty;
  }

  private getRacialLevelLimitPenalty(_character: Character): number {
    return 1.0;
  }
}
