import type { Command } from '../../core/Command';
import type { GameContext } from '../../core/GameContext';
import { BaseRule } from '../../core/Rule';
import type { RuleResult } from '../../core/Rule';
import { COMMAND_TYPES, RULE_NAMES } from '../../types/constants';
import type { Character } from '../../types/entities';

interface MovementRequest {
  characterId: string;
  fromPosition: string;
  toPosition: string;
  movementType: 'walk' | 'run' | 'swim' | 'climb' | 'fly';
  distance: number; // in feet
  terrainType?: string;
  encumbrance?: 'light' | 'moderate' | 'heavy' | 'severe';
}

interface MovementResult {
  success: boolean;
  actualDistance: number;
  timeRequired: number; // in rounds or turns
  fatigueGained: number;
  specialEffects: string[];
  message: string;
}

export class MovementRule extends BaseRule {
  readonly name = RULE_NAMES.MOVEMENT_VALIDATION;

  canApply(context: GameContext, command: Command): boolean {
    if (command.type !== COMMAND_TYPES.MOVE) {
      return false;
    }

    const data = context.getTemporary<MovementRequest>('movement-request-params');
    if (!data?.characterId || !data?.fromPosition || !data?.toPosition) {
      return false;
    }

    const character = context.getEntity<Character>(data.characterId);
    return character !== undefined;
  }

  async execute(context: GameContext, _command: Command): Promise<RuleResult> {
    const data = context.getTemporary<MovementRequest>('movement-request-params');

    if (!data) {
      return this.createFailureResult('No movement request data provided');
    }

    const character = context.getEntity<Character>(data.characterId);

    if (!character) {
      return this.createFailureResult('Character not found');
    }

    // Validate movement
    const validation = this.validateMovement(character, data);
    if (!validation.success) {
      return this.createFailureResult(validation.message);
    }

    // Calculate movement result
    const result = this.calculateMovement(character, data);

    // Apply movement effects
    if (result.success) {
      this.applyMovementEffects(character, result, context);
    }

    return this.createSuccessResult(result.message, { result });
  }

  private validateMovement(
    character: Character,
    data: MovementRequest
  ): { success: boolean; message: string } {
    // Check if character is capable of movement
    if (character.hitPoints.current <= 0) {
      return { success: false, message: 'Character is unconscious or dead' };
    }

    // Check for movement-restricting status effects
    const restrictingEffects =
      character.statusEffects?.filter(
        (effect) =>
          effect.name.includes('paralyz') ||
          effect.name.includes('hold') ||
          effect.name.includes('entangle')
      ) || [];

    if (restrictingEffects.length > 0) {
      return {
        success: false,
        message: `Cannot move due to: ${restrictingEffects.map((e) => e.name).join(', ')}`,
      };
    }

    // Check movement distance limits
    const maxMovement = this.getMaxMovementDistance(character, data.movementType);
    if (data.distance > maxMovement * 4) {
      // Allow up to 4x normal movement with penalties
      return {
        success: false,
        message: `Distance ${data.distance} feet exceeds maximum possible movement of ${maxMovement * 4} feet`,
      };
    }

    return { success: true, message: 'Movement is valid' };
  }

  private calculateMovement(character: Character, data: MovementRequest): MovementResult {
    const baseMovement = this.getBaseMovementRate(character);
    const encumbranceModifier = this.getEncumbranceModifier(character, data.encumbrance);
    const terrainModifier = this.getTerrainModifier(data.terrainType);
    const movementTypeModifier = this.getMovementTypeModifier(data.movementType);

    // Calculate effective movement rate
    const effectiveMovement = Math.floor(
      baseMovement * encumbranceModifier * terrainModifier * movementTypeModifier
    );

    // Determine if character can complete the movement
    const canComplete = data.distance <= effectiveMovement;

    if (canComplete) {
      return {
        success: true,
        actualDistance: data.distance,
        timeRequired: this.calculateTimeRequired(
          data.distance,
          effectiveMovement,
          data.movementType
        ),
        fatigueGained: this.calculateFatigueGain(character, data),
        specialEffects: this.getMovementEffects(data),
        message: `Moved ${data.distance} feet successfully`,
      };
    }

    // Partial movement possible
    const maxPossible = effectiveMovement;
    return {
      success: false,
      actualDistance: maxPossible,
      timeRequired: this.calculateTimeRequired(maxPossible, effectiveMovement, data.movementType),
      fatigueGained: this.calculateFatigueGain(character, { ...data, distance: maxPossible }),
      specialEffects: this.getMovementEffects({ ...data, distance: maxPossible }),
      message: `Could only move ${maxPossible} feet of requested ${data.distance} feet`,
    };
  }

  private getBaseMovementRate(character: Character): number {
    // Base movement rates by race (in feet per round)
    const raceMovement: Record<string, number> = {
      Human: 120,
      Elf: 120,
      'Half-Elf': 120,
      Dwarf: 60,
      Halfling: 60,
      Gnome: 60,
      'Half-Orc': 120,
    };

    const baseRate = raceMovement[character.race] || 120;

    // Apply armor penalties if wearing heavy armor
    // This would check equipped armor from inventory
    // For now, using a simple check
    const armorPenalty = this.getArmorMovementPenalty(character);

    return Math.max(30, baseRate - armorPenalty); // Minimum 30 feet
  }

  private getArmorMovementPenalty(character: Character): number {
    // AC-based penalty estimation (lower AC = heavier armor in descending system)
    if (character.armorClass <= 0) return 60; // Plate mail + shield
    if (character.armorClass <= 2) return 30; // Chain mail
    if (character.armorClass <= 5) return 0; // Leather or lighter
    return 0; // No armor
  }

  private getEncumbranceModifier(_character: Character, encumbrance?: string): number {
    const modifiers: Record<string, number> = {
      light: 1.0,
      moderate: 0.75,
      heavy: 0.5,
      severe: 0.25,
    };

    return modifiers[encumbrance || 'light'] || 1.0;
  }

  private getTerrainModifier(terrainType?: string): number {
    const modifiers: Record<string, number> = {
      clear: 1.0,
      rough: 0.75,
      difficult: 0.5,
      swamp: 0.25,
      mountain: 0.5,
      forest: 0.75,
      desert: 0.75,
      ice: 0.5,
      underwater: 0.25,
    };

    return modifiers[terrainType || 'clear'];
  }

  private getMovementTypeModifier(movementType: string): number {
    const modifiers: Record<string, number> = {
      walk: 1.0,
      run: 3.0, // Can run 3x normal speed but gains fatigue
      swim: 0.25, // Swimming is much slower
      climb: 0.25, // Climbing is very slow
      fly: 2.0, // Flying is faster if capable
    };

    return modifiers[movementType] || 1.0;
  }

  private calculateTimeRequired(
    distance: number,
    movementRate: number,
    movementType: string
  ): number {
    // Base time in rounds (10 seconds each)
    const baseTime = Math.ceil(distance / movementRate);

    // Some movement types take longer
    const timeModifiers: Record<string, number> = {
      walk: 1.0,
      run: 1.0,
      swim: 2.0, // Swimming takes more time due to technique
      climb: 4.0, // Climbing is very time-consuming
      fly: 0.5, // Flying is faster if no obstacles
    };

    return Math.ceil(baseTime * (timeModifiers[movementType] || 1.0));
  }

  private calculateFatigueGain(character: Character, data: MovementRequest): number {
    let baseFatigue = 0;

    // Running generates fatigue
    if (data.movementType === 'run') {
      baseFatigue = Math.floor(data.distance / 120); // 1 fatigue per 120 feet of running
    }

    // Swimming and climbing are very tiring
    if (data.movementType === 'swim' || data.movementType === 'climb') {
      baseFatigue = Math.floor(data.distance / 60); // 1 fatigue per 60 feet
    }

    // Constitution modifier affects fatigue
    const conModifier = this.getConstitutionFatigueModifier(character.abilities.constitution);

    return Math.max(0, baseFatigue - conModifier);
  }

  private getConstitutionFatigueModifier(constitution: number): number {
    if (constitution >= 18) return 3;
    if (constitution >= 16) return 2;
    if (constitution >= 14) return 1;
    if (constitution >= 9) return 0;
    if (constitution >= 7) return -1;
    return -2;
  }

  private getMovementEffects(data: MovementRequest): string[] {
    const effects: string[] = [];

    if (data.movementType === 'run') {
      effects.push('Gained fatigue from running');
    }

    if (data.terrainType === 'difficult' || data.terrainType === 'swamp') {
      effects.push('Movement slowed by difficult terrain');
    }

    if (data.movementType === 'swim') {
      effects.push('Swimming check may be required');
    }

    if (data.movementType === 'climb') {
      effects.push('Climbing check may be required');
    }

    return effects;
  }

  private getMaxMovementDistance(character: Character, movementType: string): number {
    const baseRate = this.getBaseMovementRate(character);
    const typeModifier = this.getMovementTypeModifier(movementType);

    return Math.floor(baseRate * typeModifier);
  }

  private applyMovementEffects(
    _character: Character,
    _result: MovementResult,
    _context: GameContext
  ): void {
    // Apply movement effects to the character
    // This would update character position, apply fatigue, etc.
    // For now, this is a placeholder for the actual implementation
  }
}
