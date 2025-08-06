/**
 * FallingDamageRules - OSRIC Falling Damage Rule Implementation
 *
 * Handles validation and processing of falling damage according to OSRIC rules.
 * PRESERVATION: All OSRIC falling damage mechanics preserved exactly.
 */

import type { Command } from '../../core/Command';
import type { GameContext } from '../../core/GameContext';
import { BaseRule, type RuleResult } from '../../core/Rule';
import { COMMAND_TYPES, RULE_NAMES } from '../../types/constants';
import type { Character } from '../../types/entities';

interface FallingDamageParameters {
  characterId: string;
  fallDistance: number;
  surfaceType?: 'soft' | 'normal' | 'hard' | 'spikes';
  circumstances?: {
    intentional?: boolean;
    hasFeatherFall?: boolean;
    encumbrance?: 'light' | 'moderate' | 'heavy' | 'severe';
    dexterityCheck?: boolean;
  };
  savingThrow?: boolean;
  description?: string;
}

export class FallingDamageRule extends BaseRule {
  readonly name = RULE_NAMES.FALLING_DAMAGE;
  readonly priority = 500; // Normal priority for environmental hazards

  canApply(_context: GameContext, command: Command): boolean {
    return command.type === COMMAND_TYPES.FALLING_DAMAGE;
  }

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const fallData = context.getTemporary<FallingDamageParameters>('falling-damage-params');

    if (!fallData) {
      return this.createFailureResult('No falling damage data provided');
    }

    try {
      const character = context.getEntity<Character>(fallData.characterId);
      if (!character) {
        return this.createFailureResult(`Character ${fallData.characterId} not found`);
      }

      // Validate the falling damage scenario
      const validationResult = this.validateFallingDamage(character, fallData);
      if (!validationResult.success) {
        return validationResult;
      }

      // Calculate falling damage parameters
      const damageCalculation = this.calculateFallingDamageRules(character, fallData);

      // Apply special environmental rules
      const specialRules = this.applyEnvironmentalRules(character, fallData, damageCalculation);

      return this.createSuccessResult('Falling damage validation complete', {
        characterId: fallData.characterId,
        fallDistance: fallData.fallDistance,
        baseDamageRange: damageCalculation.baseDamageRange,
        expectedDamage: damageCalculation.expectedDamage,
        surfaceModifier: damageCalculation.surfaceModifier,
        modifiers: damageCalculation.modifiers,
        specialRules,
        canSurvive: validationResult.canSurvive,
        deathSaveRequired: validationResult.deathSaveRequired,
        immunities: validationResult.immunities,
      });
    } catch (error) {
      return this.createFailureResult(
        `Failed to process falling damage rule: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Validate the falling damage scenario
   */
  private validateFallingDamage(
    character: Character,
    fallData: FallingDamageParameters
  ): RuleResult & { canSurvive?: boolean; deathSaveRequired?: boolean; immunities?: string[] } {
    const immunities: string[] = [];

    // Check for conditions that prevent damage
    if (fallData.circumstances?.hasFeatherFall) {
      immunities.push('Feather Fall spell negates all falling damage');
    }

    // Check for racial immunities or resistances
    const race = character.race.toLowerCase();
    if (race === 'halfling' && fallData.fallDistance <= 20) {
      immunities.push('Halflings are naturally agile at avoiding fall damage under 20 feet');
    }

    // Check for class abilities
    const characterClass = character.class.toLowerCase();
    if (characterClass === 'monk' && character.experience.level >= 4) {
      immunities.push('Monks can slow falls starting at level 4');
    }

    if (characterClass === 'thief' && fallData.fallDistance <= 10) {
      immunities.push('Thieves are trained to minimize damage from short falls');
    }

    // Calculate expected damage to assess survivability
    const expectedDamage = this.calculateExpectedDamage(fallData);
    const canSurvive = character.hitPoints.current > expectedDamage;
    const deathSaveRequired = expectedDamage >= character.hitPoints.current;

    // Check for impossible survival scenarios
    if (fallData.fallDistance > 200 && character.experience.level < 10) {
      return {
        success: false,
        message: 'Fall is too extreme for character to realistically survive',
        canSurvive: false,
      };
    }

    return {
      success: true,
      message: 'Falling damage scenario is valid',
      canSurvive,
      deathSaveRequired,
      immunities,
    };
  }

  /**
   * Calculate expected damage for validation
   */
  private calculateExpectedDamage(fallData: FallingDamageParameters): number {
    if (fallData.fallDistance < 10) return 0;

    const tenFootIncrements = Math.min(Math.floor(fallData.fallDistance / 10), 20);
    const averageDamage = tenFootIncrements * 3.5; // Average of 1d6

    // Apply surface modifier
    const surfaceModifier = this.getSurfaceModifier(fallData.surfaceType || 'normal');

    return Math.floor(averageDamage * surfaceModifier);
  }

  /**
   * Calculate falling damage rules and modifiers
   */
  private calculateFallingDamageRules(
    character: Character,
    fallData: FallingDamageParameters
  ): {
    baseDamageRange: { min: number; max: number; average: number };
    expectedDamage: number;
    surfaceModifier: number;
    modifiers: Array<{ source: string; effect: string; description: string }>;
  } {
    const modifiers: Array<{ source: string; effect: string; description: string }> = [];

    // Calculate base damage range
    const tenFootIncrements = Math.min(Math.floor(fallData.fallDistance / 10), 20);
    const baseDamageRange = {
      min: tenFootIncrements, // All 1s
      max: tenFootIncrements * 6, // All 6s
      average: tenFootIncrements * 3.5,
    };

    // Apply circumstance modifiers
    let expectedDamage = baseDamageRange.average;

    if (fallData.circumstances?.intentional && fallData.fallDistance <= 30) {
      modifiers.push({
        source: 'intentional-jump',
        effect: '-2 damage',
        description: 'Intentional jump reduces damage (up to 30 feet)',
      });
      expectedDamage = Math.max(0, expectedDamage - 2);
    }

    if (fallData.circumstances?.encumbrance) {
      const encumbrancePenalty = {
        light: 0,
        moderate: 1,
        heavy: 2,
        severe: 4,
      }[fallData.circumstances.encumbrance];

      if (encumbrancePenalty > 0) {
        modifiers.push({
          source: 'encumbrance',
          effect: `+${encumbrancePenalty} damage`,
          description: `${fallData.circumstances.encumbrance} encumbrance increases fall damage`,
        });
        expectedDamage += encumbrancePenalty;
      }
    }

    if (fallData.circumstances?.dexterityCheck) {
      const dexterity = character.abilities.dexterity;
      const successChance = dexterity / 20;
      modifiers.push({
        source: 'dexterity-check',
        effect: `${Math.round(successChance * 100)}% chance to halve damage`,
        description: `Dexterity ${dexterity} allows damage reduction attempt`,
      });
    }

    // Get surface modifier
    const surfaceModifier = this.getSurfaceModifier(fallData.surfaceType || 'normal');
    if (surfaceModifier !== 1) {
      modifiers.push({
        source: 'surface',
        effect: `×${surfaceModifier} damage`,
        description: `${fallData.surfaceType} surface modifier`,
      });
      expectedDamage *= surfaceModifier;
    }

    // Level-based damage cap
    if (fallData.fallDistance > 200) {
      modifiers.push({
        source: 'terminal-velocity',
        effect: 'damage capped at 20d6',
        description: 'OSRIC maximum falling damage limit',
      });
    }

    return {
      baseDamageRange,
      expectedDamage: Math.floor(expectedDamage),
      surfaceModifier,
      modifiers,
    };
  }

  /**
   * Get surface damage modifier
   */
  private getSurfaceModifier(surfaceType: string): number {
    switch (surfaceType) {
      case 'soft': // Hay, water, snow, mud
        return 0.5;
      case 'normal': // Regular ground, wood, stone
        return 1.0;
      case 'hard': // Iron, jagged rocks, metal
        return 1.5;
      case 'spikes': // Bed of spikes, sharp objects
        return 2.0;
      default:
        return 1.0;
    }
  }

  /**
   * Apply special environmental rules
   */
  private applyEnvironmentalRules(
    character: Character,
    fallData: FallingDamageParameters,
    _damageCalculation: { expectedDamage: number }
  ): string[] {
    const specialRules: string[] = [];
    const characterClass = character.class.toLowerCase();

    // OSRIC base rules
    specialRules.push('1d6 damage per 10 feet fallen');
    specialRules.push('Maximum 20d6 damage (terminal velocity)');
    specialRules.push('No damage for falls under 10 feet');

    // Surface rules
    specialRules.push('Soft surfaces (hay, water) halve damage');
    specialRules.push('Hard surfaces (spikes) can double damage');

    // Class-specific rules
    if (characterClass === 'thief') {
      specialRules.push('Thieves may attempt to reduce damage with training');
    }

    if (characterClass === 'monk' && character.experience.level >= 4) {
      specialRules.push('Monks can slow their fall (reducing damage)');
    }

    // Ability-based rules
    if (fallData.circumstances?.dexterityCheck) {
      specialRules.push('Dexterity check can halve damage if successful');
    }

    // Death save rules
    if (fallData.savingThrow) {
      specialRules.push('Death save required if damage equals or exceeds current HP');
      specialRules.push('Constitution modifier applies to death saves');
    }

    // Intentional jump rules
    if (fallData.circumstances?.intentional) {
      specialRules.push('Intentional jumps up to 30 feet reduce damage by 2');
    }

    // Magic interaction rules
    if (fallData.circumstances?.hasFeatherFall) {
      specialRules.push('Feather Fall spell negates all falling damage');
    }

    // Encumbrance effects
    if (fallData.circumstances?.encumbrance) {
      specialRules.push('Heavy encumbrance increases falling damage');
    }

    // Distance-specific rules
    if (fallData.fallDistance >= 100) {
      specialRules.push('Falls over 100 feet often require death saves');
    }

    if (fallData.fallDistance >= 200) {
      specialRules.push('Terminal velocity reached - damage caps at 20d6');
    }

    return specialRules;
  }
}
