import {
  CombatMovementRateByEncumbrance,
  EncumbranceLevel,
  MovementRateByEncumbrance,
  RacialMovementModifiers,
  calculateCombatMovementRate,
  calculateEncumbranceLevel,
  calculateMovementRate,
  calculateTotalWeight,
  getStrengthEncumbranceBonus,
  updateEncumbranceAndMovement,
} from '@rules/travel/movement';
import type { AbilityScoreModifiers, Character, CharacterRace, Item } from '@rules/types';
import { createMockCharacter, createMockItem } from '@tests/utils/mockData';
import { describe, expect, it } from 'vitest';

describe('Travel Movement', () => {
  // Use centralized mock functions instead of local ones

  describe('calculateTotalWeight', () => {
    it('should return 0 for empty inventory', () => {
      expect(calculateTotalWeight([])).toBe(0);
    });

    it('should sum the weights of all items', () => {
      const inventory = [createMockItem(5), createMockItem(3), createMockItem(10)];
      expect(calculateTotalWeight(inventory)).toBe(18);
    });
  });

  describe('calculateEncumbranceLevel', () => {
    it('should return Unencumbered for weight < Light', () => {
      expect(calculateEncumbranceLevel(0)).toBe(EncumbranceLevel.Unencumbered);
      expect(calculateEncumbranceLevel(15)).toBe(EncumbranceLevel.Unencumbered);
    });

    it('should return Light for weight >= Light but < Moderate', () => {
      expect(calculateEncumbranceLevel(16)).toBe(EncumbranceLevel.Light);
      expect(calculateEncumbranceLevel(31)).toBe(EncumbranceLevel.Light);
    });

    it('should return Moderate for weight >= Moderate but < Heavy', () => {
      expect(calculateEncumbranceLevel(32)).toBe(EncumbranceLevel.Moderate);
      expect(calculateEncumbranceLevel(47)).toBe(EncumbranceLevel.Moderate);
    });

    it('should return Heavy for weight >= Heavy but < Severe', () => {
      expect(calculateEncumbranceLevel(48)).toBe(EncumbranceLevel.Heavy);
      expect(calculateEncumbranceLevel(67)).toBe(EncumbranceLevel.Heavy);
    });

    it('should return Severe for weight >= Severe but < Max', () => {
      expect(calculateEncumbranceLevel(68)).toBe(EncumbranceLevel.Severe);
      expect(calculateEncumbranceLevel(103)).toBe(EncumbranceLevel.Severe);
    });

    it('should return Max for weight >= Max', () => {
      expect(calculateEncumbranceLevel(104)).toBe(EncumbranceLevel.Max);
      expect(calculateEncumbranceLevel(150)).toBe(EncumbranceLevel.Max);
    });
  });

  describe('getStrengthEncumbranceBonus', () => {
    it('should return 0 for normal strength (9-12)', () => {
      expect(getStrengthEncumbranceBonus(9)).toBe(0);
      expect(getStrengthEncumbranceBonus(10)).toBe(0);
      expect(getStrengthEncumbranceBonus(12)).toBe(0);
    });

    it('should return a bonus for high strength', () => {
      expect(getStrengthEncumbranceBonus(13)).toBe(4.5);
      expect(getStrengthEncumbranceBonus(16)).toBe(9.1);
      expect(getStrengthEncumbranceBonus(18)).toBe(22.7);
    });

    it('should return a penalty for low strength', () => {
      expect(getStrengthEncumbranceBonus(8)).toBe(-2.3);
      expect(getStrengthEncumbranceBonus(6)).toBe(-4.5);
      expect(getStrengthEncumbranceBonus(5)).toBe(-4.5);
    });
  });

  describe('calculateMovementRate', () => {
    it('should return base movement rate for unencumbered character', () => {
      const character = createMockCharacter();
      expect(calculateMovementRate(character)).toBe(36);
    });

    it('should apply racial modifiers', () => {
      const dwarf = createMockCharacter({ race: 'Dwarf' });
      const halfling = createMockCharacter({ race: 'Halfling' });

      const dwarfRate = calculateMovementRate(dwarf);
      const halflingRate = calculateMovementRate(halfling);

      expect(dwarfRate).toBe(36 + RacialMovementModifiers.Dwarf);
      expect(halflingRate).toBe(36 + RacialMovementModifiers.Halfling);
    });

    it('should reduce movement rate based on encumbrance', () => {
      const character = createMockCharacter({
        inventory: [createMockItem(32)], // Moderate encumbrance
      });

      expect(calculateMovementRate(character)).toBe(
        MovementRateByEncumbrance[EncumbranceLevel.Moderate]
      );
    });

    it('should account for strength bonus reducing effective encumbrance', () => {
      // Character with 18 strength gets +22.7kg bonus
      const strongCharacter = createMockCharacter({
        strength: 18,
        inventory: [createMockItem(30)], // Would be Light encumbrance, but with bonus becomes Unencumbered
      });

      expect(calculateMovementRate(strongCharacter)).toBe(
        MovementRateByEncumbrance[EncumbranceLevel.Unencumbered]
      );
    });
  });

  describe('calculateCombatMovementRate', () => {
    it('should return combat movement based on encumbrance', () => {
      const character = createMockCharacter();
      expect(calculateCombatMovementRate(character)).toBe(
        CombatMovementRateByEncumbrance[EncumbranceLevel.Unencumbered]
      );

      const encumberedCharacter = createMockCharacter({
        inventory: [createMockItem(48)], // Heavy encumbrance
      });

      expect(calculateCombatMovementRate(encumberedCharacter)).toBe(
        CombatMovementRateByEncumbrance[EncumbranceLevel.Heavy]
      );
    });
  });

  describe('updateEncumbranceAndMovement', () => {
    it('should update character encumbrance and movement rate', () => {
      const character = createMockCharacter({
        inventory: [createMockItem(20)], // Light encumbrance
      });

      const updated = updateEncumbranceAndMovement(character);

      expect(updated.encumbrance).toBe(20);
      expect(updated.movementRate).toBe(
        MovementRateByEncumbrance[EncumbranceLevel.Light] + RacialMovementModifiers.Human
      );
    });
  });
});
