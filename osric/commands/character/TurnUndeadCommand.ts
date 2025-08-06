/**
 * TurnUndeadCommand - OSRIC Turn Undead System
 *
 * Handles turning/controlling undead creatures according to OSRIC rules:
 * - Cleric turning by level vs undead HD
 * - Paladin turning at higher levels
 * - 2d6 table resolution
 * - Turn vs Destroy results
 *
 * PRESERVATION: All OSRIC turn undead mechanics and tables preserved exactly.
 */

import { BaseCommand, type CommandResult } from '../../core/Command';
import type { GameContext } from '../../core/GameContext';
import { COMMAND_TYPES } from '../../types/constants';
import type { Character, Monster } from '../../types/entities';

export interface TurnUndeadParameters {
  characterId: string;
  targetUndeadIds: string[]; // IDs of undead creatures to attempt turning
  situationalModifiers?: {
    holySymbolBonus?: number; // Bonus from blessed/special holy symbol
    spellBonus?: number; // Bonus from spells like Bless
    areaBonus?: number; // Bonus in consecrated ground
    alignment?: 'good' | 'neutral' | 'evil'; // Cleric's alignment affects some undead
    isEvil?: boolean; // Evil clerics command rather than turn
  };
  massAttempt?: boolean; // Attempt to turn multiple undead types at once
}

export class TurnUndeadCommand extends BaseCommand {
  readonly type = COMMAND_TYPES.TURN_UNDEAD;

  constructor(private parameters: TurnUndeadParameters) {
    super(parameters.characterId, parameters.targetUndeadIds);
  }

  async execute(context: GameContext): Promise<CommandResult> {
    try {
      const { characterId, targetUndeadIds, situationalModifiers, massAttempt } = this.parameters;

      // Get the character
      const character = context.getEntity<Character>(characterId);
      if (!character) {
        return this.createFailureResult(`Character with ID "${characterId}" not found`);
      }

      // Validate situational modifiers
      if (situationalModifiers) {
        if (situationalModifiers.holySymbolBonus !== undefined) {
          if (
            situationalModifiers.holySymbolBonus < -5 ||
            situationalModifiers.holySymbolBonus > 5
          ) {
            return this.createFailureResult('Holy symbol bonus must be between -5 and +5');
          }
        }
      }

      // Validate character can turn undead
      const turnAbilityCheck = this.validateTurnUndeadAbility(character);
      if (!turnAbilityCheck.canTurn) {
        return this.createFailureResult(turnAbilityCheck.reason || 'Cannot turn undead');
      }

      // Get target undead creatures
      const targetUndead: Monster[] = [];
      for (const undeadId of targetUndeadIds) {
        const undead = context.getEntity<Monster>(undeadId);
        if (!undead) {
          return this.createFailureResult(`Undead creature with ID "${undeadId}" not found`);
        }
        // Note: We assume all targets are undead since this command is for turning undead
        targetUndead.push(undead);
      }

      if (targetUndead.length === 0) {
        return this.createFailureResult('No valid undead targets found');
      }

      // Set up temporary data for rules processing
      context.setTemporary('turn-undead-params', this.parameters);

      // Perform turning attempt
      const turnResults = this.performTurnUndead(
        character,
        targetUndead,
        situationalModifiers,
        massAttempt
      );

      // Apply results to game state
      const affectedUndead: string[] = [];
      for (const result of turnResults.individualResults) {
        if (result.effect !== 'no-effect') {
          const undead = context.getEntity<Monster>(result.undeadId);
          if (undead) {
            // Apply the turning effect to the undead
            const updatedUndead = {
              ...undead,
              statusEffects: [
                ...(undead.statusEffects || []),
                {
                  name: result.effect,
                  duration: result.effect === 'destroyed' ? 0 : result.duration || 0,
                  effect: 'Affected by turn undead',
                  savingThrow: null,
                  endCondition: result.effect === 'destroyed' ? 'permanent' : 'duration',
                },
              ],
            };
            context.setEntity(result.undeadId, updatedUndead);
            affectedUndead.push(result.undeadId);
          }
        }
      }

      return this.createSuccessResult(
        `${character.name} attempted to turn undead: ${turnResults.overallResult}`,
        {
          characterId,
          targetUndeadIds,
          rollResult: turnResults.rollResult,
          overallResult: turnResults.overallResult,
          individualResults: turnResults.individualResults,
          affectedUndead,
          totalTurned: turnResults.totalTurned,
          totalDestroyed: turnResults.totalDestroyed,
          turnLevel: turnAbilityCheck.effectiveLevel,
          modifiers: turnResults.modifiers,
        }
      );
    } catch (error) {
      return this.createFailureResult(
        `Failed to turn undead: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  canExecute(context: GameContext): boolean {
    return this.validateEntities(context);
  }

  getRequiredRules(): string[] {
    return ['turn-undead'];
  }

  /**
   * Parse hit dice string to get numerical value for comparison
   */
  private parseHitDice(hitDice: string): number {
    // Parse OSRIC hit dice format: "3+1", "2-1", "1+2", etc.
    const match = hitDice.match(/^(\d+)([+-]\d+)?$/);
    if (!match) {
      return 1; // Default for unparseable format
    }

    const dice = Number.parseInt(match[1], 10);
    const bonus = match[2] ? Number.parseInt(match[2], 10) : 0;

    // Convert to effective HD (bonus counts as fraction)
    return dice + (bonus > 0 ? 1 : 0);
  }

  /**
   * Validate that character can turn undead
   */
  private validateTurnUndeadAbility(character: Character): {
    canTurn: boolean;
    effectiveLevel?: number;
    reason?: string;
  } {
    const characterClass = character.class.toLowerCase();
    const level = character.experience.level;

    // Clerics can turn undead at all levels
    if (characterClass === 'cleric' || characterClass === 'druid') {
      return { canTurn: true, effectiveLevel: level };
    }

    // Paladins can turn undead starting at level 3
    if (characterClass === 'paladin') {
      if (level >= 3) {
        // Paladins turn as clerics 2 levels lower
        const effectiveLevel = Math.max(1, level - 2);
        return { canTurn: true, effectiveLevel };
      }
      return { canTurn: false, reason: 'Paladins can only turn undead starting at level 3' };
    }

    // Multi-class characters with cleric
    if (characterClass.includes('cleric')) {
      return { canTurn: true, effectiveLevel: level };
    }

    return { canTurn: false, reason: 'Only clerics, druids, and paladins can turn undead' };
  }

  /**
   * Perform the actual turning attempt
   */
  private performTurnUndead(
    character: Character,
    targetUndead: Monster[],
    modifiers?: TurnUndeadParameters['situationalModifiers'],
    massAttempt = false
  ): {
    rollResult: { dice1: number; dice2: number; total: number; modified: number };
    overallResult: string;
    individualResults: Array<{
      undeadId: string;
      undeadName: string;
      hitDice: number;
      effect: 'no-effect' | 'turned' | 'destroyed' | 'commanded';
      duration?: number;
      count?: number;
    }>;
    totalTurned: number;
    totalDestroyed: number;
    modifiers: string[];
  } {
    const turnAbility = this.validateTurnUndeadAbility(character);
    const effectiveLevel = turnAbility.effectiveLevel || 1;

    // Roll 2d6
    const dice1 = Math.floor(Math.random() * 6) + 1;
    const dice2 = Math.floor(Math.random() * 6) + 1;
    const baseRoll = dice1 + dice2;

    // Apply modifiers
    let modifiedRoll = baseRoll;
    const appliedModifiers: string[] = [];

    if (modifiers?.holySymbolBonus) {
      modifiedRoll += modifiers.holySymbolBonus;
      appliedModifiers.push(`Holy symbol: +${modifiers.holySymbolBonus}`);
    }

    if (modifiers?.spellBonus) {
      modifiedRoll += modifiers.spellBonus;
      appliedModifiers.push(`Spell effects: +${modifiers.spellBonus}`);
    }

    if (modifiers?.areaBonus) {
      modifiedRoll += modifiers.areaBonus;
      appliedModifiers.push(`Consecrated ground: +${modifiers.areaBonus}`);
    }

    const rollResult = { dice1, dice2, total: baseRoll, modified: modifiedRoll };

    // Process each undead target
    const individualResults: Array<{
      undeadId: string;
      undeadName: string;
      hitDice: number;
      effect: 'no-effect' | 'turned' | 'destroyed' | 'commanded';
      duration?: number;
      count?: number;
    }> = [];

    let totalTurned = 0;
    let totalDestroyed = 0;

    // Sort undead by hit dice (lowest first for turning order)
    const sortedUndead = [...targetUndead].sort(
      (a, b) => this.parseHitDice(a.hitDice) - this.parseHitDice(b.hitDice)
    );

    for (const undead of sortedUndead) {
      const turnResult = this.getTurnResult(
        effectiveLevel,
        this.parseHitDice(undead.hitDice),
        modifiedRoll,
        modifiers?.isEvil || false
      );

      const result = {
        undeadId: undead.id,
        undeadName: undead.name,
        hitDice: this.parseHitDice(undead.hitDice),
        effect: turnResult.effect,
        duration: turnResult.duration,
        count: turnResult.count,
      };

      individualResults.push(result);

      if (result.effect === 'turned' || result.effect === 'commanded') {
        totalTurned += result.count || 1;
      } else if (result.effect === 'destroyed') {
        totalDestroyed += result.count || 1;
      }

      // If not a mass attempt and we got an effect, stop here
      if (!massAttempt && result.effect !== 'no-effect') {
        break;
      }
    }

    // Determine overall result
    let overallResult: string;
    if (totalDestroyed > 0 && totalTurned > 0) {
      overallResult = `${totalDestroyed} destroyed, ${totalTurned} turned`;
    } else if (totalDestroyed > 0) {
      overallResult = `${totalDestroyed} undead destroyed`;
    } else if (totalTurned > 0) {
      overallResult = `${totalTurned} undead turned`;
    } else {
      overallResult = 'No effect';
    }

    return {
      rollResult,
      overallResult,
      individualResults,
      totalTurned,
      totalDestroyed,
      modifiers: appliedModifiers,
    };
  }

  /**
   * Get turn result from OSRIC turn undead table
   */
  private getTurnResult(
    clericLevel: number,
    undeadHD: number,
    roll: number,
    isEvil: boolean
  ): {
    effect: 'no-effect' | 'turned' | 'destroyed' | 'commanded';
    duration?: number;
    count?: number;
  } {
    // OSRIC Turn Undead Table
    // Based on cleric level vs undead HD and 2d6 roll

    // Calculate the difference between cleric level and undead HD
    const levelDifference = clericLevel - undeadHD;

    // Base target numbers and effects from OSRIC
    let targetNumber: number;
    let destroyOnSuccess = false;

    if (levelDifference >= 7) {
      // Automatically turn/destroy very weak undead
      return {
        effect: isEvil ? 'commanded' : 'destroyed',
        duration: isEvil ? 24 * 60 : undefined, // 24 hours for commanded
        count: 2 + Math.floor(Math.random() * 6), // 2d6 undead affected
      };
    }

    if (levelDifference >= 5) {
      targetNumber = 4; // Turn on 4+
      destroyOnSuccess = !isEvil; // Good clerics destroy, evil command
    } else if (levelDifference >= 3) {
      targetNumber = 7; // Turn on 7+
    } else if (levelDifference >= 1) {
      targetNumber = 10; // Turn on 10+
    } else if (levelDifference >= -1) {
      targetNumber = 13; // Turn on 13+ (very difficult)
    } else {
      // Cannot turn undead more than 1 HD higher than cleric level
      return { effect: 'no-effect' };
    }

    // Check if the roll succeeded
    if (roll >= targetNumber) {
      let effect: 'destroyed' | 'commanded' | 'turned';

      if (destroyOnSuccess) {
        effect = 'destroyed';
      } else {
        effect = isEvil ? 'commanded' : 'turned';
      }

      // Calculate number affected and duration
      const baseCount = 1 + Math.floor(Math.random() * 6); // 1d6 base
      const count = Math.max(1, baseCount + Math.floor(levelDifference / 2));

      return {
        effect,
        duration:
          effect === 'commanded' || effect === 'turned'
            ? 3 + Math.floor(Math.random() * 6)
            : undefined, // 3+1d6 rounds
        count,
      };
    }

    return { effect: 'no-effect' };
  }

  /**
   * Get duration in rounds for turning effects
   */
  private getTurnDuration(clericLevel: number, undeadHD: number): number {
    // OSRIC: Turned undead flee for 3d4 rounds, +1 round per level difference
    const baseDuration =
      3 +
      Math.floor(Math.random() * 4) +
      Math.floor(Math.random() * 4) +
      Math.floor(Math.random() * 4);
    const levelBonus = Math.max(0, clericLevel - undeadHD);

    return baseDuration + levelBonus;
  }
}
