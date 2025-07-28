import {
  type AerialMovement,
  getAerialMovementRate,
  getDiveAttackBonus,
  handleAerialMovement,
  mountFlyingCreature,
} from '@rules/combat/aerialCombat';
import { AerialAgilityLevel } from '@rules/combat/mountedCombat';
import { describe, expect, it, vi } from 'vitest';

// Helper function to create valid AerialMovement objects for testing
const createAerialMovement = (overrides: Partial<AerialMovement> = {}): AerialMovement => ({
  currentAltitude: 100,
  currentSpeed: 30,
  maxSpeed: 60,
  currentAgility: AerialAgilityLevel.Average,
  isDiving: false,
  diveDistance: 0,
  maneuverabilityClass: 'C',
  currentFacing: 0,
  minimumForwardSpeed: 10,
  climbingRate: 15,
  divingRate: 90,
  windSpeed: 0,
  windDirection: 0,
  weatherCondition: 'clear',
  ...overrides,
});

describe('Aerial Combat', () => {
  describe('getAerialMovementRate', () => {
    it('should return correct values for Perfect agility', () => {
      const result = getAerialMovementRate(AerialAgilityLevel.Perfect);
      expect(result).toEqual({
        accelerationRounds: 0,
        turnAngle: 180,
        canHover: true,
        instantAcceleration: true,
      });
    });

    it('should return correct values for Poor agility', () => {
      const result = getAerialMovementRate(AerialAgilityLevel.Poor);
      expect(result).toEqual({
        accelerationRounds: 5,
        turnAngle: 30,
        canHover: false,
        instantAcceleration: false,
      });
    });

    it('should handle invalid agility levels', () => {
      // @ts-expect-error testing invalid enum value
      const result = getAerialMovementRate(999);
      expect(result).toEqual({
        accelerationRounds: 0,
        turnAngle: 0,
        canHover: false,
        instantAcceleration: false,
      });
    });
  });

  describe('handleAerialMovement', () => {
    const baseMovement = createAerialMovement();

    it('should handle ascending movement', () => {
      const result = handleAerialMovement(
        { ...baseMovement },
        'ascend',
        30 // distance
      );

      expect(result.currentAltitude).toBe(115); // 100 + (30 * 0.5)
      expect(result.currentSpeed).toBe(30); // Speed remains the same
      expect(result.isDiving).toBe(false);
    });

    it('should handle descending movement', () => {
      const result = handleAerialMovement(
        { ...baseMovement },
        'descend',
        30 // distance
      );

      expect(result.currentAltitude).toBe(70); // 100 - 30
      expect(result.isDiving).toBe(false); // Not enough distance for dive
      expect(result.currentSpeed).toBe(30);
    });

    it('should handle diving', () => {
      const result = handleAerialMovement(
        { ...baseMovement },
        'descend',
        50 // distance > 30, should trigger dive
      );

      expect(result.currentAltitude).toBe(50); // 100 - 50
      expect(result.isDiving).toBe(true);
      expect(result.diveDistance).toBe(50);
    });
  });

  describe('getDiveAttackBonus', () => {
    it('should return 0 when not diving', () => {
      const attacker = createAerialMovement({
        isDiving: false,
        diveDistance: 0,
      });
      expect(getDiveAttackBonus(attacker)).toBe(0);
    });

    it('should return 0 when diving less than 30ft', () => {
      const attacker = createAerialMovement({
        isDiving: true,
        diveDistance: 20,
      });
      expect(getDiveAttackBonus(attacker)).toBe(0);
    });

    it('should return 2 when diving more than 30ft', () => {
      const attacker = createAerialMovement({
        isDiving: true,
        diveDistance: 50,
      });
      expect(getDiveAttackBonus(attacker)).toBe(2);
    });
  });

  describe('mountFlyingCreature', () => {
    it('should return null for non-flying mounts', () => {
      const mount = {
        id: 'mount1',
        name: 'Horse',
        type: 'land',
        movementRate: 60,
        armorClass: 12,
        hitPoints: 30,
        size: 'Large',
        flying: false,
        flyingAgility: null,
        encumbrance: { current: 0, max: 200 },
        isEncumbered: false,
        mountedBy: null,
      };
      expect(mountFlyingCreature(mount)).toBeNull();
    });

    it('should return agility for flying mounts', () => {
      const mount = { flyingAgility: AerialAgilityLevel.Good };
      expect(mountFlyingCreature(mount)).toBe(AerialAgilityLevel.Good);
    });
  });
});
