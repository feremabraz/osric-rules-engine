import {
  AerialAgilityLevel,
  type AerialMovement,
  getAerialMovementRate,
  getDiveAttackBonus,
  handleAerialMovement,
  mountFlyingCreature,
} from '@osric/rules/combat/AerialCombatRules';
import type { Character, Monster } from '@osric/types/entities';
import { beforeEach, describe, expect, it } from 'vitest';

function createAerialMovement(overrides: Partial<AerialMovement> = {}): AerialMovement {
  const defaultMovement: AerialMovement = {
    currentAltitude: 100,
    currentSpeed: 240,
    maxSpeed: 300,
    currentAgility: AerialAgilityLevel.Good,
    isDiving: false,
    diveDistance: 0,
    maneuverabilityClass: 'B',
    currentFacing: 0,
    minimumForwardSpeed: 60,
    climbingRate: 30,
    divingRate: 90,
    windSpeed: 0,
    windDirection: 0,
    weatherCondition: 'clear',
  };

  return { ...defaultMovement, ...overrides };
}

describe('AerialCombatRules', () => {
  describe('Aerial Agility Levels', () => {
    it('should validate Perfect agility (Class A equivalent)', () => {
      const movement = getAerialMovementRate(AerialAgilityLevel.Perfect);

      expect(movement.accelerationRounds).toBe(0);
      expect(movement.turnAngle).toBe(180);
      expect(movement.canHover).toBe(true);
      expect(movement.instantAcceleration).toBe(true);
    });

    it('should validate Excellent agility (Class B equivalent)', () => {
      const movement = getAerialMovementRate(AerialAgilityLevel.Excellent);

      expect(movement.accelerationRounds).toBe(0.25);
      expect(movement.turnAngle).toBe(120);
      expect(movement.canHover).toBe(true);
      expect(movement.instantAcceleration).toBe(false);
    });

    it('should validate Good agility (Class C equivalent)', () => {
      const movement = getAerialMovementRate(AerialAgilityLevel.Good);

      expect(movement.accelerationRounds).toBe(1);
      expect(movement.turnAngle).toBe(90);
      expect(movement.canHover).toBe(false);
      expect(movement.instantAcceleration).toBe(false);
    });

    it('should validate Average agility (Class D equivalent)', () => {
      const movement = getAerialMovementRate(AerialAgilityLevel.Average);

      expect(movement.accelerationRounds).toBe(2);
      expect(movement.turnAngle).toBe(60);
      expect(movement.canHover).toBe(false);
      expect(movement.instantAcceleration).toBe(false);
    });

    it('should validate Poor agility (Class E equivalent)', () => {
      const movement = getAerialMovementRate(AerialAgilityLevel.Poor);

      expect(movement.accelerationRounds).toBe(5);
      expect(movement.turnAngle).toBe(30);
      expect(movement.canHover).toBe(false);
      expect(movement.instantAcceleration).toBe(false);
    });

    it('should validate Drifting agility (Special case)', () => {
      const movement = getAerialMovementRate(AerialAgilityLevel.Drifting);

      expect(movement.accelerationRounds).toBe(0);
      expect(movement.turnAngle).toBe(0);
      expect(movement.canHover).toBe(true);
      expect(movement.instantAcceleration).toBe(true);
    });
  });

  describe('Aerial Movement Mechanics', () => {
    it('should handle level flight correctly', () => {
      const initialMovement = createAerialMovement({
        currentAltitude: 100,
        currentSpeed: 240,
      });

      const result = handleAerialMovement(initialMovement, 'level', 240);

      expect(result.currentAltitude).toBe(100);
      expect(result.currentSpeed).toBeGreaterThanOrEqual(240);
      expect(result.isDiving).toBe(false);
    });

    it('should handle ascending movement with speed reduction', () => {
      const initialMovement = createAerialMovement({
        currentAltitude: 100,
        currentSpeed: 240,
        climbingRate: 60,
      });

      const result = handleAerialMovement(initialMovement, 'ascend', 120);

      expect(result.currentAltitude).toBeGreaterThan(100);
      expect(result.currentAltitude).toBeLessThanOrEqual(160);
      expect(result.isDiving).toBe(false);
    });

    it('should handle descending movement', () => {
      const initialMovement = createAerialMovement({
        currentAltitude: 200,
        currentSpeed: 240,
      });

      const result = handleAerialMovement(initialMovement, 'descend', 50);

      expect(result.currentAltitude).toBe(150);
      expect(result.isDiving).toBe(false);
    });

    it('should handle diving movement with speed increase', () => {
      const initialMovement = createAerialMovement({
        currentAltitude: 200,
        currentSpeed: 240,
        maxSpeed: 360,
        divingRate: 90,
      });

      const result = handleAerialMovement(initialMovement, 'descend', 50);

      expect(result.currentAltitude).toBe(150);
      expect(result.isDiving).toBe(true);
      expect(result.diveDistance).toBe(50);
      expect(result.currentSpeed).toBeGreaterThan(240);
    });

    it('should enforce minimum forward speed for non-hovering creatures', () => {
      const initialMovement = createAerialMovement({
        currentSpeed: 30,
        minimumForwardSpeed: 60,
        currentAgility: AerialAgilityLevel.Good,
      });

      const result = handleAerialMovement(initialMovement, 'level', 60);

      expect(result.currentSpeed).toBeGreaterThanOrEqual(60);
    });

    it('should allow hovering for creatures with hover capability', () => {
      const initialMovement = createAerialMovement({
        currentSpeed: 0,
        minimumForwardSpeed: 60,
        currentAgility: AerialAgilityLevel.Perfect,
      });

      const result = handleAerialMovement(initialMovement, 'level', 0);

      expect(result.currentSpeed).toBe(0);
    });

    it('should prevent going below ground level', () => {
      const initialMovement = createAerialMovement({
        currentAltitude: 10,
      });

      const result = handleAerialMovement(initialMovement, 'descend', 50);

      expect(result.currentAltitude).toBe(0);
    });
  });

  describe('Wind Effects', () => {
    it('should apply tailwind effects correctly', () => {
      const initialMovement = createAerialMovement({
        currentSpeed: 240,
        maxSpeed: 360,
        currentFacing: 0,
        windSpeed: 30,
        windDirection: 0,
      });

      const result = handleAerialMovement(initialMovement, 'level', 240);

      expect(result.currentSpeed).toBeGreaterThan(240);
    });

    it('should apply headwind effects correctly', () => {
      const initialMovement = createAerialMovement({
        currentSpeed: 240,
        minimumForwardSpeed: 60,
        currentFacing: 0,
        windSpeed: 30,
        windDirection: 180,
      });

      const result = handleAerialMovement(initialMovement, 'level', 240);

      expect(result.currentSpeed).toBeLessThan(240);
      expect(result.currentSpeed).toBeGreaterThanOrEqual(60);
    });

    it('should apply crosswind drift effects', () => {
      const initialMovement = createAerialMovement({
        currentFacing: 0,
        windSpeed: 40,
        windDirection: 90,
      });

      const result = handleAerialMovement(initialMovement, 'level', 240);

      expect(Math.abs(result.currentFacing - initialMovement.currentFacing)).toBeGreaterThan(0);
    });
  });

  describe('Weather Conditions', () => {
    it('should apply rain effects', () => {
      const initialMovement = createAerialMovement({
        currentSpeed: 240,
        minimumForwardSpeed: 60,
        weatherCondition: 'rain',
      });

      const result = handleAerialMovement(initialMovement, 'level', 240);

      expect(result.currentSpeed).toBeLessThan(240);
      expect(result.currentSpeed).toBeCloseTo(216, 0);
    });

    it('should apply storm effects', () => {
      const initialMovement = createAerialMovement({
        currentSpeed: 240,
        minimumForwardSpeed: 60,
        weatherCondition: 'storm',
      });

      const result = handleAerialMovement(initialMovement, 'level', 240);

      expect(result.currentSpeed).toBeLessThan(240);
      expect(result.currentSpeed).toBeCloseTo(168, 0);
      expect(result.currentSpeed).toBeGreaterThanOrEqual(90);
    });

    it('should apply gale effects', () => {
      const initialMovement = createAerialMovement({
        currentSpeed: 240,
        maxSpeed: 360,
        weatherCondition: 'gale',
      });

      const result = handleAerialMovement(initialMovement, 'level', 240);

      expect(result.currentSpeed).toBe(360);
    });

    it('should apply hurricane effects', () => {
      const initialMovement = createAerialMovement({
        currentSpeed: 180,
        maxSpeed: 360,
        weatherCondition: 'hurricane',
      });

      const result = handleAerialMovement(initialMovement, 'level', 180);

      expect(result.currentSpeed).toBe(360);
    });
  });

  describe('Dive Attack Mechanics', () => {
    it('should calculate dive attack bonus for sufficient dive distance', () => {
      const divingMovement = createAerialMovement({
        isDiving: true,
        diveDistance: 30,
      });

      const bonus = getDiveAttackBonus(divingMovement);
      expect(bonus).toBe(2);
    });

    it('should not give dive attack bonus for insufficient dive distance', () => {
      const shallowDiveMovement = createAerialMovement({
        isDiving: true,
        diveDistance: 6,
      });

      const bonus = getDiveAttackBonus(shallowDiveMovement);
      expect(bonus).toBe(0);
    });

    it('should not give dive attack bonus when not diving', () => {
      const levelMovement = createAerialMovement({
        isDiving: false,
        diveDistance: 0,
      });

      const bonus = getDiveAttackBonus(levelMovement);
      expect(bonus).toBe(0);
    });
  });

  describe('Flying Mount Mechanics', () => {
    it('should mount creature with flying agility', () => {
      const flyingMount = {
        flyingAgility: AerialAgilityLevel.Good,
      };

      const agility = mountFlyingCreature(flyingMount);
      expect(agility).toBe(AerialAgilityLevel.Good);
    });

    it('should handle creature without flying capability', () => {
      const groundMount = {
        flyingAgility: null,
      };

      const agility = mountFlyingCreature(groundMount);
      expect(agility).toBeNull();
    });

    it('should preserve mount agility level', () => {
      const excellentFlyer = {
        flyingAgility: AerialAgilityLevel.Excellent,
      };

      const agility = mountFlyingCreature(excellentFlyer);
      expect(agility).toBe(AerialAgilityLevel.Excellent);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle zero wind speed', () => {
      const movement = createAerialMovement({
        windSpeed: 0,
        currentSpeed: 240,
      });

      const result = handleAerialMovement(movement, 'level', 240);
      expect(result.currentSpeed).toBe(240);
    });

    it('should handle extreme wind speeds', () => {
      const movement = createAerialMovement({
        windSpeed: 100,
        windDirection: 0,
        currentFacing: 0,
        maxSpeed: 360,
      });

      const result = handleAerialMovement(movement, 'level', 240);
      expect(result.currentSpeed).toBeLessThanOrEqual(360);
    });

    it('should handle undefined weather conditions', () => {
      const movement = createAerialMovement({
        weatherCondition: undefined,
      });

      expect(() => {
        handleAerialMovement(movement, 'level', 240);
      }).not.toThrow();
    });

    it('should handle negative altitude gracefully', () => {
      const movement = createAerialMovement({
        currentAltitude: -10,
      });

      const result = handleAerialMovement(movement, 'descend', 50);
      expect(result.currentAltitude).toBe(0);
    });

    it('should handle invalid agility levels', () => {
      expect(() => {
        getAerialMovementRate(999 as AerialAgilityLevel);
      }).not.toThrow();

      const result = getAerialMovementRate(999 as AerialAgilityLevel);
      expect(result.accelerationRounds).toBe(0);
      expect(result.turnAngle).toBe(0);
      expect(result.canHover).toBe(false);
      expect(result.instantAcceleration).toBe(false);
    });

    it('should maintain consistent state across multiple movements', () => {
      let movement = createAerialMovement({
        currentAltitude: 100,
        currentSpeed: 240,
      });

      movement = handleAerialMovement(movement, 'ascend', 60);
      movement = handleAerialMovement(movement, 'level', 120);
      movement = handleAerialMovement(movement, 'descend', 30);

      expect(movement.currentAltitude).toBeGreaterThan(100);
      expect(movement.currentSpeed).toBeGreaterThan(0);
    });
  });
});
