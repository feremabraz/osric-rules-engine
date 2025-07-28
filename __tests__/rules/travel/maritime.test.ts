import {
  SeaConditions,
  ShipTypes,
  calculateCrewFatigue,
  calculateDailyShipMovement,
  checkForShipDamage,
  performNavigationCheck,
  resolveDayOfTravel,
} from '@rules/travel/maritime';
import type { Character } from '@rules/types';
import { createMockCharacter } from '@tests/utils/mockData';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('Maritime Travel', () => {
  describe('ShipTypes', () => {
    it('should define standard ship types', () => {
      expect(ShipTypes.rowboat).toBeDefined();
      expect(ShipTypes.sailingShip).toBeDefined();
      expect(ShipTypes.warship).toBeDefined();
      expect(ShipTypes.galley).toBeDefined();
    });

    it('should have correct properties for rowboat', () => {
      expect(ShipTypes.rowboat.speed).toBe(1.5);
      expect(ShipTypes.rowboat.crewRequired).toBe(1);
      expect(ShipTypes.rowboat.cost).toBe(50);
    });
  });

  describe('SeaConditions', () => {
    it('should define all sea conditions', () => {
      expect(SeaConditions.calm).toBeDefined();
      expect(SeaConditions.choppy).toBeDefined();
      expect(SeaConditions.rough).toBeDefined();
    });

    it('should have correct modifiers for calm conditions', () => {
      expect(SeaConditions.calm.movementModifier).toBe(1.0);
      expect(SeaConditions.calm.navigationDC).toBe(5);
      expect(SeaConditions.calm.damageRisk).toBe(0);
    });
  });

  describe('performNavigationCheck', () => {
    // Create a mock navigator with specific ability scores
    const mockNavigator = createMockCharacter({
      customizeCharacter: {
        name: 'Test Navigator',
        abilities: {
          strength: 0,
          dexterity: 0,
          constitution: 0,
          intelligence: 12, // +1 modifier
          wisdom: 10,
          charisma: 0,
        },
        level: 1,
        hitPoints: { current: 8, maximum: 8 },
        armorClass: 10,
      },
    });

    // Set the ID after creation since it's not directly configurable
    mockNavigator.id = 'navigator1';

    it('should succeed with proper tools and skills', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5); // Simulate a roll of 10 on d20

      const result = performNavigationCheck(
        mockNavigator,
        SeaConditions.calm,
        true, // hasNavigatorsTools
        true, // hasMap
        true // hasCompass
      );

      expect(result.success).toBe(true);
      expect(result.degreesOffCourse).toBeLessThan(5);
      expect(result.distanceOffCourse).toBeLessThan(1);
    });

    it('should be harder in rough conditions', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5); // Simulate a roll of 10 on d20

      const result = performNavigationCheck(mockNavigator, SeaConditions.rough, true, true, true);

      expect(result.success).toBe(false); // DC is higher in rough conditions
    });
  });

  describe('calculateDailyShipMovement', () => {
    it('should calculate movement for a rowboat in calm conditions', () => {
      // 1.5 knots * 24 hours * 1.852 km per nautical mile = ~66.67 km/day
      const distance = calculateDailyShipMovement(ShipTypes.rowboat, SeaConditions.calm, 1.0);
      expect(distance).toBeCloseTo(66.67, 0);
    });

    it('should reduce speed in choppy conditions', () => {
      const calmDistance = calculateDailyShipMovement(
        ShipTypes.sailingShip,
        SeaConditions.calm,
        1.0
      );
      const choppyDistance = calculateDailyShipMovement(
        ShipTypes.sailingShip,
        SeaConditions.choppy,
        1.0
      );

      expect(choppyDistance).toBeLessThan(calmDistance);
      expect(choppyDistance).toBeCloseTo(calmDistance * 0.75, 0);
    });

    it('should reduce speed with reduced crew', () => {
      const fullCrewDistance = calculateDailyShipMovement(
        ShipTypes.galley,
        SeaConditions.calm,
        1.0
      );
      const halfCrewDistance = calculateDailyShipMovement(
        ShipTypes.galley,
        SeaConditions.calm,
        0.5
      );

      expect(halfCrewDistance).toBeLessThan(fullCrewDistance);
    });
  });

  describe('checkForShipDamage', () => {
    it('should not damage ship in calm conditions', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.1); // 10% roll

      const result = checkForShipDamage(
        ShipTypes.rowboat,
        SeaConditions.calm,
        0 // captain skill bonus
      );

      expect(result.damage).toBe(0);
    });

    it('should potentially damage ship in storm conditions', () => {
      // Test with stormy conditions which have a damageRisk of 15
      const stormyCondition = { ...SeaConditions.stormy };

      // We'll test multiple times since it's random
      let damageOccurred = false;
      let criticalOccurred = false;

      // Run multiple times to increase chance of hitting the damage case
      for (let i = 0; i < 100; i++) {
        const result = checkForShipDamage(
          ShipTypes.rowboat,
          stormyCondition,
          0 // captain skill bonus
        );

        if (result.damage > 0) {
          damageOccurred = true;
          if (result.critical) {
            criticalOccurred = true;
          }
          // No need to continue if we've seen both damage and critical
          if (damageOccurred && criticalOccurred) break;
        }
      }

      // Verify that damage occurred at least once
      expect(damageOccurred).toBe(true);
      // Critical is possible but not guaranteed, so we'll just check that damage can occur
    });
  });

  describe('calculateCrewFatigue', () => {
    it('should cause more fatigue with reduced crew', () => {
      const fullCrewFatigue = calculateCrewFatigue(1.0, SeaConditions.calm);
      const halfCrewFatigue = calculateCrewFatigue(0.5, SeaConditions.calm);

      expect(halfCrewFatigue).toBeGreaterThan(fullCrewFatigue);
    });

    it('should cause more fatigue in rough conditions', () => {
      const calmFatigue = calculateCrewFatigue(1.0, SeaConditions.calm);
      const roughFatigue = calculateCrewFatigue(1.0, SeaConditions.rough);

      expect(roughFatigue).toBeGreaterThan(calmFatigue);
    });
  });

  describe('resolveDayOfTravel', () => {
    let mockCaptain: Character;
    let mockNavigator: Character;

    // Mock the resolveDayOfTravel function if needed
    vi.mock('@rules/travel/maritime', async () => {
      const actual = await vi.importActual('@rules/travel/maritime');
      return {
        ...(actual as Record<string, unknown>),
        // Add any mocks here if needed
      };
    });

    beforeEach(() => {
      mockCaptain = createMockCharacter({
        customizeCharacter: {
          id: 'captain1',
          name: 'Test Captain',
          abilities: {
            charisma: 14, // +2 modifier
            wisdom: 12,
            strength: 10,
            dexterity: 10,
            constitution: 10,
            intelligence: 10,
          },
          level: 1,
          hitPoints: { current: 10, maximum: 10 },
          armorClass: 10,
        },
      });

      mockNavigator = createMockCharacter({
        customizeCharacter: {
          id: 'navigator1',
          name: 'Test Navigator',
          abilities: {
            intelligence: 14, // +2 modifier
            wisdom: 12,
            strength: 10,
            dexterity: 10,
            constitution: 10,
            charisma: 10,
          },
          level: 1,
          hitPoints: { current: 8, maximum: 8 },
          armorClass: 10,
        },
      });
    });

    it('should resolve a day of travel with expected results', () => {
      // Mock random to ensure consistent test results
      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      const result = resolveDayOfTravel(
        ShipTypes.sailingShip,
        10, // full crew
        SeaConditions.calm,
        mockNavigator,
        mockCaptain,
        true, // hasNavigatorsTools
        true, // hasMap
        true // hasCompass
      );

      expect(result).toHaveProperty('dailyMovement');
      expect(result).toHaveProperty('navigation');
      expect(result).toHaveProperty('damage');
      expect(result).toHaveProperty('crewFatigue');

      // Should have traveled some distance
      expect(result.dailyMovement).toBeGreaterThan(0);

      // With our mocked random, navigation should succeed
      expect(result.navigation.success).toBe(true);
    });
  });
});
