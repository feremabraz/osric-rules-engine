/**
 * LoyaltyRules.ts - OSRIC Loyalty Check System
 *
 * Implements authentic OSRIC AD&D 1st Edition loyalty mechanics:
 * - Base loyalty calculation (50% + Charisma modifiers)
 * - Henchmen and follower loyalty systems
 * - Loyalty adjustment factors and situational modifiers
 * - Loyalty break points and desertion mechanics
 * - Proper OSRIC percentile dice resolution
 *
 * OSRIC Reference: Charisma loyalty adjustments and henchmen mechanics
 * Based on AD&D 1st Edition loyalty system with authentic modifiers.
 */

import type { Command } from '../../core/Command';
import type { GameContext } from '../../core/GameContext';
import { BaseRule, type RuleResult } from '../../core/Rule';
import { COMMAND_TYPES, RULE_NAMES } from '../../types/constants';
import type { Character, Monster } from '../../types/entities';

/**
 * Parameters for loyalty check execution
 */
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

/**
 * Loyalty check outcome types following OSRIC standards
 */
export type LoyaltyOutcome =
  | 'loyal_devotion' // Exceptional loyalty result
  | 'remain_loyal' // Standard loyalty maintained
  | 'wavering' // Loyalty questioned but maintained
  | 'disloyal' // Loyalty lost, may leave
  | 'betrayal' // Active hostility against leader
  | 'desertion'; // Immediate abandonment

/**
 * Structured loyalty check result
 */
export interface LoyaltyCheckResult {
  rollResult: number;
  baseValue: number;
  totalModifier: number;
  finalValue: number;
  passed: boolean;
  outcome: LoyaltyOutcome;
  description: string;
  futureModifier: number; // Ongoing loyalty adjustment
  modifierBreakdown: Array<{
    source: string;
    value: number;
  }>;
}

/**
 * OSRIC Loyalty modifiers for various situations
 * Based on authentic AD&D 1st Edition loyalty adjustment tables
 */
const OSRIC_LOYALTY_MODIFIERS = {
  // Trigger-based adjustments
  initial_hire: 0, // Base hiring loyalty
  combat_casualties: -10, // Heavy losses in combat
  dangerous_mission: -5, // Risky assignments
  treasure_share: 5, // Fair treasure distribution
  leader_behavior: 0, // Variable based on specific behavior
  periodic_check: 0, // Regular loyalty maintenance
  other: 0, // DM discretion

  // Situational modifiers
  generous_payment: 10, // Above-standard compensation
  harsh_treatment: -15, // Poor treatment by leader
  shared_danger: 5, // Leader shares risks with followers
  successful_mission: 3, // Each successful mission completed
  failed_mission: -3, // Each failed mission
  magical_charm: 20, // Magical loyalty influence
  magical_fear: -20, // Magical intimidation
  religious_devotion: 15, // Religious/ideological loyalty

  // Leadership effectiveness
  excellent_leader: 10, // Proven effective leadership
  poor_leader: -10, // Demonstrated poor leadership
  betrayed_trust: -25, // Leader broke trust
  saved_follower: 15, // Leader saved follower's life

  // Economic factors
  treasure_bonus_minor: 5, // Small bonus shares
  treasure_bonus_major: 10, // Significant bonus shares
  unpaid_wages: -20, // Compensation not provided
  lost_equipment: -5, // Follower equipment lost

  // Group dynamics
  popular_leader: 5, // Leader well-liked by group
  unpopular_leader: -10, // Leader disliked by group
  group_cohesion: 3, // Strong group bonds
  group_conflict: -5, // Internal group problems
} as const;

/**
 * Base loyalty values by Charisma score (OSRIC Table)
 * Represents base loyalty percentage before modifiers
 */
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

/**
 * OSRIC Loyalty Rules Implementation
 *
 * Handles all aspects of follower/henchmen loyalty including:
 * - Base loyalty calculation from leader's Charisma
 * - Situational loyalty modifiers
 * - Loyalty outcome determination
 * - Future loyalty adjustments
 * - Proper OSRIC compliance for AD&D 1st Edition
 */
export class LoyaltyRules extends BaseRule {
  readonly name = RULE_NAMES.LOYALTY_CHECK;
  readonly priority = 150;

  /**
   * Check if this rule applies to the given command
   */
  canApply(_context: GameContext, command: Command): boolean {
    return command.type === COMMAND_TYPES.LOYALTY_CHECK;
  }

  /**
   * Execute loyalty check following OSRIC standards
   */
  async execute(context: GameContext, command: Command): Promise<RuleResult> {
    try {
      // Extract loyalty check data from command
      const loyaltyData = this.extractLoyaltyData(command);
      if (!loyaltyData) {
        return this.createFailureResult('No loyalty check data provided');
      }

      // Get the character being checked for loyalty
      const character = context.getEntity<Character | Monster>(loyaltyData.characterId);
      if (!character) {
        return this.createFailureResult(`Character not found: ${loyaltyData.characterId}`);
      }

      // Get the leader if specified
      let leader: Character | Monster | null = null;
      if (loyaltyData.leaderId) {
        leader = context.getEntity<Character | Monster>(loyaltyData.leaderId);
        if (!leader) {
          return this.createFailureResult(`Leader not found: ${loyaltyData.leaderId}`);
        }
      }

      // Perform the loyalty check
      const result = this.performLoyaltyCheck(character, leader, loyaltyData, context);

      // Generate descriptive result
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

  /**
   * Extract loyalty check parameters from command
   */
  private extractLoyaltyData(command: Command): LoyaltyCheckParams | null {
    // Handle different command parameter structures
    if ('params' in command && command.params) {
      return command.params as LoyaltyCheckParams;
    }

    // Handle direct properties on command
    if ('characterId' in command || 'trigger' in command) {
      return command as unknown as LoyaltyCheckParams;
    }

    return null;
  }

  /**
   * Perform the complete loyalty check calculation
   */
  private performLoyaltyCheck(
    character: Character | Monster,
    leader: Character | Monster | null,
    params: LoyaltyCheckParams,
    context: GameContext
  ): LoyaltyCheckResult {
    // Calculate base loyalty value
    const baseValue = this.calculateBaseLoyalty(character, leader);

    // Calculate all modifiers
    const modifierBreakdown = this.calculateModifiers(params, character, leader, context);
    const totalModifier = modifierBreakdown.reduce((sum, mod) => sum + mod.value, 0);

    // Calculate final target value
    const finalValue = Math.max(0, Math.min(99, baseValue + totalModifier));

    // Roll percentile dice
    const rollResult = this.rollPercentile();

    // Determine success/failure
    const passed = rollResult <= finalValue;

    // Determine specific outcome
    const outcome = this.determineLoyaltyOutcome(rollResult, finalValue, params.trigger);

    // Calculate future loyalty modifier
    const futureModifier = this.calculateFutureLoyaltyModifier(outcome, params.trigger);

    // Generate description
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

  /**
   * Calculate base loyalty from leader's Charisma or character's own loyalty
   */
  private calculateBaseLoyalty(
    character: Character | Monster,
    leader: Character | Monster | null
  ): number {
    if (leader && 'abilities' in leader) {
      // Use leader's Charisma for loyalty calculation
      const charisma = leader.abilities.charisma;
      return OSRIC_BASE_LOYALTY[charisma as keyof typeof OSRIC_BASE_LOYALTY] || 50;
    }

    if ('abilities' in character) {
      // Fall back to character's own Charisma for self-loyalty
      const charisma = character.abilities.charisma;
      return OSRIC_BASE_LOYALTY[charisma as keyof typeof OSRIC_BASE_LOYALTY] || 50;
    }

    // Default loyalty for monsters without specific Charisma
    return 50;
  }

  /**
   * Calculate all applicable loyalty modifiers
   */
  private calculateModifiers(
    params: LoyaltyCheckParams,
    _character: Character | Monster,
    leader: Character | Monster | null,
    _context: GameContext
  ): Array<{ source: string; value: number }> {
    const modifiers: Array<{ source: string; value: number }> = [];

    // Trigger-based modifier
    const triggerMod = OSRIC_LOYALTY_MODIFIERS[params.trigger];
    if (triggerMod !== 0) {
      modifiers.push({
        source: this.getTriggerDescription(params.trigger),
        value: triggerMod,
      });
    }

    // Situational modifiers
    if (params.situationalModifiers) {
      const sitMods = params.situationalModifiers;

      // Leadership bonus (based on leader's experience/level)
      if (sitMods.leadershipBonus && leader && 'level' in leader) {
        const bonus = Math.min(10, Math.floor(sitMods.leadershipBonus / 2));
        modifiers.push({
          source: `Leadership experience (+${bonus})`,
          value: bonus,
        });
      }

      // Economic factors
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

      // Mission history
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

      // Treasure bonuses
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

      // Magical influences
      if (sitMods.magicalInfluence) {
        modifiers.push({
          source: sitMods.magicalInfluence > 0 ? 'Magical loyalty' : 'Magical fear',
          value: sitMods.magicalInfluence,
        });
      }

      // Custom modifiers
      if (sitMods.customModifiers) {
        for (const [source, value] of Object.entries(sitMods.customModifiers)) {
          modifiers.push({ source, value });
        }
      }
    }

    return modifiers;
  }

  /**
   * Get descriptive text for trigger types
   */
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

  /**
   * Determine loyalty outcome based on roll result and margin
   */
  private determineLoyaltyOutcome(
    roll: number,
    target: number,
    trigger: LoyaltyCheckParams['trigger']
  ): LoyaltyOutcome {
    if (roll <= target) {
      // Success - determine degree of loyalty
      const successMargin = target - roll;

      if (successMargin >= 50) {
        return 'loyal_devotion';
      }
      if (successMargin >= 20) {
        return 'remain_loyal';
      }
      return 'remain_loyal';
    }

    // Failure - determine degree of disloyalty
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

  /**
   * Calculate future loyalty modifier based on outcome
   */
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

    // Adjust based on trigger severity
    if (trigger === 'combat_casualties' || trigger === 'dangerous_mission') {
      return Math.floor(baseMod * 1.5);
    }

    return baseMod;
  }

  /**
   * Generate descriptive outcome text
   */
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

  /**
   * Generate comprehensive description for rule result
   */
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

  /**
   * Roll percentile dice (1d100) using Math.random()
   */
  private rollPercentile(): number {
    return Math.floor(Math.random() * 100) + 1;
  }
}
