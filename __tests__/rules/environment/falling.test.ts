import { calculateFallingDamage } from '@rules/environment/falling';
import * as diceLib from '@rules/utils/dice';
import { mockAdventurer } from '@tests/utils/mockData';
import { beforeEach, describe, expect, it, vi } from 'vitest';
describe('Falling Damage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset character's hit points before each test
    mockAdventurer.hitPoints.current = mockAdventurer.hitPoints.maximum;

    // Mock the dice rolling to ensure deterministic tests
    vi.spyOn(diceLib, 'rollFromNotation').mockImplementation((notation) => {
      if (notation === '1d6') return { rolls: [6], total: 6 };
      if (notation === '2d6') return { rolls: [3, 4], total: 7 };
      if (notation === '3d6') return { rolls: [3, 3, 3], total: 9 };
      if (notation === '1d20') return { rolls: [5], total: 5 }; // Make sure this is low enough to cause injury
      return { rolls: [5], total: 5 }; // Default
    });
  });

  it('should not apply damage for falls less than 3 meters', () => {
    const result = calculateFallingDamage({
      character: mockAdventurer,
      distance: 2,
    });

    expect(result.success).toBe(true);
    expect(result.damage).toBeNull();
    expect(mockAdventurer.hitPoints.current).toBe(mockAdventurer.hitPoints.maximum);
    expect(result.message).toContain('takes no damage');
  });

  it('should calculate correct damage for a 3-meter fall (1d6)', () => {
    const result = calculateFallingDamage({
      character: mockAdventurer,
      distance: 3,
    });

    expect(result.success).toBe(true);
    expect(result.damage).toEqual([6]); // From our mocked dice roll
    expect(mockAdventurer.hitPoints.current).toBe(mockAdventurer.hitPoints.maximum - 6);
    expect(result.diceRolled).toBe(1);
  });

  it('should calculate correct damage for a 7.5-meter fall (2d6)', () => {
    const result = calculateFallingDamage({
      character: mockAdventurer,
      distance: 7.5,
    });

    expect(result.success).toBe(true);
    expect(result.damage).toEqual([7]); // 3 + 4 from mocked dice
    expect(mockAdventurer.hitPoints.current).toBe(mockAdventurer.hitPoints.maximum - 7);
    expect(result.diceRolled).toBe(2);
  });

  it('should apply a damage modifier when provided', () => {
    const result = calculateFallingDamage({
      character: mockAdventurer,
      distance: 3,
      modifiers: {
        damageFactor: 0.5, // Half damage from magic, feather fall, etc.
      },
    });

    expect(result.success).toBe(true);
    expect(result.damage).toEqual([3]); // 6 * 0.5 = 3
    expect(mockAdventurer.hitPoints.current).toBe(mockAdventurer.hitPoints.maximum - 3);
  });

  it('should add "unconscious" effect when character reaches 0 HP', () => {
    // Set character HP to minimal amount so fall will render unconscious
    mockAdventurer.hitPoints.current = 6;

    const result = calculateFallingDamage({
      character: mockAdventurer,
      distance: 3, // Will do 6 damage
    });

    expect(result.success).toBe(true);
    expect(mockAdventurer.hitPoints.current).toBe(0);
    expect(result.effects).toContain('Unconscious');
    expect(result.message).toContain('unconscious');
  });

  it('should add "dead" effect when character HP goes below -10', () => {
    // Set character HP so the fall will be fatal
    mockAdventurer.hitPoints.current = 2;

    const result = calculateFallingDamage({
      character: mockAdventurer,
      distance: 9, // Will do 9 damage (3 + 3 + 3 from our mock)
    });

    expect(result.success).toBe(true);
    expect(mockAdventurer.hitPoints.current).toBe(-7); // 2 - 9 = -7
    // test if HP is below -10
    expect(mockAdventurer.hitPoints.current <= -10).toBe(false);
    // Add Dead effect when HP <= -10
    expect(result.effects).not.toContain('Dead');

    // Set character HP even lower to trigger death
    mockAdventurer.hitPoints.current = -5;

    const result2 = calculateFallingDamage({
      character: mockAdventurer,
      distance: 6, // Will do 6 damage (3 + 3) with our mocked rolls
    });

    expect(mockAdventurer.hitPoints.current).toBeLessThanOrEqual(-10);
    expect(result2.effects).toContain('Dead');
    expect(result2.message).toContain('dies');
  });

  it('should check for bone breaking on falls of 9+ meters', () => {
    // Test with a character who's not unconscious
    mockAdventurer.hitPoints.current = mockAdventurer.hitPoints.maximum;

    const result = calculateFallingDamage({
      character: mockAdventurer,
      distance: 9,
    });

    // Our mocked d20 roll is 5, which should be below the injury threshold of 10
    expect(result.effects).toBeTruthy();
    expect(result.effects).toContain('Broken Bone');
    expect(result.message).toContain('broken bone');
  });
});
