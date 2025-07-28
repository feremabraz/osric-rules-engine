import {
  applyWeaponVsArmorAdjustment,
  getWeaponVsArmorAdjustment,
} from '@rules/combat/weaponVsArmor';
import { describe, expect, it } from 'vitest';
import { mockFighter, mockGoblin, mockTroll, mockWeapons } from './mockData';

describe('Weapon vs Armor Mechanics', () => {
  describe('getWeaponVsArmorAdjustment', () => {
    it('should return the correct adjustment for slashing weapons vs different armor types', () => {
      // Longsword (Slashing) against various armor classes
      const unarmored = getWeaponVsArmorAdjustment(mockWeapons.longsword, 10); // Unarmored (AC 10)
      const leather = getWeaponVsArmorAdjustment(mockWeapons.longsword, 8); // Leather (AC 8)
      const chain = getWeaponVsArmorAdjustment(mockWeapons.longsword, 5); // Chain (AC 5)
      const plate = getWeaponVsArmorAdjustment(mockWeapons.longsword, 2); // Plate (AC 2)

      expect(unarmored).toBe(0); // No adjustment vs unarmored
      expect(leather).toBe(-1); // -1 vs leather
      expect(chain).toBe(0); // No adjustment vs chain
      expect(plate).toBe(+2); // +2 vs plate
    });

    it('should return the correct adjustment for piercing weapons vs different armor types', () => {
      // Dagger (Piercing) against various armor classes
      const unarmored = getWeaponVsArmorAdjustment(mockWeapons.dagger, 10); // Unarmored (AC 10)
      const leather = getWeaponVsArmorAdjustment(mockWeapons.dagger, 8); // Leather (AC 8)
      const chain = getWeaponVsArmorAdjustment(mockWeapons.dagger, 5); // Chain (AC 5)
      const plate = getWeaponVsArmorAdjustment(mockWeapons.dagger, 2); // Plate (AC 2)

      expect(unarmored).toBe(0); // No adjustment vs unarmored
      expect(leather).toBe(+1); // +1 vs leather
      expect(chain).toBe(-1); // -1 vs chain
      expect(plate).toBe(-3); // -3 vs plate
    });

    it('should handle edge case AC values by clamping to valid range', () => {
      // AC values out of range
      const tooLow = getWeaponVsArmorAdjustment(mockWeapons.longsword, -5); // AC below 0
      const tooHigh = getWeaponVsArmorAdjustment(mockWeapons.longsword, 15); // AC above 10

      // Should clamp to valid range (0-10)
      expect(tooLow).toBe(+2); // AC -5 should be treated as AC 0 (Plate)
      expect(tooHigh).toBe(0); // AC 15 should be treated as AC 10 (Unarmored)
    });

    it('should default to slashing damage type if weapon not recognized', () => {
      // Create a weapon with an unrecognized name
      const unknownWeapon = { ...mockWeapons.longsword, name: 'Unknown Weapon' };

      // Should use slashing table (default)
      const adjustment = getWeaponVsArmorAdjustment(unknownWeapon, 2); // vs plate

      expect(adjustment).toBe(+2); // +2 (slashing vs plate)
    });
  });

  describe('applyWeaponVsArmorAdjustment', () => {
    it('should return correct adjustment based on defender armor class', () => {
      // Fighter with AC 4 (some form of Chain)
      const vsLongsword = applyWeaponVsArmorAdjustment(mockFighter, mockWeapons.longsword);
      const vsDagger = applyWeaponVsArmorAdjustment(mockFighter, mockWeapons.dagger);

      expect(vsLongsword).toBe(0); // Slashing vs AC 4 (Chain)
      expect(vsDagger).toBe(-1); // Piercing vs AC 4 (Chain)
    });

    it('should return 0 if no weapon is provided', () => {
      const adjustment = applyWeaponVsArmorAdjustment(mockFighter);

      expect(adjustment).toBe(0);
    });

    it('should work with different defender types', () => {
      // Goblin has AC 6 (Studded Leather/Ring)
      const vsGoblin = applyWeaponVsArmorAdjustment(mockGoblin, mockWeapons.longsword);

      // Troll has AC 4 (Chain)
      const vsTroll = applyWeaponVsArmorAdjustment(mockTroll, mockWeapons.longsword);

      expect(vsGoblin).toBe(0); // Slashing vs AC 6 (Studded Leather/Ring)
      expect(vsTroll).toBe(0); // Slashing vs AC 4 (Chain)
    });
  });
});
