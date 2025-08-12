import type { Command } from '@osric/core/Command';
import type { GameContext } from '@osric/core/GameContext';
import { BaseRule, isFailure, isSuccess } from '@osric/core/Rule';
import type { RuleResult } from '@osric/core/Rule';
import type { CharacterId } from '@osric/types';
import type { Character } from '@osric/types/character';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';

interface MovementRequest {
  characterId: string | CharacterId;
  fromPosition: string;
  toPosition: string;
  movementType: 'walk' | 'run' | 'swim' | 'climb' | 'fly';
  distance: number;
  terrainType?: string;
  encumbrance?: 'light' | 'moderate' | 'heavy' | 'severe';
}

interface MovementResult {
  kind: 'success' | 'failure';
  actualDistance: number;
  timeRequired: number;
  fatigueGained: number;
  specialEffects: string[];
  message: string;
}

export class MovementRules extends BaseRule {
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
      return this.createFailureResult('No movement request data provided', {
        context: 'movement:error',
      });
    }

    const character = context.getEntity<Character>(data.characterId);

    if (!character) {
      return this.createFailureResult('Character not found', { context: 'movement:error' });
    }

    const validation = this.validateMovement(character, data);
    if (isFailure(validation)) {
      return this.createFailureResult(validation.message, { context: 'movement:validation' });
    }

    const result = this.calculateMovement(context, character, data);

    if (isSuccess(result)) {
      this.applyMovementEffects(character, result, context);
    }

    return this.createSuccessResult(result.message, { result, context: 'movement:calculation' });
  }

  private validateMovement(
    character: Character,
    data: MovementRequest
  ): { kind: 'success' | 'failure'; message: string } {
    if (character.hitPoints.current <= 0) {
      return { kind: 'failure', message: 'Character is unconscious or dead' };
    }

    const restrictingEffects =
      character.statusEffects?.filter(
        (effect) =>
          effect.name.includes('paralyz') ||
          effect.name.includes('hold') ||
          effect.name.includes('entangle')
      ) || [];

    if (restrictingEffects.length > 0) {
      return {
        kind: 'failure',
        message: `Cannot move due to: ${restrictingEffects.map((e) => e.name).join(', ')}`,
      };
    }

    const maxMovement = this.getMaxMovementDistance(character, data.movementType);
    if (data.distance > maxMovement * 4) {
      return {
        kind: 'failure',
        message: `Distance ${data.distance} feet exceeds maximum possible movement of ${maxMovement * 4} feet`,
      };
    }

    return { kind: 'success', message: 'Movement is valid' };
  }

  private calculateMovement(
    context: GameContext,
    character: Character,
    data: MovementRequest
  ): MovementResult {
    const baseFromContext = this.getOptionalContext<number>(context, 'movement:base-rate');
    const baseMovement = baseFromContext ?? this.getBaseMovementRate(character);
    const encumbranceLevel =
      this.getOptionalContext<'light' | 'moderate' | 'heavy' | 'severe'>(
        context,
        'movement:encumbrance-level'
      ) ?? data.encumbrance;
    const encumbranceModifier = this.getEncumbranceModifier(character, encumbranceLevel);
    const terrainModifier = this.getTerrainModifier(data.terrainType);
    const movementTypeModifier = this.getMovementTypeModifier(data.movementType);

    const effectiveMovement = Math.floor(
      baseMovement * encumbranceModifier * terrainModifier * movementTypeModifier
    );

    const canComplete = data.distance <= effectiveMovement;

    if (canComplete) {
      return {
        kind: 'success',
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

    const maxPossible = effectiveMovement;
    return {
      kind: 'failure',
      actualDistance: maxPossible,
      timeRequired: this.calculateTimeRequired(maxPossible, effectiveMovement, data.movementType),
      fatigueGained: this.calculateFatigueGain(character, { ...data, distance: maxPossible }),
      specialEffects: this.getMovementEffects({ ...data, distance: maxPossible }),
      message: `Could only move ${maxPossible} feet of requested ${data.distance} feet`,
    };
  }

  private getBaseMovementRate(character: Character): number {
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

    const armorPenalty = this.getArmorMovementPenalty(character);

    return Math.max(30, baseRate - armorPenalty);
  }

  private getArmorMovementPenalty(character: Character): number {
    if (character.armorClass <= 0) return 60;
    if (character.armorClass <= 2) return 30;
    if (character.armorClass <= 5) return 0;
    return 0;
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
      run: 3.0,
      swim: 0.25,
      climb: 0.25,
      fly: 2.0,
    };

    return modifiers[movementType] || 1.0;
  }

  private calculateTimeRequired(
    distance: number,
    movementRate: number,
    movementType: string
  ): number {
    const baseTime = Math.ceil(distance / movementRate);

    const timeModifiers: Record<string, number> = {
      walk: 1.0,
      run: 1.0,
      swim: 2.0,
      climb: 4.0,
      fly: 0.5,
    };

    return Math.ceil(baseTime * (timeModifiers[movementType] || 1.0));
  }

  private calculateFatigueGain(character: Character, data: MovementRequest): number {
    let baseFatigue = 0;

    if (data.movementType === 'run') {
      baseFatigue = Math.floor(data.distance / 120);
    }

    if (data.movementType === 'swim' || data.movementType === 'climb') {
      baseFatigue = Math.floor(data.distance / 60);
    }

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
  ): void {}
}
