import type { Command } from '../../core/Command';
import type { GameContext } from '../../core/GameContext';
import { BaseRule, type RuleResult } from '../../core/Rule';
import { COMMAND_TYPES, RULE_NAMES } from '../../types/constants';
import type { Character, Monster } from '../../types/entities';

export interface LoyaltyCheckParams {
  characterId: string;
  leaderId?: string;
  followerIds?: string[];
  trigger:
    | 'initial_hire'
    | 'combat_casualties'
    | 'dangerous_mission'
    | 'treasure_share'
    | 'leader_behavior'
    | 'periodic_check'
    | 'other';
  situationalModifiers?: {
    leadershipBonus?: number;
    generousPayment?: boolean;
    harshTreatment?: boolean;
    sharedDanger?: boolean;
    successfulMissions?: number;
    failedMissions?: number;
    treasureBonus?: number;
    magicalInfluence?: number;
    customModifiers?: Record<string, number>;
  };
  customContext?: string;
}

export type LoyaltyOutcome =
  | 'loyal_devotion'
  | 'remain_loyal'
  | 'wavering'
  | 'disloyal'
  | 'betrayal'
  | 'desertion';

export interface LoyaltyCheckResult {
  rollResult: number;
  baseValue: number;
  totalModifier: number;
  finalValue: number;
  passed: boolean;
  outcome: LoyaltyOutcome;
  description: string;
  futureModifier: number;
  modifierBreakdown: Array<{
    source: string;
    value: number;
  }>;
}

const OSRIC_LOYALTY_MODIFIERS = {
  initial_hire: 0,
  combat_casualties: -10,
  dangerous_mission: -5,
  treasure_share: 5,
  leader_behavior: 0,
  periodic_check: 0,
  other: 0,

  generous_payment: 10,
  harsh_treatment: -15,
  shared_danger: 5,
  successful_mission: 3,
  failed_mission: -3,
  magical_charm: 20,
  magical_fear: -20,
  religious_devotion: 15,

  excellent_leader: 10,
  poor_leader: -10,
  betrayed_trust: -25,
  saved_follower: 15,

  treasure_bonus_minor: 5,
  treasure_bonus_major: 10,
  unpaid_wages: -20,
  lost_equipment: -5,

  popular_leader: 5,
  unpopular_leader: -10,
  group_cohesion: 3,
  group_conflict: -5,
} as const;

const OSRIC_BASE_LOYALTY = {
  3: 25,
  4: 30,
  5: 35,
  6: 40,
  7: 45,
  8: 50,
  9: 55,
  10: 60,
  11: 65,
  12: 70,
  13: 75,
  14: 80,
  15: 85,
  16: 90,
  17: 95,
  18: 99,
  19: 99,
  20: 99,
  21: 99,
  22: 99,
  23: 99,
  24: 99,
  25: 99,
} as const;

export class LoyaltyRules extends BaseRule {
  readonly name = RULE_NAMES.LOYALTY_CHECK;
  readonly priority = 150;

  canApply(_context: GameContext, command: Command): boolean {
    return command.type === COMMAND_TYPES.LOYALTY_CHECK;
  }

  async execute(context: GameContext, command: Command): Promise<RuleResult> {
    try {
      const loyaltyData = this.extractLoyaltyData(command);
      if (!loyaltyData) {
        return this.createFailureResult('No loyalty check data provided');
      }

      const character = context.getEntity<Character | Monster>(loyaltyData.characterId);
      if (!character) {
        return this.createFailureResult(`Character not found: ${loyaltyData.characterId}`);
      }

      let leader: Character | Monster | null = null;
      if (loyaltyData.leaderId) {
        leader = context.getEntity<Character | Monster>(loyaltyData.leaderId);
        if (!leader) {
          return this.createFailureResult(`Leader not found: ${loyaltyData.leaderId}`);
        }
      }

      const result = this.performLoyaltyCheck(character, leader, loyaltyData, context);

      const description = this.generateDescription(character, leader, result, loyaltyData);

      return this.createSuccessResult(description, {
        loyaltyCheck: result,
        rollResult: result.rollResult,
        baseValue: result.baseValue,
        totalModifier: result.totalModifier,
        finalValue: result.finalValue,
        outcome: result.outcome,
        futureModifier: result.futureModifier,
        modifiers: result.modifierBreakdown.map(
          (m) => `${m.source}: ${m.value >= 0 ? '+' : ''}${m.value}`
        ),
      });
    } catch (error) {
      return this.createFailureResult(
        `Loyalty check error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private extractLoyaltyData(command: Command): LoyaltyCheckParams | null {
    if ('params' in command && command.params) {
      return command.params as LoyaltyCheckParams;
    }

    if ('characterId' in command || 'trigger' in command) {
      return command as unknown as LoyaltyCheckParams;
    }

    return null;
  }

  private performLoyaltyCheck(
    character: Character | Monster,
    leader: Character | Monster | null,
    params: LoyaltyCheckParams,
    context: GameContext
  ): LoyaltyCheckResult {
    const baseValue = this.calculateBaseLoyalty(character, leader);

    const modifierBreakdown = this.calculateModifiers(params, character, leader, context);
    const totalModifier = modifierBreakdown.reduce((sum, mod) => sum + mod.value, 0);

    const finalValue = Math.max(0, Math.min(99, baseValue + totalModifier));

    const rollResult = this.rollPercentile();

    const passed = rollResult <= finalValue;

    const outcome = this.determineLoyaltyOutcome(rollResult, finalValue, params.trigger);

    const futureModifier = this.calculateFutureLoyaltyModifier(outcome, params.trigger);

    const description = this.generateOutcomeDescription(
      character,
      leader,
      rollResult,
      finalValue,
      outcome
    );

    return {
      rollResult,
      baseValue,
      totalModifier,
      finalValue,
      passed,
      outcome,
      description,
      futureModifier,
      modifierBreakdown,
    };
  }

  private calculateBaseLoyalty(
    character: Character | Monster,
    leader: Character | Monster | null
  ): number {
    if (leader && 'abilities' in leader) {
      const charisma = leader.abilities.charisma;
      return OSRIC_BASE_LOYALTY[charisma as keyof typeof OSRIC_BASE_LOYALTY] || 50;
    }

    if ('abilities' in character) {
      const charisma = character.abilities.charisma;
      return OSRIC_BASE_LOYALTY[charisma as keyof typeof OSRIC_BASE_LOYALTY] || 50;
    }

    return 50;
  }

  private calculateModifiers(
    params: LoyaltyCheckParams,
    _character: Character | Monster,
    leader: Character | Monster | null,
    _context: GameContext
  ): Array<{ source: string; value: number }> {
    const modifiers: Array<{ source: string; value: number }> = [];

    const triggerMod = OSRIC_LOYALTY_MODIFIERS[params.trigger];
    if (triggerMod !== 0) {
      modifiers.push({
        source: this.getTriggerDescription(params.trigger),
        value: triggerMod,
      });
    }

    if (params.situationalModifiers) {
      const sitMods = params.situationalModifiers;

      if (sitMods.leadershipBonus && leader && 'level' in leader) {
        const bonus = Math.min(10, Math.floor(sitMods.leadershipBonus / 2));
        modifiers.push({
          source: `Leadership experience (+${bonus})`,
          value: bonus,
        });
      }

      if (sitMods.generousPayment) {
        modifiers.push({
          source: 'Generous payment',
          value: OSRIC_LOYALTY_MODIFIERS.generous_payment,
        });
      }

      if (sitMods.harshTreatment) {
        modifiers.push({
          source: 'Harsh treatment',
          value: OSRIC_LOYALTY_MODIFIERS.harsh_treatment,
        });
      }

      if (sitMods.sharedDanger) {
        modifiers.push({
          source: 'Shared danger',
          value: OSRIC_LOYALTY_MODIFIERS.shared_danger,
        });
      }

      if (sitMods.successfulMissions && sitMods.successfulMissions > 0) {
        const bonus = Math.min(
          15,
          sitMods.successfulMissions * OSRIC_LOYALTY_MODIFIERS.successful_mission
        );
        modifiers.push({
          source: `Successful missions (${sitMods.successfulMissions})`,
          value: bonus,
        });
      }

      if (sitMods.failedMissions && sitMods.failedMissions > 0) {
        const penalty = Math.max(
          -15,
          sitMods.failedMissions * OSRIC_LOYALTY_MODIFIERS.failed_mission
        );
        modifiers.push({
          source: `Failed missions (${sitMods.failedMissions})`,
          value: penalty,
        });
      }

      if (sitMods.treasureBonus) {
        const bonus =
          sitMods.treasureBonus >= 100
            ? OSRIC_LOYALTY_MODIFIERS.treasure_bonus_major
            : OSRIC_LOYALTY_MODIFIERS.treasure_bonus_minor;
        modifiers.push({
          source: 'Treasure bonus',
          value: bonus,
        });
      }

      if (sitMods.magicalInfluence) {
        modifiers.push({
          source: sitMods.magicalInfluence > 0 ? 'Magical loyalty' : 'Magical fear',
          value: sitMods.magicalInfluence,
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

  private getTriggerDescription(trigger: LoyaltyCheckParams['trigger']): string {
    const descriptions = {
      initial_hire: 'Initial hiring',
      combat_casualties: 'Combat casualties',
      dangerous_mission: 'Dangerous mission',
      treasure_share: 'Treasure sharing',
      leader_behavior: 'Leader behavior',
      periodic_check: 'Periodic check',
      other: 'Other circumstances',
    };
    return descriptions[trigger];
  }

  private determineLoyaltyOutcome(
    roll: number,
    target: number,
    trigger: LoyaltyCheckParams['trigger']
  ): LoyaltyOutcome {
    if (roll <= target) {
      const successMargin = target - roll;

      if (successMargin >= 50) {
        return 'loyal_devotion';
      }
      if (successMargin >= 20) {
        return 'remain_loyal';
      }
      return 'remain_loyal';
    }

    const failureMargin = roll - target;

    if (failureMargin > 50) {
      return trigger === 'combat_casualties' ? 'desertion' : 'betrayal';
    }
    if (failureMargin > 30) {
      return 'desertion';
    }
    if (failureMargin > 15) {
      return 'disloyal';
    }
    return 'wavering';
  }

  private calculateFutureLoyaltyModifier(
    outcome: LoyaltyOutcome,
    trigger: LoyaltyCheckParams['trigger']
  ): number {
    const modifiers = {
      loyal_devotion: 5,
      remain_loyal: 2,
      wavering: -2,
      disloyal: -5,
      betrayal: -15,
      desertion: -10,
    };

    const baseMod = modifiers[outcome];

    if (trigger === 'combat_casualties' || trigger === 'dangerous_mission') {
      return Math.floor(baseMod * 1.5);
    }

    return baseMod;
  }

  private generateOutcomeDescription(
    character: Character | Monster,
    leader: Character | Monster | null,
    roll: number,
    target: number,
    outcome: LoyaltyOutcome
  ): string {
    const characterName = character.name || character.id;
    const leaderName = leader ? leader.name || leader.id : 'their leader';

    const outcomeDescriptions = {
      loyal_devotion: `shows unwavering devotion to ${leaderName}`,
      remain_loyal: `remains loyal to ${leaderName}`,
      wavering: `shows wavering loyalty but stays with ${leaderName}`,
      disloyal: `becomes disloyal toward ${leaderName}`,
      betrayal: `turns against ${leaderName}`,
      desertion: `abandons ${leaderName}`,
    };

    return `Loyalty check: ${roll} vs ${target} - ${characterName} ${outcomeDescriptions[outcome]}`;
  }

  private generateDescription(
    character: Character | Monster,
    leader: Character | Monster | null,
    result: LoyaltyCheckResult,
    params: LoyaltyCheckParams
  ): string {
    const characterName = character.name || character.id;
    const leaderName = leader ? leader.name || leader.id : 'leader';
    const triggerDesc = this.getTriggerDescription(params.trigger);

    const modifierStr =
      result.totalModifier >= 0 ? `+${result.totalModifier}` : `${result.totalModifier}`;

    if (result.passed) {
      return `Loyalty check (${triggerDesc}): ${result.rollResult} vs ${result.finalValue} (${modifierStr}) - ${characterName} remains loyal to ${leaderName}`;
    }

    return `Loyalty check (${triggerDesc}): ${result.rollResult} vs ${result.finalValue} (${modifierStr}) - ${characterName} ${result.outcome.replace('_', ' ')}`;
  }

  private rollPercentile(): number {
    return Math.floor(Math.random() * 100) + 1;
  }
}
