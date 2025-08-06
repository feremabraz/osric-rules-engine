import type { Command } from '../../core/Command';
import type { GameContext } from '../../core/GameContext';
import { BaseRule } from '../../core/Rule';
import type { RuleResult } from '../../core/Rule';
import { RULE_NAMES } from '../../types/constants';
import type { Character } from '../../types/entities';

export interface LightCondition {
  type: 'bright-light' | 'normal-light' | 'dim-light' | 'darkness' | 'magical-darkness';
  source?: string;
  radius?: number;
  duration?: number;
}

export interface VisibilityConditions {
  lightLevel: LightCondition;
  weather?: {
    type: string;
    visibilityReduction: number;
  };
  terrain?: {
    type: string;
    baseVisibility: number;
  };
  elevation?: {
    observerHeight: number;
    targetHeight: number;
  };
}

export interface VisibilityParameters {
  observerId: string;
  targetId?: string;
  activityType: 'general' | 'searching' | 'hiding' | 'combat' | 'spellcasting' | 'movement';
  conditions: VisibilityConditions;
  distance: number;
}

export interface VisibilityResult {
  canSee: boolean;
  effectiveRange: number;
  detectionChance: number;
  penalties: Record<string, number>;
  lightingBonus: number;
  description: string;
}

export class VisibilityRules extends BaseRule {
  readonly name = RULE_NAMES.VISIBILITY_RULES;
  readonly priority = 50;

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

      const visibilityResult = this.calculateVisibility(
        observer,
        target,
        activityType,
        conditions,
        distance
      );

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

  private calculateVisibility(
    observer: Character,
    target: Character | null,
    activityType: string,
    conditions: VisibilityConditions,
    distance: number
  ): VisibilityResult {
    let effectiveRange = this.getBaseLightVisibility(conditions.lightLevel);

    if (conditions.weather) {
      effectiveRange = Math.min(effectiveRange, conditions.weather.visibilityReduction);
    }

    if (conditions.terrain) {
      effectiveRange = Math.min(effectiveRange, conditions.terrain.baseVisibility);
    }

    if (conditions.elevation) {
      const elevationBonus = this.calculateElevationBonus(conditions.elevation);
      effectiveRange += elevationBonus;
    }

    const canSee = distance <= effectiveRange;

    const detectionChance = this.calculateDetectionChance(
      observer,
      target,
      activityType,
      conditions,
      distance,
      effectiveRange
    );

    const penalties = this.calculateVisibilityPenalties(conditions, distance, effectiveRange);

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

  private getBaseLightVisibility(light: LightCondition): number {
    switch (light.type) {
      case 'bright-light':
        return 12000;
      case 'normal-light':
        return 6000;
      case 'dim-light':
        return 3000;
      case 'darkness':
        return 60;
      case 'magical-darkness':
        return 0;
      default:
        return 6000;
    }
  }

  private calculateElevationBonus(elevation: {
    observerHeight: number;
    targetHeight: number;
  }): number {
    const heightDifference = elevation.observerHeight - elevation.targetHeight;

    if (heightDifference <= 0) {
      return 0;
    }

    const milesOfBonus = Math.floor(heightDifference / 10);
    return milesOfBonus * 5280;
  }

  private calculateDetectionChance(
    observer: Character,
    target: Character | null,
    activityType: string,
    conditions: VisibilityConditions,
    distance: number,
    effectiveRange: number
  ): number {
    let baseChance = 100;

    if (activityType === 'hiding' && target) {
      const hideSkill = target.thiefSkills?.hideInShadows || 10;
      baseChance = 100 - hideSkill;
    } else if (activityType === 'searching') {
      baseChance = 75;
    } else if (activityType === 'general') {
      baseChance = 90;
    }

    if (distance > effectiveRange * 0.5) {
      const distancePenalty =
        Math.floor((distance - effectiveRange * 0.5) / (effectiveRange * 0.1)) * 5;
      baseChance -= distancePenalty;
    }

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

    if (conditions.weather?.visibilityReduction) {
      const weatherPenalty = Math.floor((6000 - conditions.weather.visibilityReduction) / 300) * 5;
      baseChance -= weatherPenalty;
    }

    const wisdomBonus = Math.floor((observer.abilities.wisdom - 10) / 2) * 3;
    baseChance += wisdomBonus;

    return Math.max(5, Math.min(95, baseChance));
  }

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

    if (distance > effectiveRange * 0.75) {
      const distancePenalty = Math.floor(
        (distance - effectiveRange * 0.75) / (effectiveRange * 0.1)
      );
      penalties.rangedAttack -= distancePenalty;
      penalties.spellcasting -= Math.floor(distancePenalty / 2);
    }

    if (conditions.weather?.visibilityReduction && conditions.weather.visibilityReduction < 1000) {
      penalties.rangedAttack -= 2;
      penalties.search -= 3;
    }

    return penalties;
  }

  private calculateLightingBonus(light: LightCondition, activityType: string): number {
    if (activityType === 'hiding') {
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

    switch (light.type) {
      case 'bright-light':
        return 5;
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
