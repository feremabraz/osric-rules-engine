import type { Command } from '@osric/core/Command';
import { DiceEngine } from '@osric/core/Dice';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, type RuleResult } from '@osric/core/Rule';
import type { CharacterId, MonsterId } from '@osric/types';
import type { Character } from '@osric/types/character';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';
import type { Monster } from '@osric/types/monster';

export interface MoraleCheckParams {
  characterId: string | CharacterId;
  groupIds?: Array<string | CharacterId | MonsterId>;
  trigger: 'damage' | 'leader_death' | 'overwhelming_odds' | 'rally_attempt' | 'other';
  situationalModifiers?: {
    leadershipBonus?: number;
    eliteUnit?: boolean;
    veteranUnit?: boolean;
    inexperiencedUnit?: boolean;
    favorableTerrain?: boolean;
    unfavorableTerrain?: boolean;
    religiousZeal?: boolean;
    magicalFear?: boolean;
    outnumbered?: number;
    outnumberedRatio?: number;
    cornered?: boolean;
    overwhelming?: boolean;
    sharedDanger?: number;
    defenderAdvantage?: boolean;
    customModifiers?: Record<string, number>;
  };
  customContext?: string;
}

export type MoraleOutcome =
  | 'stand_ground'
  | 'fighting_withdrawal'
  | 'retreat'
  | 'rout'
  | 'surrender';

export interface MoraleCheckResult {
  rollResult: number;
  baseValue: number;
  totalModifier: number;
  finalValue: number;
  passed: boolean;
  outcome: MoraleOutcome;
  description: string;
  modifierBreakdown: Array<{
    source: string;
    value: number;
  }>;
}

const OSRIC_MORALE_MODIFIERS = {
  damage: -5,
  leader_death: -15,
  overwhelming_odds: -10,
  rally_attempt: 10,
  other: 0,

  elite_unit: 5,
  veteran_unit: 3,
  inexperienced_unit: -5,
  cornered: -5,
  overwhelming: -15,
  shared_danger: 3,
  defender_advantage: 2,

  favorable_terrain: 2,
  unfavorable_terrain: -3,

  religious_zeal: 5,
  magical_fear: -10,
  outnumbered_2_to_1: -5,
  outnumbered_3_to_1: -10,
} as const;

export class MoraleRules extends BaseRule {
  readonly name = RULE_NAMES.MORALE_CHECK;
  readonly priority = 100;

  canApply(_context: GameContext, command: Command): boolean {
    return command.type === COMMAND_TYPES.MORALE_CHECK;
  }

  async execute(context: GameContext, command: Command): Promise<RuleResult> {
    try {
      const moraleData = this.extractMoraleData(command);
      if (!moraleData) {
        return this.createFailureResult('No morale check data provided');
      }

      const character = context.getEntity<Character | Monster>(moraleData.characterId);
      if (!character) {
        return this.createFailureResult(`Character not found: ${moraleData.characterId}`);
      }

      const result = this.performMoraleCheck(character, moraleData, context);

      const description = this.generateDescription(character, result, moraleData);

      let groupEffects = undefined;
      if (moraleData.groupIds && moraleData.groupIds.length > 0) {
        groupEffects = this.calculateGroupEffects(moraleData.groupIds, result, context);
      }

      const resultData = {
        moraleCheck: result,
        rollResult: result.rollResult,
        baseValue: result.baseValue,
        totalModifier: result.totalModifier,
        finalValue: result.finalValue,
        outcome: result.outcome,
        modifiers: result.modifierBreakdown.map(
          (m) => `${m.source}: ${m.value >= 0 ? '+' : ''}${m.value}`
        ),
        ...(groupEffects && { groupEffects }),
      };

      if (result.passed) {
        return this.createSuccessResult(description, resultData);
      }

      return this.createFailureResult(description, resultData);
    } catch (error) {
      return this.createFailureResult(
        `Morale check error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private extractMoraleData(command: Command): MoraleCheckParams | null {
    if ('params' in command && command.params) {
      return command.params as MoraleCheckParams;
    }

    if ('characterId' in command || 'trigger' in command) {
      return command as unknown as MoraleCheckParams;
    }

    return null;
  }

  private performMoraleCheck(
    character: Character | Monster,
    params: MoraleCheckParams,
    _context: GameContext
  ): MoraleCheckResult {
    const baseValue = this.calculateBaseMorale(character);

    const modifierBreakdown = this.calculateModifiers(params, character);
    const totalModifier = modifierBreakdown.reduce((sum, mod) => sum + mod.value, 0);

    const finalValue = baseValue + totalModifier;

    const rollResult = DiceEngine.roll('1d100').total;

    const passed = rollResult <= finalValue;

    const outcome = this.determineMoraleOutcome(rollResult, finalValue, params.trigger);

    const description = this.generateOutcomeDescription(character, rollResult, finalValue, outcome);

    return {
      rollResult,
      baseValue,
      totalModifier,
      finalValue,
      passed,
      outcome,
      description,
      modifierBreakdown,
    };
  }

  private calculateBaseMorale(character: Character | Monster): number {
    if ('level' in character && character.level) {
      return Math.min(95, 50 + character.level * 5);
    }

    return 50;
  }

  private calculateModifiers(
    params: MoraleCheckParams,
    _character: Character | Monster
  ): Array<{ source: string; value: number }> {
    const modifiers: Array<{ source: string; value: number }> = [];

    const triggerMod = OSRIC_MORALE_MODIFIERS[params.trigger];
    if (triggerMod !== 0) {
      modifiers.push({
        source: this.getTriggerDescription(params.trigger),
        value: triggerMod,
      });
    }

    if (params.situationalModifiers) {
      const sitMods = params.situationalModifiers;

      if (sitMods.leadershipBonus) {
        const bonus = Math.min(10, Math.floor(sitMods.leadershipBonus / 2));
        modifiers.push({
          source: 'Leadership',
          value: bonus,
        });
      }

      if (sitMods.eliteUnit) {
        modifiers.push({
          source: 'Elite unit',
          value: OSRIC_MORALE_MODIFIERS.elite_unit,
        });
      }

      if (sitMods.veteranUnit) {
        modifiers.push({
          source: 'Veteran unit',
          value: OSRIC_MORALE_MODIFIERS.veteran_unit,
        });
      }

      if (sitMods.inexperiencedUnit) {
        modifiers.push({
          source: 'Inexperienced unit',
          value: OSRIC_MORALE_MODIFIERS.inexperienced_unit,
        });
      }

      if (sitMods.favorableTerrain) {
        modifiers.push({
          source: 'Favorable terrain',
          value: OSRIC_MORALE_MODIFIERS.favorable_terrain,
        });
      }

      if (sitMods.unfavorableTerrain) {
        modifiers.push({
          source: 'Unfavorable terrain',
          value: OSRIC_MORALE_MODIFIERS.unfavorable_terrain,
        });
      }

      if (sitMods.religiousZeal) {
        modifiers.push({
          source: 'Religious zeal',
          value: OSRIC_MORALE_MODIFIERS.religious_zeal,
        });
      }

      if (sitMods.magicalFear) {
        modifiers.push({
          source: 'Magical fear',
          value: OSRIC_MORALE_MODIFIERS.magical_fear,
        });
      }

      if (sitMods.outnumbered || sitMods.outnumberedRatio) {
        const ratio = sitMods.outnumbered || sitMods.outnumberedRatio || 0;
        let penalty = 0;
        let description = '';

        if (ratio >= 5) {
          penalty = -15;
          description = `Outnumbered ${ratio}:1`;
        } else if (ratio >= 3) {
          penalty = OSRIC_MORALE_MODIFIERS.outnumbered_3_to_1;
          description = `Outnumbered ${ratio}:1`;
        } else if (ratio >= 2) {
          penalty = OSRIC_MORALE_MODIFIERS.outnumbered_2_to_1;
          description = `Outnumbered ${ratio}:1`;
        }

        if (penalty < 0) {
          modifiers.push({
            source: description,
            value: penalty,
          });
        }
      }

      if (sitMods.cornered) {
        modifiers.push({
          source: 'Cornered',
          value: OSRIC_MORALE_MODIFIERS.cornered,
        });
      }

      if (sitMods.overwhelming) {
        modifiers.push({
          source: 'Overwhelming odds',
          value: OSRIC_MORALE_MODIFIERS.overwhelming,
        });
      }

      if (sitMods.sharedDanger) {
        modifiers.push({
          source: 'Shared danger',
          value: sitMods.sharedDanger,
        });
      }

      if (sitMods.defenderAdvantage) {
        modifiers.push({
          source: 'Favorable terrain',
          value: OSRIC_MORALE_MODIFIERS.favorable_terrain,
        });
      }

      if (sitMods.customModifiers) {
        for (const [source, value] of Object.entries(sitMods.customModifiers)) {
          modifiers.push({ source, value });
        }
      }
    }

    return modifiers;
  }

  private getTriggerDescription(trigger: MoraleCheckParams['trigger']): string {
    const descriptions = {
      damage: 'Damage taken',
      leader_death: 'Leader death',
      overwhelming_odds: 'Overwhelming odds',
      rally_attempt: 'Rally attempt',
      other: 'Other circumstances',
    };
    return descriptions[trigger];
  }

  private determineMoraleOutcome(
    roll: number,
    target: number,
    _trigger: MoraleCheckParams['trigger']
  ): MoraleOutcome {
    if (roll <= target) {
      return 'stand_ground';
    }

    const failureMargin = roll - target;

    if (failureMargin >= 45) {
      return 'surrender';
    }
    if (failureMargin >= 36) {
      return 'rout';
    }
    if (failureMargin >= 16) {
      return 'retreat';
    }
    return 'fighting_withdrawal';
  }

  private generateOutcomeDescription(
    character: Character | Monster,
    roll: number,
    target: number,
    outcome: MoraleOutcome
  ): string {
    const characterName = character.name || character.id;

    const outcomeDescriptions = {
      stand_ground: 'maintains morale and stands ground',
      fighting_withdrawal: 'makes a fighting withdrawal',
      retreat: 'retreats from combat',
      rout: 'breaks and routs',
      surrender: 'surrenders or flees',
    };

    return `Morale check: ${roll} vs ${target} - ${characterName} ${outcomeDescriptions[outcome]}`;
  }

  private generateDescription(
    character: Character | Monster,
    result: MoraleCheckResult,
    params: MoraleCheckParams
  ): string {
    const characterName = character.name || character.id;
    const triggerDesc = this.getTriggerDescription(params.trigger);

    const modifierStr =
      result.totalModifier >= 0 ? `+${result.totalModifier}` : `${result.totalModifier}`;

    if (result.passed) {
      return `Morale check (${triggerDesc}): ${result.rollResult} vs ${result.finalValue} (${modifierStr}) - ${characterName} maintains morale`;
    }

    return `Morale check (${triggerDesc}): ${result.rollResult} vs ${result.finalValue} (${modifierStr}) - ${characterName} ${result.outcome.replace('_', ' ')}`;
  }

  // Removed custom RNG; using DiceEngine.roll for canonical dice

  private calculateGroupEffects(
    groupIds: Array<string | CharacterId | MonsterId>,
    _result: MoraleCheckResult,
    _context: GameContext
  ): Record<string, string | number> {
    return {
      groupSize: groupIds.length,
      affectedMembers: groupIds.join(', '),
      cascadingEffects: groupIds.length > 3 ? 'potential_chain_reaction' : 'limited_impact',
    };
  }
}
