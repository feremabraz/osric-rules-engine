import { resolveCombat } from '@rules/combat';
import { attackRoll } from '@rules/combat/attackRoll';
import { applyDamage } from '@rules/combat/damage';
import { getNonProficiencyPenalty } from '@rules/combat/proficiency';
import { applyWeaponVsArmorAdjustment } from '@rules/combat/weaponVsArmor';
import type { Action, CombatResult } from '@rules/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockFighter, mockGoblin, mockOrc, mockThief, mockWeapons } from './mockData';

// Mock individual combat functions
vi.mock('../../../rules/combat/attackRoll', () => ({
  attackRoll: vi.fn(),
}));

vi.mock('../../../rules/combat/damage', () => ({
  applyDamage: vi.fn(),
}));

vi.mock('../../../rules/combat/weaponVsArmor', () => ({
  applyWeaponVsArmorAdjustment: vi.fn(),
}));

vi.mock('../../../rules/combat/proficiency', () => ({
  getNonProficiencyPenalty: vi.fn(),
}));

describe('Combat Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('resolveCombat', () => {
    it('should return error for invalid targets', () => {
      const invalidAction: Action = {
        type: 'Attack',
        actor: mockFighter,
        target: 'goblin', // String target is invalid
      };

      const result = resolveCombat(invalidAction);

      expect(result.success).toBe(false);
      expect(result.message).toContain('No valid target');
      expect(result.damage).toBeNull();
      expect(result.effects).toBeNull();
    });

    it('should handle successful attacks', () => {
      // Setup mocks for a successful attack
      vi.mocked(applyWeaponVsArmorAdjustment).mockReturnValue(1); // +1 for weapon vs armor
      vi.mocked(getNonProficiencyPenalty).mockReturnValue(-2); // Not used for proficient fighter

      // Mock a successful attack
      const mockCombatResult: CombatResult = {
        hit: true,
        damage: [8],
        critical: false,
        message: 'Sir Roland hit Goblin for 8 damage.',
        specialEffects: null,
      };
      vi.mocked(attackRoll).mockReturnValue(mockCombatResult);

      // Mock damage application
      const mockDamageResult: CombatResult = {
        hit: true,
        damage: [8],
        critical: false,
        message: 'Sir Roland hit Goblin for 8 damage. Goblin is unconscious!',
        specialEffects: [
          {
            name: 'Unconscious',
            duration: 6,
            effect: 'Character is unconscious and bleeding',
            savingThrow: null,
            endCondition: 'When hit points rise above 0',
          },
        ],
      };
      vi.mocked(applyDamage).mockReturnValue(mockDamageResult);

      // Create the action
      const action: Action = {
        type: 'Attack',
        actor: mockFighter,
        target: mockGoblin,
        item: mockWeapons.longsword,
      };

      // Execute the action
      const result = resolveCombat(action);

      // Verify results
      expect(attackRoll).toHaveBeenCalledWith(
        mockFighter,
        mockGoblin,
        mockWeapons.longsword,
        1 // Attack modifier (+1 for weapon vs armor)
      );

      expect(applyDamage).toHaveBeenCalledWith(mockFighter, mockGoblin, [8], false);

      expect(result.success).toBe(true);
      expect(result.message).toContain('unconscious');
      expect(result.damage).toEqual([8]);
      expect(result.effects).toEqual(['Unconscious']);
    });

    it('should handle missed attacks', () => {
      // Setup mocks for a missed attack
      vi.mocked(applyWeaponVsArmorAdjustment).mockReturnValue(-1);

      // Mock a missed attack
      const mockCombatResult: CombatResult = {
        hit: false,
        damage: [],
        critical: false,
        message: "Sir Roland's attack missed Orc.",
        specialEffects: null,
      };
      vi.mocked(attackRoll).mockReturnValue(mockCombatResult);

      // Create the action
      const action: Action = {
        type: 'Attack',
        actor: mockFighter,
        target: mockOrc,
        item: mockWeapons.longsword,
      };

      // Execute the action
      const result = resolveCombat(action);

      // Verify applyDamage was NOT called
      expect(applyDamage).not.toHaveBeenCalled();

      // Verify results
      expect(result.success).toBe(false);
      expect(result.message).toContain('missed');
      expect(result.damage).toBeNull();
      expect(result.effects).toBeNull();
    });

    it('should apply non-proficiency penalty if weapon not proficient', () => {
      // Mock a fighter attacking with a weapon they're not proficient with
      vi.mocked(applyWeaponVsArmorAdjustment).mockReturnValue(0);
      vi.mocked(getNonProficiencyPenalty).mockReturnValue(-2);

      // Make the fighter non-proficient with shortbow by modifying proficiencies
      const nonProficientFighter = {
        ...mockFighter,
        proficiencies: [
          { weapon: 'Longsword', penalty: 0 },
          { weapon: 'Dagger', penalty: 0 },
          // No shortbow proficiency
        ],
      };

      // Mock a successful attack despite the penalty
      const mockCombatResult: CombatResult = {
        hit: true,
        damage: [5],
        critical: false,
        message: 'Sir Roland hit Goblin for 5 damage.',
        specialEffects: null,
      };
      vi.mocked(attackRoll).mockReturnValue(mockCombatResult);

      // Mock damage application
      const mockDamageResult: CombatResult = {
        hit: true,
        damage: [5],
        critical: false,
        message: 'Sir Roland hit Goblin for 5 damage.',
        specialEffects: null,
      };
      vi.mocked(applyDamage).mockReturnValue(mockDamageResult);

      // Create the action with a shortbow
      const action: Action = {
        type: 'Attack',
        actor: nonProficientFighter,
        target: mockGoblin,
        item: mockWeapons.shortbow,
      };

      // Execute the action
      resolveCombat(action);

      // Verify attackRoll was called with -2 penalty
      expect(attackRoll).toHaveBeenCalledWith(
        nonProficientFighter,
        mockGoblin,
        mockWeapons.shortbow,
        -2 // Attack modifier including -2 non-proficiency
      );
    });
  });
});
