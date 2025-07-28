import {
  LightSources,
  VisibilityRanges,
  calculateVisibility,
  createActiveLightSource,
  getLightRadius,
  hasActiveLightSource,
  isTargetVisible,
  updateLightSourceDuration,
} from '@rules/travel/lighting';
import type { Character, Item } from '@rules/types';
import { createMockCharacter } from '@tests/utils/mockData';
import { describe, expect, it } from 'vitest';

describe('Travel Lighting', () => {
  describe('Light Sources', () => {
    it('should have defined properties for each light source', () => {
      for (const sourceKey of Object.keys(LightSources)) {
        const source = LightSources[sourceKey];
        expect(source.name).toBeDefined();
        expect(source.radius).toBeGreaterThan(0);
        // Check for either a positive duration or infinity
        if (source.duration === Number.POSITIVE_INFINITY) {
          expect(source.duration).toBe(Number.POSITIVE_INFINITY);
        } else {
          expect(source.duration).toBeGreaterThan(0);
        }
        expect(typeof source.bright).toBe('boolean');
        expect(typeof source.requiresHands).toBe('boolean');
        expect(source.description).toBeDefined();
      }
    });

    it('should have valid visibility ranges for lighting conditions', () => {
      expect(VisibilityRanges.Bright).toBeGreaterThan(0);
      expect(VisibilityRanges.Dim).toBeGreaterThan(0);
      expect(VisibilityRanges.Dim).toBeLessThan(VisibilityRanges.Bright);
      expect(VisibilityRanges.Darkness).toBe(0);
    });
  });

  describe('hasActiveLightSource', () => {
    it('should return false when no light source is equipped', () => {
      const character = createMockCharacter({ equipLightSource: false });
      expect(hasActiveLightSource(character)).toBe(false);
    });

    it('should return true when a light source is equipped', () => {
      const character = createMockCharacter({ equipLightSource: true });
      expect(hasActiveLightSource(character)).toBe(true);
    });
  });

  describe('getLightRadius', () => {
    it('should return 0 when no light source is equipped', () => {
      const character = createMockCharacter({ equipLightSource: false });
      expect(getLightRadius(character)).toBe(0);
    });

    it('should return the radius of the equipped light source', () => {
      const character = createMockCharacter({ equipLightSource: true });
      expect(getLightRadius(character)).toBe(LightSources.Torch.radius);
    });
  });

  describe('createActiveLightSource', () => {
    it('should create an active light source with full duration', () => {
      const lightSource = createActiveLightSource('Torch');
      expect(lightSource).not.toBeNull();
      if (lightSource) {
        expect(lightSource.source).toBe(LightSources.Torch);
        expect(lightSource.remainingDuration).toBe(LightSources.Torch.duration);
        expect(lightSource.isActive).toBe(true);
      }
    });

    it('should return null for unknown light source', () => {
      const lightSource = createActiveLightSource('Unknown');
      expect(lightSource).toBeNull();
    });
  });

  describe('updateLightSourceDuration', () => {
    it('should reduce remaining duration by the specified turns', () => {
      const lightSource = createActiveLightSource('Torch');
      if (!lightSource) throw new Error('Failed to create light source');

      const initialDuration = lightSource.remainingDuration;
      const updatedLightSource = updateLightSourceDuration(lightSource, 2);

      expect(updatedLightSource.remainingDuration).toBe(initialDuration - 2);
      expect(updatedLightSource.isActive).toBe(true);
    });

    it('should set isActive to false when duration reaches 0', () => {
      const lightSource = createActiveLightSource('Torch');
      if (!lightSource) throw new Error('Failed to create light source');

      // Update with turn count equal to duration
      const updatedLightSource = updateLightSourceDuration(
        lightSource,
        lightSource.remainingDuration
      );

      expect(updatedLightSource.remainingDuration).toBe(0);
      expect(updatedLightSource.isActive).toBe(false);
    });

    it('should not reduce duration for infinite duration light sources', () => {
      const lightSource = createActiveLightSource('Continual Light spell');
      if (!lightSource) throw new Error('Failed to create light source');

      const updatedLightSource = updateLightSourceDuration(lightSource, 1000);

      expect(updatedLightSource.remainingDuration).toBe(lightSource.remainingDuration);
      expect(updatedLightSource.isActive).toBe(true);
    });
  });

  describe('calculateVisibility', () => {
    it('should return base visibility for lighting conditions without light sources', () => {
      expect(calculateVisibility('Bright', [])).toBe(VisibilityRanges.Bright);
      expect(calculateVisibility('Dim', [])).toBe(VisibilityRanges.Dim);
      expect(calculateVisibility('Darkness', [])).toBe(VisibilityRanges.Darkness);
    });

    it('should use light source radius in darkness', () => {
      const torch = createActiveLightSource('Torch');
      if (!torch) throw new Error('Failed to create light source');

      expect(calculateVisibility('Darkness', [torch])).toBe(torch.source.radius);
    });

    it('should extend visibility in dim light', () => {
      const lantern = createActiveLightSource('Lantern, Hooded');
      if (!lantern) throw new Error('Failed to create light source');

      // In dim light, visibility should be the greater of base visibility or light source radius
      expect(calculateVisibility('Dim', [lantern])).toBe(
        Math.max(VisibilityRanges.Dim, lantern.source.radius)
      );
    });

    it('should use the largest radius from multiple light sources', () => {
      const torch = createActiveLightSource('Torch');
      const lantern = createActiveLightSource("Lantern, Bull's-eye");
      if (!torch || !lantern) throw new Error('Failed to create light sources');

      // Bull's-eye lantern has a larger radius than torch
      expect(calculateVisibility('Darkness', [torch, lantern])).toBe(lantern.source.radius);
    });

    it('should ignore inactive light sources', () => {
      const torch = createActiveLightSource('Torch');
      if (!torch) throw new Error('Failed to create light source');

      // Set torch to inactive
      torch.isActive = false;

      expect(calculateVisibility('Darkness', [torch])).toBe(VisibilityRanges.Darkness);
    });
  });

  describe('isTargetVisible', () => {
    it('should return true if target is within visibility range', () => {
      expect(isTargetVisible(5, 'Bright', [])).toBe(true);
      expect(isTargetVisible(5, 'Dim', [])).toBe(true);
      expect(isTargetVisible(5, 'Darkness', [])).toBe(false);
    });

    it('should return false if target is beyond visibility range', () => {
      expect(isTargetVisible(50, 'Bright', [])).toBe(false);
      expect(isTargetVisible(15, 'Dim', [])).toBe(false);
    });

    it('should account for light sources', () => {
      const torch = createActiveLightSource('Torch');
      if (!torch) throw new Error('Failed to create light source');

      expect(isTargetVisible(5, 'Darkness', [torch])).toBe(true);
      expect(isTargetVisible(15, 'Darkness', [torch])).toBe(false);
    });

    it('should account for targets with their own light sources', () => {
      // In darkness, a target with a light source can be seen from farther away
      expect(isTargetVisible(15, 'Darkness', [], true)).toBe(true);
      expect(isTargetVisible(25, 'Darkness', [], true)).toBe(false); // Beyond 2x torch radius
    });
  });
});
