import * as planar from '@rules/travel/planar';
import type { Character } from '@rules/types';
import { createMockCharacter } from '@tests/utils/mockData';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('Planar Travel', () => {
  let mockCaster: Character;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Create a mock caster character
    mockCaster = createMockCharacter({
      customizeCharacter: {
        id: 'caster1',
        name: 'Test Caster',
        abilities: {
          intelligence: 18, // +4 modifier
          wisdom: 16, // +3 modifier
          charisma: 14, // +2 modifier
          strength: 10,
          dexterity: 10,
          constitution: 10,
        },
        level: 12,
        hitPoints: { current: 60, maximum: 60 },
        armorClass: 12,
        inventory: [
          {
            id: 'weapon1',
            name: 'Dagger',
            weight: 1,
            description: 'A basic dagger',
            value: 2,
            equipped: true,
            magicBonus: null,
            charges: null,
          },
          {
            id: 'armor1',
            name: 'Leather Armor',
            weight: 15,
            description: 'Basic leather armor',
            value: 20,
            equipped: true,
            magicBonus: null,
            charges: null,
          },
        ],
        encumbrance: 0,
        position: '0,0,0',
      },
    });
  });

  describe('PlanarTravelSpells', () => {
    it('should define standard planar travel spells', () => {
      expect(planar.PlanarTravelSpells.astralProjection).toBeDefined();
      expect(planar.PlanarTravelSpells.planeShift).toBeDefined();
      expect(planar.PlanarTravelSpells.gate).toBeDefined();
    });

    it('should have correct properties for planeShift', () => {
      expect(planar.PlanarTravelSpells.planeShift.spellLevel).toBe(5);
      expect(planar.PlanarTravelSpells.planeShift.baseSuccessChance).toBe(85);
      expect(planar.PlanarTravelSpells.planeShift.components).toContain('V');
    });
  });

  describe('attemptPlanarTravel', () => {
    it('should have a high chance of success with planeShift', () => {
      // Mock random to return 10% (ensuring success with the base 85% chance)
      vi.spyOn(Math, 'random').mockReturnValue(0.1);

      const result = planar.attemptPlanarTravel(
        mockCaster,
        planar.PlanarTravelSpells.planeShift,
        planar.Plane.Astral,
        planar.Plane.PrimeMaterial,
        true, // has focus
        false // not familiar
      );

      expect(result.success).toBe(true);
      expect(result.destination).toBe(planar.Plane.Astral);
      expect(result.mishap).toBe(false);
    });

    it('should have a chance of mishap with planeShift', () => {
      // Mock random to return 95% (ensuring a mishap with 15% chance)
      vi.spyOn(Math, 'random').mockReturnValue(0.95);

      const result = planar.attemptPlanarTravel(
        mockCaster,
        planar.PlanarTravelSpells.planeShift,
        planar.Plane.Astral,
        planar.Plane.PrimeMaterial,
        true
      );

      expect(result.success).toBe(false);
      expect(result.mishap).toBe(true);
      expect(result.mishapEffect).toBeDefined();
    });

    it('should be more successful with higher caster level', () => {
      // For a level 12 caster with planeShift (min level 9), they get +6% (2% per level over minimum)
      // Base 85% + 6% = 91% success chance
      // For a level 18 caster, they get +18% (2% per level over minimum)
      // Base 85% + 18% = 103% (capped at 95%)

      // Test with a roll that should fail for level 12 but succeed for level 18
      const rollThatShouldPassForHighLevel = 94; // 94 is less than 95% (level 18 cap) but more than 91% (level 12 cap)
      vi.spyOn(Math, 'random').mockReturnValue(rollThatShouldPassForHighLevel / 100);

      // First test with level 12 caster (should fail)
      const result12 = planar.attemptPlanarTravel(
        { ...mockCaster, level: 12 }, // level 12
        planar.PlanarTravelSpells.planeShift,
        planar.Plane.Astral,
        planar.Plane.PrimeMaterial,
        true,
        true // isFamiliar to avoid the -20% penalty
      );
      expect(result12.success).toBe(false);

      // Then test with level 18 caster (should succeed)
      const result18 = planar.attemptPlanarTravel(
        { ...mockCaster, level: 18 },
        planar.PlanarTravelSpells.planeShift,
        planar.Plane.Astral,
        planar.Plane.PrimeMaterial,
        true,
        true // isFamiliar to avoid the -20% penalty
      );
      expect(result18.success).toBe(true);
    });
  });

  describe('calculateTimeDifference', () => {
    it('should return 0 for the Astral Plane', () => {
      const result = planar.calculateTimeDifference(
        planar.Plane.PrimeMaterial,
        planar.Plane.Astral
      );
      expect(result).toBe(0); // Astral Plane is timeless (multiplier = 0)
    });

    it('should return 1.0 for the Ethereal Plane', () => {
      const result = planar.calculateTimeDifference(
        planar.Plane.PrimeMaterial,
        planar.Plane.Ethereal
      );
      expect(result).toBe(1.0);
    });

    it('should return 1.5 for the Elemental Air Plane', () => {
      const result = planar.calculateTimeDifference(
        planar.Plane.PrimeMaterial,
        planar.Plane.ElementalAir
      );
      expect(result).toBe(1.5);
    });

    it('should return 2.0 for the Elemental Fire Plane', () => {
      const result = planar.calculateTimeDifference(
        planar.Plane.PrimeMaterial,
        planar.Plane.ElementalFire
      );
      expect(result).toBe(2.0);
    });

    it('should return 0.75 for the Elemental Water Plane', () => {
      const result = planar.calculateTimeDifference(
        planar.Plane.PrimeMaterial,
        planar.Plane.ElementalWater
      );
      expect(result).toBe(0.75);
    });

    it('should return 0.5 for the Elemental Earth Plane', () => {
      const result = planar.calculateTimeDifference(
        planar.Plane.PrimeMaterial,
        planar.Plane.ElementalEarth
      );
      expect(result).toBe(0.5);
    });

    it('should return 1.0 when traveling between the same plane', () => {
      const result = planar.calculateTimeDifference(
        planar.Plane.PrimeMaterial,
        planar.Plane.PrimeMaterial
      );
      expect(result).toBe(1.0);
    });
  });

  describe('getPlanarSideEffects', () => {
    it('should return side effects for the Abyss', () => {
      const effects = planar.getPlanarSideEffects(planar.Plane.Abyss);
      expect(effects).toBeDefined();
      expect(effects.length).toBeGreaterThan(0);
      expect(effects.some((e) => e.includes('chaotic') || e.includes('demon'))).toBe(true);
    });

    it('should return side effects for the Nine Hells', () => {
      const effects = planar.getPlanarSideEffects(planar.Plane.NineHells);
      expect(effects).toBeDefined();
      expect(effects.length).toBeGreaterThan(0);
      expect(effects.some((e) => e.includes('evil') || e.includes('Devil'))).toBe(true);
    });
  });

  describe('getRandomMishap', () => {
    it('should return a mishap string', () => {
      // Mock Math.random to return a fixed value
      const originalRandom = Math.random;
      Math.random = () => 0.5; // Always return 0.5 for consistent test

      try {
        const mishap = planar.getRandomMishap();
        expect(typeof mishap).toBe('string');
        expect(mishap.length).toBeGreaterThan(0);
      } finally {
        // Restore original Math.random
        Math.random = originalRandom;
      }
    });
  });

  describe('calculateTimePassage', () => {
    it('should calculate normal time passage', () => {
      const result = planar.calculateTimePassage(10, 1);
      expect(result.materialTime).toBe(10);
      expect(result.message).toContain('10 hours on the plane, 10 hours have passed');
    });

    it('should calculate accelerated time passage', () => {
      const result = planar.calculateTimePassage(10, 10);
      expect(result.materialTime).toBe(100);
      expect(result.message).toContain('10 hours on the plane, 100 hours have passed');
    });

    it('should calculate decelerated time passage', () => {
      const result = planar.calculateTimePassage(10, 0.1);
      expect(result.materialTime).toBe(1);
      expect(result.message).toContain('10 hours on the plane, 1 hour has passed');
    });

    it('should handle timeless planes', () => {
      const result = planar.calculateTimePassage(10, 0);
      expect(result.materialTime).toBe(0);
      expect(result.message).toContain('No time has passed on the Material Plane');
    });
  });

  describe('planar travel with astral projection', () => {
    it('should be very reliable with astral projection', () => {
      // Mock random to ensure success
      vi.spyOn(Math, 'random').mockReturnValue(0.1);

      const result = planar.attemptPlanarTravel(
        mockCaster,
        planar.PlanarTravelSpells.astralProjection,
        planar.Plane.Astral,
        planar.Plane.PrimeMaterial,
        true
      );

      expect(result.success).toBe(true);
      expect(result.mishap).toBe(false);
    });

    it('should handle astral projection failure', () => {
      // Mock random to force a failure
      vi.spyOn(Math, 'random').mockReturnValue(0.99);

      const result = planar.attemptPlanarTravel(
        mockCaster,
        planar.PlanarTravelSpells.astralProjection,
        planar.Plane.Astral,
        planar.Plane.PrimeMaterial,
        true
      );

      expect(result.success).toBe(false);
      expect(result.mishap).toBe(true);
      expect(result.mishapEffect).toBeDefined();
    });
  });
});
