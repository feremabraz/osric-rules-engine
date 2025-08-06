/**
 * VisibilityRules - OSRIC Visibility and Detection Systems
 *
 * Handles visibility calculations for:
 * - Light conditions and darkness
 * - Weather effects on visibility
 * - Terrain-based line of sight
 * - Detection ranges for different activities
 *
 * PRESERVATION: All OSRIC visibility mechanics preserved exactly.
 */

import type { Command } from '../../core/Command';
import type { GameContext } from '../../core/GameContext';
import { BaseRule } from '../../core/Rule';
import type { RuleResult } from '../../core/Rule';
import { RULE_NAMES } from '../../types/constants';
import type { Character } from '../../types/entities';

export interface LightCondition {
  type: 'bright-light' | 'normal-light' | 'dim-light' | 'darkness' | 'magical-darkness';
  source?: string; // torch, lantern, spell, etc.
  radius?: number; // effective radius in feet
  duration?: number; // remaining duration in hours
}

export interface VisibilityConditions {
  lightLevel: LightCondition;
  weather?: {
    type: string;
    visibilityReduction: number; // feet of reduced visibility
  };
  terrain?: {
    type: string;
    baseVisibility: number; // maximum visibility in this terrain
  };
  elevation?: {
    observerHeight: number; // height of observer in feet
    targetHeight: number; // height of target in feet
  };
}

export interface VisibilityParameters {
  observerId: string;
  targetId?: string;
  activityType: 'general' | 'searching' | 'hiding' | 'combat' | 'spellcasting' | 'movement';
  conditions: VisibilityConditions;
  distance: number; // distance between observer and target in feet
}

export interface VisibilityResult {
  canSee: boolean;
  effectiveRange: number; // actual visibility range in current conditions
  detectionChance: number; // percentage chance to notice target
  penalties: Record<string, number>; // various penalties from poor visibility
  lightingBonus: number; // bonus or penalty from lighting
  description: string;
}

export class VisibilityRules extends BaseRule {
  readonly name = RULE_NAMES.VISIBILITY_RULES;
  readonly priority = 50; // Execute after movement and weather rules

  canApply(context: GameContext, _command: Command): boolean {
    return this.getTemporaryData<VisibilityParameters>(context, 'visibility-check-params') !== null;
  }

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    try {
      const parameters = this.getTemporaryData<VisibilityParameters>(
        context,
        'visibility-check-params'
      );

      if (!parameters) {
        return this.createFailureResult('No visibility check parameters found');
      }

      const { observerId, targetId, activityType, conditions, distance } = parameters;

      const observer = context.getEntity<Character>(observerId);
      if (!observer) {
        return this.createFailureResult('Observer not found');
      }

      let target: Character | null = null;
      if (targetId) {
        target = context.getEntity<Character>(targetId);
      }

      // Calculate visibility conditions
      const visibilityResult = this.calculateVisibility(
        observer,
        target,
        activityType,
        conditions,
        distance
      );

      // Store results for other rules to use
      this.setTemporaryData(context, 'visibility-result', visibilityResult);

      const message = this.createVisibilityMessage(
        observer,
        target,
        visibilityResult,
        activityType,
        distance
      );

      return this.createSuccessResult(
        message,
        {
          observerId,
          targetId,
          activityType,
          distance,
          result: visibilityResult,
          conditions,
        },
        undefined,
        undefined
      );
    } catch (error) {
      return this.createFailureResult(
        `Failed to process visibility: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Calculate visibility based on all conditions
   */
  private calculateVisibility(
    observer: Character,
    target: Character | null,
    activityType: string,
    conditions: VisibilityConditions,
    distance: number
  ): VisibilityResult {
    // Start with base visibility ranges
    let effectiveRange = this.getBaseLightVisibility(conditions.lightLevel);

    // Apply weather restrictions
    if (conditions.weather) {
      effectiveRange = Math.min(effectiveRange, conditions.weather.visibilityReduction);
    }

    // Apply terrain restrictions
    if (conditions.terrain) {
      effectiveRange = Math.min(effectiveRange, conditions.terrain.baseVisibility);
    }

    // Apply elevation bonuses
    if (conditions.elevation) {
      const elevationBonus = this.calculateElevationBonus(conditions.elevation);
      effectiveRange += elevationBonus;
    }

    // Determine if target can be seen
    const canSee = distance <= effectiveRange;

    // Calculate detection chance for specific activities
    const detectionChance = this.calculateDetectionChance(
      observer,
      target,
      activityType,
      conditions,
      distance,
      effectiveRange
    );

    // Calculate various penalties
    const penalties = this.calculateVisibilityPenalties(conditions, distance, effectiveRange);

    // Calculate lighting bonus/penalty
    const lightingBonus = this.calculateLightingBonus(conditions.lightLevel, activityType);

    const description = this.createVisibilityDescription(
      conditions,
      effectiveRange,
      canSee,
      detectionChance,
      penalties
    );

    return {
      canSee,
      effectiveRange,
      detectionChance,
      penalties,
      lightingBonus,
      description,
    };
  }

  /**
   * Get base visibility range for light conditions
   */
  private getBaseLightVisibility(light: LightCondition): number {
    switch (light.type) {
      case 'bright-light':
        return 12000; // Very bright conditions (daylight)
      case 'normal-light':
        return 6000; // Normal daylight conditions
      case 'dim-light':
        return 3000; // Twilight, overcast
      case 'darkness':
        return 60; // Starlight only (OSRIC: 1" = 60 feet)
      case 'magical-darkness':
        return 0; // Cannot see at all
      default:
        return 6000;
    }
  }

  /**
   * Calculate elevation bonus to visibility
   */
  private calculateElevationBonus(elevation: {
    observerHeight: number;
    targetHeight: number;
  }): number {
    const heightDifference = elevation.observerHeight - elevation.targetHeight;

    if (heightDifference <= 0) {
      return 0; // No bonus for being lower or equal
    }

    // OSRIC rule: For every 10 feet of elevation, add 1 mile of visibility
    // Convert to feet: 1 mile = 5280 feet
    const milesOfBonus = Math.floor(heightDifference / 10);
    return milesOfBonus * 5280;
  }

  /**
   * Calculate chance to detect target based on activity
   */
  private calculateDetectionChance(
    observer: Character,
    target: Character | null,
    activityType: string,
    conditions: VisibilityConditions,
    distance: number,
    effectiveRange: number
  ): number {
    // Base chance depends on activity type
    let baseChance = 100; // Assume automatic if visible and not hiding

    if (activityType === 'hiding' && target) {
      // Use thief's hide ability or base percentage
      const hideSkill = target.thiefSkills?.hideInShadows || 10;
      baseChance = 100 - hideSkill;
    } else if (activityType === 'searching') {
      // Searching has base chance modified by conditions
      baseChance = 75;
    } else if (activityType === 'general') {
      // General observation
      baseChance = 90;
    }

    // Distance penalty
    if (distance > effectiveRange * 0.5) {
      const distancePenalty =
        Math.floor((distance - effectiveRange * 0.5) / (effectiveRange * 0.1)) * 5;
      baseChance -= distancePenalty;
    }

    // Light penalties
    switch (conditions.lightLevel.type) {
      case 'dim-light':
        baseChance -= 20;
        break;
      case 'darkness':
        baseChance -= 50;
        break;
      case 'magical-darkness':
        baseChance = 0;
        break;
    }

    // Weather penalties
    if (conditions.weather?.visibilityReduction) {
      const weatherPenalty = Math.floor((6000 - conditions.weather.visibilityReduction) / 300) * 5;
      baseChance -= weatherPenalty;
    }

    // Observer's wisdom bonus
    const wisdomBonus = Math.floor((observer.abilities.wisdom - 10) / 2) * 3;
    baseChance += wisdomBonus;

    return Math.max(5, Math.min(95, baseChance));
  }

  /**
   * Calculate penalties for various activities due to poor visibility
   */
  private calculateVisibilityPenalties(
    conditions: VisibilityConditions,
    distance: number,
    effectiveRange: number
  ): Record<string, number> {
    const penalties: Record<string, number> = {
      attack: 0,
      rangedAttack: 0,
      spellcasting: 0,
      movement: 0,
      search: 0,
    };

    // Light-based penalties
    switch (conditions.lightLevel.type) {
      case 'dim-light':
        penalties.attack = -1;
        penalties.rangedAttack = -2;
        penalties.search = -2;
        break;
      case 'darkness':
        penalties.attack = -4;
        penalties.rangedAttack = -6;
        penalties.spellcasting = -2;
        penalties.movement = -2;
        penalties.search = -6;
        break;
      case 'magical-darkness':
        penalties.attack = -8;
        penalties.rangedAttack = -10;
        penalties.spellcasting = -4;
        penalties.movement = -4;
        penalties.search = -10;
        break;
    }

    // Distance penalties
    if (distance > effectiveRange * 0.75) {
      const distancePenalty = Math.floor(
        (distance - effectiveRange * 0.75) / (effectiveRange * 0.1)
      );
      penalties.rangedAttack -= distancePenalty;
      penalties.spellcasting -= Math.floor(distancePenalty / 2);
    }

    // Weather penalties
    if (conditions.weather?.visibilityReduction && conditions.weather.visibilityReduction < 1000) {
      penalties.rangedAttack -= 2;
      penalties.search -= 3;
    }

    return penalties;
  }

  /**
   * Calculate lighting bonus/penalty for specific activities
   */
  private calculateLightingBonus(light: LightCondition, activityType: string): number {
    if (activityType === 'hiding') {
      // Darkness helps hiding
      switch (light.type) {
        case 'darkness':
          return 25;
        case 'dim-light':
          return 10;
        case 'bright-light':
          return -15;
        default:
          return 0;
      }
    }

    // Most other activities suffer in poor light
    switch (light.type) {
      case 'bright-light':
        return 5; // Bonus for excellent conditions
      case 'dim-light':
        return -5;
      case 'darkness':
        return -15;
      case 'magical-darkness':
        return -25;
      default:
        return 0;
    }
  }

  /**
   * Create descriptive text for visibility conditions
   */
  private createVisibilityDescription(
    conditions: VisibilityConditions,
    effectiveRange: number,
    canSee: boolean,
    detectionChance: number,
    penalties: Record<string, number>
  ): string {
    let description = `Visibility: ${Math.round(effectiveRange)} feet `;

    description += `(${conditions.lightLevel.type}`;
    if (conditions.weather) {
      description += `, ${conditions.weather.type}`;
    }
    if (conditions.terrain) {
      description += `, ${conditions.terrain.type}`;
    }
    description += '). ';

    if (!canSee) {
      description += 'Target is beyond visible range. ';
    } else if (detectionChance < 100) {
      description += `${detectionChance}% chance to detect. `;
    }

    const significantPenalties = Object.entries(penalties)
      .filter(([, penalty]) => penalty < -1)
      .map(([activity, penalty]) => `${activity} ${penalty}`);

    if (significantPenalties.length > 0) {
      description += `Penalties: ${significantPenalties.join(', ')}.`;
    }

    return description;
  }

  /**
   * Create message for visibility check result
   */
  private createVisibilityMessage(
    observer: Character,
    target: Character | null,
    result: VisibilityResult,
    activityType: string,
    distance: number
  ): string {
    let message = `${observer.name} `;

    if (target) {
      message += `attempts to observe ${target.name} `;
    } else {
      message += 'checks visibility ';
    }

    message += `for ${activityType} at ${distance} feet. ${result.description}`;

    return message;
  }

  /**
   * Helper method to create visibility check parameters
   */
  static createVisibilityCheck(
    observerId: string,
    targetId: string | undefined,
    activityType: VisibilityParameters['activityType'],
    conditions: VisibilityConditions,
    distance: number
  ): VisibilityParameters {
    return {
      observerId,
      targetId,
      activityType,
      conditions,
      distance,
    };
  }

  /**
   * Common light condition presets
   */
  static readonly LIGHT_CONDITIONS = {
    DAYLIGHT: { type: 'normal-light' as const },
    BRIGHT_DAYLIGHT: { type: 'bright-light' as const },
    TWILIGHT: { type: 'dim-light' as const },
    STARLIGHT: { type: 'darkness' as const },
    TORCH: { type: 'normal-light' as const, source: 'torch', radius: 30, duration: 6 },
    LANTERN: { type: 'normal-light' as const, source: 'lantern', radius: 60, duration: 12 },
    CONTINUAL_LIGHT: { type: 'bright-light' as const, source: 'spell', radius: 60 },
    MAGICAL_DARKNESS: { type: 'magical-darkness' as const, source: 'spell' },
  };

  /**
   * Common terrain visibility data
   */
  static readonly TERRAIN_VISIBILITY = {
    OPEN_PLAINS: { type: 'plains', baseVisibility: 12000 },
    FOREST: { type: 'forest', baseVisibility: 300 },
    DENSE_FOREST: { type: 'dense-forest', baseVisibility: 60 },
    HILLS: { type: 'hills', baseVisibility: 3000 },
    MOUNTAINS: { type: 'mountains', baseVisibility: 18000 },
    DESERT: { type: 'desert', baseVisibility: 24000 },
    SWAMP: { type: 'swamp', baseVisibility: 150 },
    UNDERGROUND: { type: 'underground', baseVisibility: 60 },
  };
}
