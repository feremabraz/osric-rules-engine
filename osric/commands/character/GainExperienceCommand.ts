/**
 * GainExperienceCommand - Award Experience Points
 *
 * Handles awarding experience points from various sources:
 * - Combat (monster defeats)
 * - Treasure acquisition
 * - Story milestones
 * - Class-specific bonuses/penalties
 * - Party sharing calculations
 *
 * PRESERVATION: All OSRIC experience rules and calculations preserved exactly.
 */

import { BaseCommand, type CommandResult } from '../../core/Command';
import type { GameContext } from '../../core/GameContext';
import { calculateGroupXP, calculateMonsterXP } from '../../core/MonsterXP';
import {
  determineLevel,
  getExperienceForNextLevel,
} from '../../rules/experience/LevelProgressionRules';
import { COMMAND_TYPES } from '../../types/constants';
import type { Character, Monster } from '../../types/entities';

export interface GainExperienceParameters {
  characterId: string;
  experienceSource: {
    type: 'combat' | 'treasure' | 'story' | 'other';
    amount?: number; // For direct XP awards (treasure, story)
    monsters?: Monster[]; // For combat XP calculation
    treasureValue?: number; // Gold pieces for treasure XP (1 gp = 1 XP)
    description?: string; // Description of the experience source
  };
  partyShare?: {
    enabled: boolean;
    partyMemberIds: string[]; // Character IDs to share XP with
    shareRatio?: number; // Custom share ratio (default: equal shares)
  };
  applyClassModifiers?: boolean; // Apply class-specific XP bonuses/penalties
}

export class GainExperienceCommand extends BaseCommand {
  readonly type = COMMAND_TYPES.GAIN_EXPERIENCE;

  constructor(private parameters: GainExperienceParameters) {
    super(parameters.characterId, parameters.partyShare?.partyMemberIds || []);
  }

  async execute(context: GameContext): Promise<CommandResult> {
    try {
      const {
        characterId,
        experienceSource,
        partyShare,
        applyClassModifiers = true,
      } = this.parameters;

      // Get the character
      const character = context.getEntity<Character>(characterId);
      if (!character) {
        return this.createFailureResult(`Character with ID "${characterId}" not found`);
      }

      // Calculate base experience points
      let baseExperiencePoints = 0;

      switch (experienceSource.type) {
        case 'combat': {
          if (!experienceSource.monsters || experienceSource.monsters.length === 0) {
            return this.createFailureResult('Combat experience requires monsters to be specified');
          }
          const groupXP = calculateGroupXP({
            monsters: experienceSource.monsters,
            characters: [character], // Single character
            encounterDifficulty: 'normal',
          });
          baseExperiencePoints = groupXP.get(character.id) || 0;
          break;
        }

        case 'treasure':
          if (experienceSource.treasureValue) {
            // OSRIC rule: 1 gp = 1 XP
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

      // Apply class-specific modifiers if enabled
      let finalExperiencePoints = baseExperiencePoints;
      if (applyClassModifiers) {
        finalExperiencePoints = this.applyClassExperienceModifiers(character, baseExperiencePoints);
      }

      // Handle party sharing
      if (partyShare?.enabled && partyShare.partyMemberIds.length > 0) {
        const shareResult = this.calculatePartyExperienceShare(
          context,
          finalExperiencePoints,
          partyShare.partyMemberIds,
          partyShare.shareRatio
        );

        if (!shareResult.success) {
          return shareResult;
        }

        // Apply experience to all party members
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

      // Apply experience to single character
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
    return this.validateEntities(context);
  }

  getRequiredRules(): string[] {
    return ['experience-gain', 'level-progression'];
  }

  /**
   * Apply class-specific experience modifiers
   */
  private applyClassExperienceModifiers(character: Character, baseXP: number): number {
    let modifiedXP = baseXP;

    // Multi-class characters split XP between classes
    const classEntries = Object.entries(character.classes || {});
    if (classEntries.length > 1) {
      // OSRIC rule: Multi-class characters split XP equally among all classes
      modifiedXP = Math.floor(baseXP / classEntries.length);
    }

    // Prime requisite bonuses (from OSRIC)
    // Characters with high prime requisites get XP bonuses
    const primeRequisiteBonus = this.calculatePrimeRequisiteBonus(character);
    modifiedXP = Math.floor(modifiedXP * primeRequisiteBonus);

    return modifiedXP;
  }

  /**
   * Calculate prime requisite bonus for experience
   */
  private calculatePrimeRequisiteBonus(character: Character): number {
    // OSRIC rules for prime requisite experience bonuses
    const primeRequisites = this.getPrimeRequisites(character.class);

    if (primeRequisites.length === 0) return 1.0;

    // For classes with multiple prime requisites, use the average
    const totalScore = primeRequisites.reduce((sum, stat) => {
      return sum + character.abilities[stat];
    }, 0);

    const averageScore = totalScore / primeRequisites.length;

    // OSRIC experience bonuses based on prime requisite scores
    if (averageScore >= 16) return 1.1; // +10%
    if (averageScore >= 13) return 1.05; // +5%
    if (averageScore <= 8) return 0.95; // -5%

    return 1.0; // No bonus/penalty
  }

  /**
   * Get prime requisites for a character class
   */
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

  /**
   * Calculate party experience sharing
   */
  private calculatePartyExperienceShare(
    context: GameContext,
    totalXP: number,
    partyMemberIds: string[],
    shareRatio?: number
  ): CommandResult & { experienceShares?: Record<string, number> } {
    const experienceShares: Record<string, number> = {};

    // Validate all party members exist
    const validMembers: Character[] = [];
    for (const memberId of partyMemberIds) {
      const member = context.getEntity<Character>(memberId);
      if (!member) {
        return {
          success: false,
          message: `Party member with ID "${memberId}" not found`,
        };
      }
      validMembers.push(member);
    }

    if (validMembers.length === 0) {
      return {
        success: false,
        message: 'No valid party members found for experience sharing',
      };
    }

    // Calculate shares (default: equal shares)
    if (!shareRatio) {
      // Equal shares for all party members
      const sharePerMember = Math.floor(totalXP / validMembers.length);
      for (const member of validMembers) {
        experienceShares[member.id] = sharePerMember;
      }
    } else {
      // Custom share ratio (implementation would depend on specific sharing rules)
      // For now, fall back to equal shares
      const sharePerMember = Math.floor(totalXP / validMembers.length);
      for (const member of validMembers) {
        experienceShares[member.id] = sharePerMember;
      }
    }

    return {
      success: true,
      message: 'Experience shares calculated',
      experienceShares,
    };
  }
}
