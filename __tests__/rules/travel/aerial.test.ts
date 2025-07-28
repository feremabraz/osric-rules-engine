import { AerialAgilityLevel } from '@rules/combat/mountedCombat';
import {
  AerialMovementRates,
  WindConditions,
  calculateAerialMovement,
  calculateDailyAerialTravel,
  checkFlightMaintenance,
  getMaxTurnAngle,
  updateAerialMovement,
} from '@rules/travel/aerial';
import { describe, expect, it, vi } from 'vitest';

describe('Aerial Travel', () => {
  describe('AerialMovementRates', () => {
    it('should have correct movement rates', () => {
      expect(AerialMovementRates.TINY).toBe(18);
      expect(AerialMovementRates.SMALL).toBe(24);
      expect(AerialMovementRates.MEDIUM).toBe(30);
      expect(AerialMovementRates.LARGE).toBe(36);
      expect(AerialMovementRates.HUGE).toBe(42);
      expect(AerialMovementRates.GARGANTUAN).toBe(48);
    });
  });

  describe('WindConditions', () => {
    it('should define all wind conditions', () => {
      expect(WindConditions.CALM.name).toBe('Calm');
      expect(WindConditions.HURRICANE.name).toBe('Hurricane');
      expect(WindConditions.STORM.effect).toContain('Dangerous conditions');
    });
  });

  describe('calculateAerialMovement', () => {
    it('should calculate movement for perfect agility', () => {
      const movement = calculateAerialMovement(
        30, // baseSpeed
        AerialAgilityLevel.Perfect,
        100, // altitude
        'CALM', // windCondition
        false // isDiving
      );

      expect(movement.currentSpeed).toBe(30);
      expect(movement.maxSpeed).toBe(30);
      expect(movement.climbRate).toBeGreaterThan(0);
      expect(movement.diveSpeed).toBeGreaterThan(30);
    });

    it('should apply wind modifiers', () => {
      const calmMovement = calculateAerialMovement(30, AerialAgilityLevel.Average, 100, 'CALM');
      const stormMovement = calculateAerialMovement(30, AerialAgilityLevel.Average, 100, 'STORM');

      // Speed should be reduced in a storm
      expect(stormMovement.currentSpeed).toBeLessThan(calmMovement.currentSpeed);
    });
  });

  describe('updateAerialMovement', () => {
    const baseState = {
      currentAltitude: 100,
      currentSpeed: 30,
      currentDirection: 0,
      isHovering: false,
      isDiving: false,
      maxSpeed: 60,
      climbRate: 15,
      diveSpeed: 90,
      agility: AerialAgilityLevel.Average,
      windSpeed: 0,
      windDirection: 0,
      weatherCondition: 'CALM' as const,
    };

    it('should handle ascending', () => {
      const newState = updateAerialMovement(baseState, 'ascend', 30);
      expect(newState.currentAltitude).toBe(130);
      expect(newState.currentSpeed).toBeLessThanOrEqual(baseState.currentSpeed);
    });

    it('should handle descending', () => {
      const newState = updateAerialMovement(baseState, 'descend', 30);
      expect(newState.currentAltitude).toBe(70);
      expect(newState.currentSpeed).toBeGreaterThanOrEqual(baseState.currentSpeed);
    });

    it('should handle turning', () => {
      const newState = updateAerialMovement(baseState, 'turn', 45);
      expect(newState.currentDirection).toBe(45);
    });
  });

  describe('getMaxTurnAngle', () => {
    it('should return correct angles for agility levels', () => {
      expect(getMaxTurnAngle(AerialAgilityLevel.Poor)).toBe(30);
      expect(getMaxTurnAngle(AerialAgilityLevel.Good)).toBe(90);
      expect(getMaxTurnAngle(AerialAgilityLevel.Perfect)).toBe(180);
    });
  });

  describe('calculateDailyAerialTravel', () => {
    const movementState = {
      currentSpeed: 30, // meters/round = ~6.7 mph
      currentDirection: 0,
      currentAltitude: 100,
      isHovering: false,
      isDiving: false,
      maxSpeed: 30,
      climbRate: 15,
      diveSpeed: 60,
      agility: AerialAgilityLevel.Average,
      windSpeed: 0,
      windDirection: 0,
      weatherCondition: 'CALM' as const,
    };

    it('should calculate daily travel distance', () => {
      // 30 m/round = ~10.8 km/h * 8 hours = ~86.4 km per day
      const distance = calculateDailyAerialTravel(movementState, 8);
      expect(distance).toBeGreaterThan(80);
      expect(distance).toBeLessThan(95);
    });

    it('should account for reduced travel hours', () => {
      const fullDay = calculateDailyAerialTravel(movementState, 8);
      const halfDay = calculateDailyAerialTravel(movementState, 4);
      expect(halfDay).toBeCloseTo(fullDay / 2, 0);
    });
  });

  describe('checkFlightMaintenance', () => {
    const baseMovementState = {
      currentAltitude: 100,
      currentSpeed: 30,
      currentDirection: 0,
      isHovering: false,
      isDiving: false,
      maxSpeed: 30,
      climbRate: 15,
      diveSpeed: 60,
      agility: AerialAgilityLevel.Average,
      windSpeed: 0,
      windDirection: 0,
      weatherCondition: 'CALM' as const,
    };

    it('should allow flight with sufficient strength', () => {
      const result = checkFlightMaintenance(baseMovementState, 12, false);
      expect(result.canContinue).toBe(true);
    });

    it('should prevent flight when encumbered with low strength', () => {
      const result = checkFlightMaintenance(baseMovementState, 8, true);
      expect(result.canContinue).toBe(false);
      expect(result.message).toContain('too encumbered');
    });
  });
});
