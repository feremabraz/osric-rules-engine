import { GainExperienceValidator } from '@osric/commands/character/validators/GainExperienceValidator';
import { BaseCommand, type CommandResult, type EntityId } from '@osric/core/Command';
import type { GameContext } from '@osric/core/GameContext';
import { calculateGroupXP, calculateMonsterXP } from '@osric/core/MonsterXP';
import { isFailure } from '@osric/core/Rule';
import { formatValidationErrors } from '@osric/core/ValidationPrimitives';
import {
  determineLevel,
  getExperienceForNextLevel,
} from '@osric/rules/experience/LevelProgressionRules';
import type { Character } from '@osric/types/character';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';
import type { Monster } from '@osric/types/monster';

export interface GainExperienceParameters {
  characterId: string | import('@osric/types').CharacterId;
  experienceSource: {
    type: 'combat' | 'treasure' | 'story' | 'other';
    amount?: number;
    monsters?: Monster[];
    treasureValue?: number;
    description?: string;
  };
  partyShare?: {
    enabled: boolean;
    partyMemberIds: Array<string | import('@osric/types').CharacterId>;
    shareRatio?: number;
  };
  applyClassModifiers?: boolean;
}

export class GainExperienceCommand extends BaseCommand<GainExperienceParameters> {
  readonly type = COMMAND_TYPES.GAIN_EXPERIENCE;
  readonly parameters: GainExperienceParameters;

  constructor(parameters: GainExperienceParameters) {
    super(
      parameters,
      parameters.characterId as EntityId,
      (parameters.partyShare?.partyMemberIds as EntityId[]) || []
    );
    this.parameters = parameters;
  }

  protected validateParameters(): void {
    const result = GainExperienceValidator.validate(this.parameters);
    if (!result.valid) {
      const messages = formatValidationErrors(result.errors);
      throw new Error(`Parameter validation failed: ${messages.join(', ')}`);
    }
  }

  async execute(context: GameContext): Promise<CommandResult> {
    try {
      const {
        characterId,
        experienceSource,
        partyShare,
        applyClassModifiers = true,
      } = this.parameters;

      const character = context.getEntity<Character>(characterId);
      if (!character) {
        return this.createFailureResult(`Character with ID "${characterId}" not found`);
      }

      let baseExperiencePoints = 0;

      switch (experienceSource.type) {
        case 'combat': {
          if (!experienceSource.monsters || experienceSource.monsters.length === 0) {
            return this.createFailureResult('Combat experience requires monsters to be specified');
          }
          const groupXP = calculateGroupXP({
            monsters: experienceSource.monsters,
            characters: [character],
            encounterDifficulty: 'normal',
          });
          baseExperiencePoints = groupXP.get(character.id) || 0;
          break;
        }

        case 'treasure':
          if (experienceSource.treasureValue) {
            baseExperiencePoints = Math.floor(experienceSource.treasureValue);
          } else if (experienceSource.amount) {
            baseExperiencePoints = experienceSource.amount;
          }
          break;

        case 'story':
        case 'other':
          baseExperiencePoints = experienceSource.amount || 0;
          break;

        default:
          return this.createFailureResult(
            `Unknown experience source type: ${experienceSource.type}`
          );
      }

      let finalExperiencePoints = baseExperiencePoints;
      if (applyClassModifiers) {
        finalExperiencePoints = this.applyClassExperienceModifiers(character, baseExperiencePoints);
      }

      if (partyShare?.enabled && partyShare.partyMemberIds.length > 0) {
        const shareResult = this.calculatePartyExperienceShare(
          context,
          finalExperiencePoints,
          partyShare.partyMemberIds,
          partyShare.shareRatio
        );

        if (isFailure(shareResult)) {
          return shareResult;
        }

        const updatedCharacters: string[] = [];
        for (const [memberId, memberXP] of Object.entries(shareResult.experienceShares || {})) {
          const member = context.getEntity<Character>(memberId);
          if (member) {
            const newExperienceTotal = member.experience.current + memberXP;
            const newLevel = determineLevel(member.class, newExperienceTotal);
            const requiredForNext = getExperienceForNextLevel(member.class, newLevel);

            const updatedMember = {
              ...member,
              experience: {
                current: newExperienceTotal,
                level: newLevel,
                requiredForNextLevel: requiredForNext,
              },
            };
            context.setEntity(memberId, updatedMember);
            updatedCharacters.push(memberId);
          }
        }

        return this.createSuccessResult(
          `Experience shared among ${updatedCharacters.length} party members`,
          {
            experienceAwarded: finalExperiencePoints,
            experienceShares: shareResult.experienceShares,
            source: experienceSource,
            updatedCharacters,
          }
        );
      }

      const newExperienceTotal = character.experience.current + finalExperiencePoints;
      const newLevel = determineLevel(character.class, newExperienceTotal);
      const requiredForNext = getExperienceForNextLevel(character.class, newLevel);

      const updatedCharacter = {
        ...character,
        experience: {
          current: newExperienceTotal,
          level: newLevel,
          requiredForNextLevel: requiredForNext,
        },
      };

      context.setEntity(characterId, updatedCharacter);

      return this.createSuccessResult(
        `${character.name} gained ${finalExperiencePoints} experience points`,
        {
          characterId,
          experienceAwarded: finalExperiencePoints,
          newExperienceTotal,
          newLevel,
          leveledUp: newLevel > character.experience.level,
          source: experienceSource,
        }
      );
    } catch (error) {
      return this.createFailureResult(
        `Failed to award experience: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  canExecute(context: GameContext): boolean {
    return this.validateEntitiesExist(context);
  }

  getRequiredRules(): string[] {
    return [RULE_NAMES.EXPERIENCE_GAIN, RULE_NAMES.LEVEL_PROGRESSION];
  }

  private applyClassExperienceModifiers(character: Character, baseXP: number): number {
    let modifiedXP = baseXP;

    const classEntries = Object.entries(character.classes || {});
    if (classEntries.length > 1) {
      modifiedXP = Math.floor(baseXP / classEntries.length);
    }

    const primeRequisiteBonus = this.calculatePrimeRequisiteBonus(character);
    modifiedXP = Math.floor(modifiedXP * primeRequisiteBonus);

    return modifiedXP;
  }

  private calculatePrimeRequisiteBonus(character: Character): number {
    const primeRequisites = this.getPrimeRequisites(character.class);

    if (primeRequisites.length === 0) return 1.0;

    const totalScore = primeRequisites.reduce((sum, stat) => {
      return sum + character.abilities[stat];
    }, 0);

    const averageScore = totalScore / primeRequisites.length;

    if (averageScore >= 16) return 1.1;
    if (averageScore >= 13) return 1.05;
    if (averageScore <= 8) return 0.95;

    return 1.0;
  }

  private getPrimeRequisites(characterClass: string): Array<keyof Character['abilities']> {
    const primeRequisiteMap: Record<string, Array<keyof Character['abilities']>> = {
      Fighter: ['strength'],
      Cleric: ['wisdom'],
      'Magic-User': ['intelligence'],
      Thief: ['dexterity'],
      Assassin: ['dexterity', 'intelligence'],
      Druid: ['wisdom', 'charisma'],
      Paladin: ['strength', 'charisma'],
      Ranger: ['strength', 'intelligence', 'wisdom'],
      Illusionist: ['intelligence'],
    };

    return primeRequisiteMap[characterClass] || [];
  }

  private calculatePartyExperienceShare(
    context: GameContext,
    totalXP: number,
    partyMemberIds: string[],
    shareRatio?: number
  ): CommandResult & { experienceShares?: Record<string, number> } {
    const experienceShares: Record<string, number> = {};

    const validMembers: Character[] = [];
    for (const memberId of partyMemberIds) {
      const member = context.getEntity<Character>(memberId);
      if (!member) {
        return {
          kind: 'failure',
          message: `Party member with ID "${memberId}" not found`,
        } as CommandResult & { experienceShares?: Record<string, number> };
      }
      validMembers.push(member);
    }

    if (validMembers.length === 0) {
      return {
        kind: 'failure',
        message: 'No valid party members found for experience sharing',
      } as CommandResult & { experienceShares?: Record<string, number> };
    }

    if (!shareRatio) {
      const sharePerMember = Math.floor(totalXP / validMembers.length);
      for (const member of validMembers) {
        experienceShares[member.id] = sharePerMember;
      }
    } else {
      const sharePerMember = Math.floor(totalXP / validMembers.length);
      for (const member of validMembers) {
        experienceShares[member.id] = sharePerMember;
      }
    }

    return {
      kind: 'success',
      message: 'Experience shares calculated',
      experienceShares,
    } as CommandResult & { experienceShares?: Record<string, number> };
  }
}
