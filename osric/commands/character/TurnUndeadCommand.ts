import type { CharacterId, MonsterId } from '@osric/types';
import { BaseCommand, type CommandResult, type EntityId } from '../../core/Command';
import type { GameContext } from '../../core/GameContext';
import { COMMAND_TYPES, RULE_NAMES } from '../../types/constants';
import type { Character, Monster } from '../../types/entities';

export interface TurnUndeadParameters {
  characterId: string | CharacterId;
  targetUndeadIds: Array<string | MonsterId>;
  situationalModifiers?: {
    holySymbolBonus?: number;
    spellBonus?: number;
    areaBonus?: number;
    alignment?: 'good' | 'neutral' | 'evil';
    isEvil?: boolean;
  };
  massAttempt?: boolean;
}

export class TurnUndeadCommand extends BaseCommand<TurnUndeadParameters> {
  readonly type = COMMAND_TYPES.TURN_UNDEAD;
  readonly parameters: TurnUndeadParameters;

  constructor(parameters: TurnUndeadParameters, actorId: EntityId, targetIds: EntityId[] = []) {
    super(parameters, actorId, targetIds);
    this.parameters = parameters;
  }

  async execute(context: GameContext): Promise<CommandResult> {
    try {
      const { characterId, targetUndeadIds, situationalModifiers, massAttempt } = this.parameters;

      const character = context.getEntity<Character>(characterId);
      if (!character) {
        return this.createFailureResult(`Character with ID "${characterId}" not found`);
      }

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

      const turnAbilityCheck = this.validateTurnUndeadAbility(character);
      if (!turnAbilityCheck.canTurn) {
        return this.createFailureResult(turnAbilityCheck.reason || 'Cannot turn undead');
      }

      const targetUndead: Monster[] = [];
      for (const undeadId of targetUndeadIds) {
        const undead = context.getEntity<Monster>(undeadId);
        if (!undead) {
          return this.createFailureResult(`Undead creature with ID "${undeadId}" not found`);
        }

        targetUndead.push(undead);
      }

      if (targetUndead.length === 0) {
        return this.createFailureResult('No valid undead targets found');
      }

      // Normalize temporary key to the convention used by rules
      context.setTemporary('character:turn-undead:params', this.parameters);

      const turnResults = this.performTurnUndead(
        character,
        targetUndead,
        situationalModifiers,
        massAttempt
      );

      const affectedUndead: string[] = [];
      for (const result of turnResults.individualResults) {
        if (result.effect !== 'no-effect') {
          const undead = context.getEntity<Monster>(result.undeadId);
          if (undead) {
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
    return this.validateEntitiesExist(context);
  }

  getRequiredRules(): string[] {
    return [RULE_NAMES.TURN_UNDEAD];
  }

  private parseHitDice(hitDice: string): number {
    const match = hitDice.match(/^(\d+)([+-]\d+)?$/);
    if (!match) {
      return 1;
    }

    const dice = Number.parseInt(match[1], 10);
    const bonus = match[2] ? Number.parseInt(match[2], 10) : 0;

    return dice + (bonus > 0 ? 1 : 0);
  }

  private validateTurnUndeadAbility(character: Character): {
    canTurn: boolean;
    effectiveLevel?: number;
    reason?: string;
  } {
    const characterClass = character.class.toLowerCase();
    const level = character.experience.level;

    if (characterClass === 'cleric' || characterClass === 'druid') {
      return { canTurn: true, effectiveLevel: level };
    }

    if (characterClass === 'paladin') {
      if (level >= 3) {
        const effectiveLevel = Math.max(1, level - 2);
        return { canTurn: true, effectiveLevel };
      }
      return { canTurn: false, reason: 'Paladins can only turn undead starting at level 3' };
    }

    if (characterClass.includes('cleric')) {
      return { canTurn: true, effectiveLevel: level };
    }

    return { canTurn: false, reason: 'Only clerics, druids, and paladins can turn undead' };
  }

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

    const dice1 = Math.floor(Math.random() * 6) + 1;
    const dice2 = Math.floor(Math.random() * 6) + 1;
    const baseRoll = dice1 + dice2;

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

      if (!massAttempt && result.effect !== 'no-effect') {
        break;
      }
    }

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
    const levelDifference = clericLevel - undeadHD;

    let targetNumber: number;
    let destroyOnSuccess = false;

    if (levelDifference >= 7) {
      return {
        effect: isEvil ? 'commanded' : 'destroyed',
        duration: isEvil ? 24 * 60 : undefined,
        count: 2 + Math.floor(Math.random() * 6),
      };
    }

    if (levelDifference >= 5) {
      targetNumber = 4;
      destroyOnSuccess = !isEvil;
    } else if (levelDifference >= 3) {
      targetNumber = 7;
    } else if (levelDifference >= 1) {
      targetNumber = 10;
    } else if (levelDifference >= -1) {
      targetNumber = 13;
    } else {
      return { effect: 'no-effect' };
    }

    if (roll >= targetNumber) {
      let effect: 'destroyed' | 'commanded' | 'turned';

      if (destroyOnSuccess) {
        effect = 'destroyed';
      } else {
        effect = isEvil ? 'commanded' : 'turned';
      }

      const baseCount = 1 + Math.floor(Math.random() * 6);
      const count = Math.max(1, baseCount + Math.floor(levelDifference / 2));

      return {
        effect,
        duration:
          effect === 'commanded' || effect === 'turned'
            ? 3 + Math.floor(Math.random() * 6)
            : undefined,
        count,
      };
    }

    return { effect: 'no-effect' };
  }

  private getTurnDuration(clericLevel: number, undeadHD: number): number {
    const baseDuration =
      3 +
      Math.floor(Math.random() * 4) +
      Math.floor(Math.random() * 4) +
      Math.floor(Math.random() * 4);
    const levelBonus = Math.max(0, clericLevel - undeadHD);

    return baseDuration + levelBonus;
  }
}
