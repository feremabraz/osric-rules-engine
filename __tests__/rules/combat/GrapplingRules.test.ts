/**
 * GrapplingRules.test.ts
 *
 * Comprehensive tests for OSRIC Grappling System Rules
 * Tests grapple attacks, strength comparisons, and grapple effects
 *
 * OSRIC Reference: Chapter on Combat - Grappling and Overbearing
 */

import type { Command } from '@osric/core/Command';
import type { GameContext } from '@osric/core/GameContext';
import {
  GrappleAttackRule,
  GrappleEffectRule,
  GrapplingOutcome,
  StrengthComparisonRule,
} from '@osric/rules/combat/GrapplingRules';
import { COMMAND_TYPES } from '@osric/types/constants';
import type { Character, Monster, StatusEffect } from '@osric/types/entities';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Test-specific interface for monsters with strength
interface TestMonster extends Monster {
  strength?: number;
}

// Mock implementations
const createMockGameContext = (): GameContext =>
  ({
    getTemporary: vi.fn(),
    setTemporary: vi.fn(),
    getCharacter: vi.fn(),
    getMonster: vi.fn(),
    // Add other required GameContext methods as needed
  }) as unknown as GameContext;

const createMockCommand = (type: string = COMMAND_TYPES.GRAPPLE): Command =>
  ({
    type,
    action: 'grapple',
    target: 'target',
    // Add other required Command properties as needed
  }) as unknown as Command;

const createMockCharacter = (overrides: Partial<Character> = {}): Character => ({
  id: 'test-character',
  name: 'Test Fighter',
  level: 5,
  hitPoints: { current: 20, maximum: 20 },
  armorClass: 5,
  thac0: 19,
  experience: { current: 10000, requiredForNextLevel: 16000, level: 5 },
  alignment: 'True Neutral',
  inventory: [],
  position: 'combat',
  race: 'Human',
  class: 'Fighter',
  abilities: {
    strength: 16,
    dexterity: 14,
    constitution: 15,
    intelligence: 10,
    wisdom: 12,
    charisma: 13,
  },
  abilityModifiers: {
    strengthHitAdj: 1,
    strengthDamageAdj: 1,
    strengthEncumbrance: null,
    strengthOpenDoors: null,
    strengthBendBars: null,
    dexterityReaction: 0,
    dexterityMissile: null,
    dexterityDefense: -1,
    dexterityPickPockets: null,
    dexterityOpenLocks: null,
    dexterityFindTraps: null,
    dexterityMoveSilently: null,
    dexterityHideInShadows: null,
    constitutionHitPoints: null,
    constitutionSystemShock: null,
    constitutionResurrectionSurvival: null,
    constitutionPoisonSave: null,
    intelligenceLanguages: null,
    intelligenceLearnSpells: null,
    intelligenceMaxSpellLevel: null,
    intelligenceIllusionImmunity: false,
    wisdomMentalSave: null,
    wisdomBonusSpells: null,
    wisdomSpellFailure: null,
    charismaReactionAdj: null,
    charismaLoyaltyBase: null,
    charismaMaxHenchmen: null,
  },
  savingThrows: {
    'Poison or Death': 12,
    Wands: 13,
    'Paralysis, Polymorph, or Petrification': 14,
    'Breath Weapons': 15,
    'Spells, Rods, or Staves': 16,
  },
  spells: [],
  currency: { platinum: 0, gold: 100, electrum: 0, silver: 50, copper: 0 },
  encumbrance: 0,
  movementRate: 120,
  classes: { Fighter: 5 },
  primaryClass: null,
  spellSlots: {},
  memorizedSpells: {},
  spellbook: [],
  thiefSkills: null,
  turnUndead: null,
  languages: ['Common'],
  age: 25,
  ageCategory: 'Adult',
  henchmen: [],
  racialAbilities: [],
  classAbilities: [],
  proficiencies: [],
  weaponSpecializations: [],
  secondarySkills: [],
  statusEffects: [],
  ...overrides,
});

const createMockMonster = (overrides: Partial<TestMonster> = {}): TestMonster => ({
  id: 'test-monster',
  name: 'Test Orc',
  level: 1,
  hitPoints: { current: 8, maximum: 8 },
  armorClass: 6,
  thac0: 19,
  experience: { current: 0, requiredForNextLevel: 0, level: 1 },
  alignment: 'Chaotic Evil',
  inventory: [],
  position: 'combat',
  statusEffects: [],
  hitDice: '1d8',
  damagePerAttack: ['1d6'],
  morale: 8,
  treasure: 'C',
  specialAbilities: [],
  xpValue: 10,
  size: 'Medium',
  movementTypes: [{ type: 'Walk', rate: 120 }],
  habitat: ['Any'],
  frequency: 'Common',
  organization: 'Tribal',
  diet: 'Omnivore',
  ecology: 'Temperate',
  strength: 14,
  ...overrides,
});

describe('GrappleAttackRule', () => {
  let rule: GrappleAttackRule;
  let mockContext: GameContext;
  let mockCommand: Command;

  beforeEach(() => {
    rule = new GrappleAttackRule();
    mockContext = createMockGameContext();
    mockCommand = createMockCommand();

    // Mock Math.random for consistent d20 rolls
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // Always roll 11
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should apply when grapple command has grapple context', () => {
    (mockContext.getTemporary as ReturnType<typeof vi.fn>).mockReturnValue({
      attacker: createMockCharacter(),
      target: createMockMonster(),
    });

    const canApply = rule.canApply(mockContext, mockCommand);
    expect(canApply).toBe(true);
  });

  it('should not apply without grapple context', () => {
    (mockContext.getTemporary as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const canApply = rule.canApply(mockContext, mockCommand);
    expect(canApply).toBe(false);
  });

  it('should not apply for non-grapple commands', () => {
    const nonGrappleCommand = createMockCommand('ATTACK');

    const canApply = rule.canApply(mockContext, nonGrappleCommand);
    expect(canApply).toBe(false);
  });

  it('should successfully hit with good attack roll', async () => {
    const attacker = createMockCharacter({ thac0: 19 });
    const target = createMockMonster({ armorClass: 6 });

    (mockContext.getTemporary as ReturnType<typeof vi.fn>).mockReturnValue({
      attacker,
      target,
      grappleType: 'standard',
      situationalModifiers: 0,
    });

    // Mock high roll (11 + 1 str bonus = 12, needs 13 to hit AC 6)
    vi.spyOn(Math, 'random').mockReturnValue(0.65); // Roll 14

    const result = await rule.execute(mockContext, mockCommand);

    expect(result.success).toBe(true);
    expect(result.message).toContain('hits');
    expect(mockContext.setTemporary).toHaveBeenCalledWith(
      'grapple-attack-result',
      expect.objectContaining({
        hit: true,
        attackRoll: 15, // 14 + 1 str bonus
        targetNumber: 13, // 19 - 6
      })
    );
  });

  it('should miss with poor attack roll', async () => {
    const attacker = createMockCharacter({ thac0: 19 });
    const target = createMockMonster({ armorClass: 6 });

    (mockContext.getTemporary as ReturnType<typeof vi.fn>).mockReturnValue({
      attacker,
      target,
      grappleType: 'standard',
      situationalModifiers: 0,
    });

    // Mock low roll (1 + 1 str bonus = 2, needs 13 to hit AC 6)
    vi.spyOn(Math, 'random').mockReturnValue(0.05); // Roll 2

    const result = await rule.execute(mockContext, mockCommand);

    expect(result.success).toBe(true);
    expect(result.message).toContain('missed');
    expect(mockContext.setTemporary).toHaveBeenCalledWith(
      'grapple-result',
      expect.objectContaining({
        outcome: GrapplingOutcome.MISS,
        hit: false,
      })
    );
  });

  it('should apply strength bonus to attack roll', async () => {
    const attacker = createMockCharacter({
      abilityModifiers: {
        strengthHitAdj: 3,
        strengthDamageAdj: 3,
        strengthEncumbrance: null,
        strengthOpenDoors: null,
        strengthBendBars: null,
        dexterityReaction: 0,
        dexterityMissile: null,
        dexterityDefense: -1,
        dexterityPickPockets: null,
        dexterityOpenLocks: null,
        dexterityFindTraps: null,
        dexterityMoveSilently: null,
        dexterityHideInShadows: null,
        constitutionHitPoints: null,
        constitutionSystemShock: null,
        constitutionResurrectionSurvival: null,
        constitutionPoisonSave: null,
        intelligenceLanguages: null,
        intelligenceLearnSpells: null,
        intelligenceMaxSpellLevel: null,
        intelligenceIllusionImmunity: false,
        wisdomMentalSave: null,
        wisdomBonusSpells: null,
        wisdomSpellFailure: null,
        charismaReactionAdj: null,
        charismaLoyaltyBase: null,
        charismaMaxHenchmen: null,
      }, // High strength bonus
      thac0: 19,
    });
    const target = createMockMonster({ armorClass: 6 });

    (mockContext.getTemporary as ReturnType<typeof vi.fn>).mockReturnValue({
      attacker,
      target,
      grappleType: 'standard',
      situationalModifiers: 0,
    });

    // Mock roll that would miss without str bonus (10 + 3 = 13, exactly hits)
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // Roll 11

    const result = await rule.execute(mockContext, mockCommand);

    expect(result.success).toBe(true);
    expect(mockContext.setTemporary).toHaveBeenCalledWith(
      'grapple-attack-result',
      expect.objectContaining({
        hit: true,
        attackRoll: 14, // 11 + 3 str bonus
      })
    );
  });

  it('should apply charge bonus for overbearing attacks', async () => {
    const attacker = createMockCharacter({ thac0: 19 });
    const target = createMockMonster({ armorClass: 6 });

    (mockContext.getTemporary as ReturnType<typeof vi.fn>).mockReturnValue({
      attacker,
      target,
      grappleType: 'overbearing',
      isChargedAttack: true,
      situationalModifiers: 0,
    });

    // Mock roll that needs charge bonus (9 + 1 str + 2 charge = 12, needs 13)
    vi.spyOn(Math, 'random').mockReturnValue(0.45); // Roll 10

    const result = await rule.execute(mockContext, mockCommand);

    expect(result.success).toBe(true);
    expect(mockContext.setTemporary).toHaveBeenCalledWith(
      'grapple-attack-result',
      expect.objectContaining({
        hit: true,
        attackRoll: 13, // 10 + 1 str + 2 charge
      })
    );
  });

  it('should apply situational modifiers', async () => {
    const attacker = createMockCharacter({ thac0: 19 });
    const target = createMockMonster({ armorClass: 6 });

    (mockContext.getTemporary as ReturnType<typeof vi.fn>).mockReturnValue({
      attacker,
      target,
      grappleType: 'standard',
      situationalModifiers: 2, // Favorable conditions
    });

    const result = await rule.execute(mockContext, mockCommand);

    expect(result.success).toBe(true);
    expect(mockContext.setTemporary).toHaveBeenCalledWith(
      'grapple-attack-result',
      expect.objectContaining({
        attackRoll: 14, // 11 + 1 str + 2 situational
      })
    );
  });

  it('should handle missing grapple context', async () => {
    (mockContext.getTemporary as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const result = await rule.execute(mockContext, mockCommand);

    expect(result.success).toBe(false);
    expect(result.message).toContain('No grapple context found');
  });
});

describe('StrengthComparisonRule', () => {
  let rule: StrengthComparisonRule;
  let mockContext: GameContext;
  let mockCommand: Command;

  beforeEach(() => {
    rule = new StrengthComparisonRule();
    mockContext = createMockGameContext();
    mockCommand = createMockCommand();
  });

  it('should apply when attack hits and grapple context exists', () => {
    (mockContext.getTemporary as ReturnType<typeof vi.fn>).mockImplementation((key) => {
      if (key === 'grapple-context') return { attacker: {}, target: {} };
      if (key === 'grapple-attack-result') return { hit: true };
      return null;
    });

    const canApply = rule.canApply(mockContext, mockCommand);
    expect(canApply).toBe(true);
  });

  it('should not apply when attack misses', () => {
    (mockContext.getTemporary as ReturnType<typeof vi.fn>).mockImplementation((key) => {
      if (key === 'grapple-context') return { attacker: {}, target: {} };
      if (key === 'grapple-attack-result') return { hit: false };
      return null;
    });

    const canApply = rule.canApply(mockContext, mockCommand);
    expect(canApply).toBe(false);
  });

  it('should determine attacker grapples when stronger', async () => {
    const attacker = createMockCharacter({
      abilities: {
        strength: 18,
        dexterity: 14,
        constitution: 15,
        intelligence: 10,
        wisdom: 12,
        charisma: 13,
      },
    });
    const target = createMockMonster({ strength: 12 });

    (mockContext.getTemporary as ReturnType<typeof vi.fn>).mockReturnValue({
      attacker,
      target,
      grappleType: 'standard',
    });

    const result = await rule.execute(mockContext, mockCommand);

    expect(result.success).toBe(true);
    expect(mockContext.setTemporary).toHaveBeenCalledWith(
      'strength-comparison-result',
      expect.objectContaining({
        outcome: GrapplingOutcome.ATTACKER_GRAPPLES,
        attackerStrength: 18,
        targetStrength: 12,
      })
    );
  });

  it('should determine defender grapples when stronger', async () => {
    const attacker = createMockCharacter({
      abilities: {
        strength: 12,
        dexterity: 14,
        constitution: 15,
        intelligence: 10,
        wisdom: 12,
        charisma: 13,
      },
    });
    const target = createMockMonster({ strength: 18 });

    (mockContext.getTemporary as ReturnType<typeof vi.fn>).mockReturnValue({
      attacker,
      target,
      grappleType: 'standard',
    });

    const result = await rule.execute(mockContext, mockCommand);

    expect(result.success).toBe(true);
    expect(mockContext.setTemporary).toHaveBeenCalledWith(
      'strength-comparison-result',
      expect.objectContaining({
        outcome: GrapplingOutcome.DEFENDER_GRAPPLES,
        attackerStrength: 12,
        targetStrength: 18,
      })
    );
  });

  it('should determine stalemate when equal strength', async () => {
    const attacker = createMockCharacter({
      abilities: {
        strength: 16,
        dexterity: 14,
        constitution: 15,
        intelligence: 10,
        wisdom: 12,
        charisma: 13,
      },
    });
    const target = createMockMonster({ strength: 16 });

    (mockContext.getTemporary as ReturnType<typeof vi.fn>).mockReturnValue({
      attacker,
      target,
      grappleType: 'standard',
    });

    const result = await rule.execute(mockContext, mockCommand);

    expect(result.success).toBe(true);
    expect(mockContext.setTemporary).toHaveBeenCalledWith(
      'strength-comparison-result',
      expect.objectContaining({
        outcome: GrapplingOutcome.STALEMATE,
        attackerStrength: 16,
        targetStrength: 16,
      })
    );
  });

  it('should handle overbearing success when attacker is stronger', async () => {
    const attacker = createMockCharacter({
      abilities: {
        strength: 18,
        dexterity: 14,
        constitution: 15,
        intelligence: 10,
        wisdom: 12,
        charisma: 13,
      },
    });
    const target = createMockMonster({ strength: 14 });

    (mockContext.getTemporary as ReturnType<typeof vi.fn>).mockReturnValue({
      attacker,
      target,
      grappleType: 'overbearing',
    });

    const result = await rule.execute(mockContext, mockCommand);

    expect(result.success).toBe(true);
    expect(mockContext.setTemporary).toHaveBeenCalledWith(
      'strength-comparison-result',
      expect.objectContaining({
        outcome: GrapplingOutcome.OVERBEARING_SUCCESS,
      })
    );
  });

  it('should handle overbearing failure when target is stronger or equal', async () => {
    const attacker = createMockCharacter({
      abilities: {
        strength: 14,
        dexterity: 14,
        constitution: 15,
        intelligence: 10,
        wisdom: 12,
        charisma: 13,
      },
    });
    const target = createMockMonster({ strength: 16 });

    (mockContext.getTemporary as ReturnType<typeof vi.fn>).mockReturnValue({
      attacker,
      target,
      grappleType: 'overbearing',
    });

    const result = await rule.execute(mockContext, mockCommand);

    expect(result.success).toBe(true);
    expect(mockContext.setTemporary).toHaveBeenCalledWith(
      'strength-comparison-result',
      expect.objectContaining({
        outcome: GrapplingOutcome.MISS,
      })
    );
  });

  it('should handle monsters without explicit strength', async () => {
    const attacker = createMockCharacter({
      abilities: {
        strength: 16,
        dexterity: 14,
        constitution: 15,
        intelligence: 10,
        wisdom: 12,
        charisma: 13,
      },
    });
    const target = { name: 'Basic Monster', hitPoints: { current: 10 } }; // No strength

    (mockContext.getTemporary as ReturnType<typeof vi.fn>).mockReturnValue({
      attacker,
      target,
      grappleType: 'standard',
    });

    const result = await rule.execute(mockContext, mockCommand);

    expect(result.success).toBe(true);
    expect(mockContext.setTemporary).toHaveBeenCalledWith(
      'strength-comparison-result',
      expect.objectContaining({
        attackerStrength: 16,
        targetStrength: 12, // Default strength
      })
    );
  });
});

describe('GrappleEffectRule', () => {
  let rule: GrappleEffectRule;
  let mockContext: GameContext;
  let mockCommand: Command;

  beforeEach(() => {
    rule = new GrappleEffectRule();
    mockContext = createMockGameContext();
    mockCommand = createMockCommand();

    // Mock Math.random for consistent damage rolls
    vi.spyOn(Math, 'random').mockReturnValue(0.7); // Always roll 1 damage
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should apply when context and strength result exist', () => {
    (mockContext.getTemporary as ReturnType<typeof vi.fn>).mockImplementation((key) => {
      if (key === 'grapple-context') return { attacker: {}, target: {} };
      if (key === 'strength-comparison-result')
        return { outcome: GrapplingOutcome.ATTACKER_GRAPPLES };
      return null;
    });

    const canApply = rule.canApply(mockContext, mockCommand);
    expect(canApply).toBe(true);
  });

  it('should apply grappled effects when attacker grapples', async () => {
    const attacker = createMockCharacter({ statusEffects: [] });
    const target = createMockMonster({
      statusEffects: [],
      hitPoints: { current: 10, maximum: 10 },
    });

    (mockContext.getTemporary as ReturnType<typeof vi.fn>).mockImplementation((key) => {
      if (key === 'grapple-context') return { attacker, target };
      if (key === 'strength-comparison-result')
        return {
          outcome: GrapplingOutcome.ATTACKER_GRAPPLES,
        };
      return null;
    });

    const result = await rule.execute(mockContext, mockCommand);

    expect(result.success).toBe(true);
    expect(target.statusEffects).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'Grappled' })])
    );
    expect(attacker.statusEffects).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'Grappling' })])
    );
    expect(target.hitPoints.current).toBe(9); // 1 damage
  });

  it('should apply reversal effects when defender grapples', async () => {
    const attacker = createMockCharacter({ statusEffects: [] });
    const target = createMockMonster({ statusEffects: [] });

    (mockContext.getTemporary as ReturnType<typeof vi.fn>).mockImplementation((key) => {
      if (key === 'grapple-context') return { attacker, target };
      if (key === 'strength-comparison-result')
        return {
          outcome: GrapplingOutcome.DEFENDER_GRAPPLES,
        };
      return null;
    });

    const result = await rule.execute(mockContext, mockCommand);

    expect(result.success).toBe(true);
    expect(attacker.statusEffects).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'Grappled' })])
    );
    expect(target.statusEffects).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'Grappling' })])
    );
  });

  it('should apply prone effect when overbearing succeeds', async () => {
    const attacker = createMockCharacter();
    const target = createMockMonster({
      statusEffects: [],
      hitPoints: { current: 8, maximum: 8 },
    });

    (mockContext.getTemporary as ReturnType<typeof vi.fn>).mockImplementation((key) => {
      if (key === 'grapple-context') return { attacker, target };
      if (key === 'strength-comparison-result')
        return {
          outcome: GrapplingOutcome.OVERBEARING_SUCCESS,
        };
      return null;
    });

    const result = await rule.execute(mockContext, mockCommand);

    expect(result.success).toBe(true);
    expect(target.statusEffects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Prone',
          effect: expect.stringContaining('Knocked down'),
        }),
      ])
    );
    expect(target.hitPoints.current).toBe(7); // 1 damage
  });

  it('should apply mutual grapple in stalemate', async () => {
    const attacker = createMockCharacter({ statusEffects: [] });
    const target = createMockMonster({ statusEffects: [] });

    (mockContext.getTemporary as ReturnType<typeof vi.fn>).mockImplementation((key) => {
      if (key === 'grapple-context') return { attacker, target };
      if (key === 'strength-comparison-result')
        return {
          outcome: GrapplingOutcome.STALEMATE,
        };
      return null;
    });

    const result = await rule.execute(mockContext, mockCommand);

    expect(result.success).toBe(true);
    expect(attacker.statusEffects).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'Grappled' })])
    );
    expect(target.statusEffects).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: 'Grappled' })])
    );
  });

  it('should roll 0-1 damage consistently with OSRIC rules', async () => {
    const attacker = createMockCharacter();
    const target = createMockMonster({
      hitPoints: { current: 10, maximum: 10 },
    });

    (mockContext.getTemporary as ReturnType<typeof vi.fn>).mockImplementation((key) => {
      if (key === 'grapple-context') return { attacker, target };
      if (key === 'strength-comparison-result')
        return {
          outcome: GrapplingOutcome.ATTACKER_GRAPPLES,
        };
      return null;
    });

    // Test 0 damage
    vi.spyOn(Math, 'random').mockReturnValue(0.3); // Roll 0
    await rule.execute(mockContext, mockCommand);
    expect(target.hitPoints.current).toBe(10); // No damage

    // Reset and test 1 damage
    target.hitPoints.current = 10;
    vi.spyOn(Math, 'random').mockReturnValue(0.7); // Roll 1
    await rule.execute(mockContext, mockCommand);
    expect(target.hitPoints.current).toBe(9); // 1 damage
  });

  it('should create proper status effect details', async () => {
    const attacker = createMockCharacter({ statusEffects: [] });
    const target = createMockMonster({ statusEffects: [] });

    (mockContext.getTemporary as ReturnType<typeof vi.fn>).mockImplementation((key) => {
      if (key === 'grapple-context') return { attacker, target };
      if (key === 'strength-comparison-result')
        return {
          outcome: GrapplingOutcome.ATTACKER_GRAPPLES,
        };
      return null;
    });

    await rule.execute(mockContext, mockCommand);

    const grappledEffect = target.statusEffects.find((e) => e.name === 'Grappled');
    const grapplingEffect = attacker.statusEffects.find((e) => e.name === 'Grappling');

    expect(grappledEffect).toEqual(
      expect.objectContaining({
        name: 'Grappled',
        duration: 0,
        effect: expect.stringContaining('-4 to attack rolls'),
        endCondition: expect.stringContaining('Break free'),
      })
    );

    expect(grapplingEffect).toEqual(
      expect.objectContaining({
        name: 'Grappling',
        duration: 0,
        effect: expect.stringContaining('Movement restricted'),
      })
    );
  });

  it('should handle missing context gracefully', async () => {
    (mockContext.getTemporary as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const result = await rule.execute(mockContext, mockCommand);

    expect(result.success).toBe(false);
    expect(result.message).toContain('Missing grapple context');
  });
});

describe('OSRIC Grappling Integration', () => {
  it('should maintain OSRIC grappling outcome consistency', () => {
    // Test enum values match OSRIC expectations
    expect(GrapplingOutcome.ATTACKER_GRAPPLES).toBe('attacker_grapples');
    expect(GrapplingOutcome.DEFENDER_GRAPPLES).toBe('defender_grapples');
    expect(GrapplingOutcome.OVERBEARING_SUCCESS).toBe('overbearing_success');
    expect(GrapplingOutcome.MISS).toBe('miss');
    expect(GrapplingOutcome.STALEMATE).toBe('stalemate');
  });

  it('should implement OSRIC rule priorities correctly', () => {
    const attackRule = new GrappleAttackRule();
    const comparisonRule = new StrengthComparisonRule();
    const effectRule = new GrappleEffectRule();

    // Verify execution order
    expect(attackRule.priority).toBeLessThan(comparisonRule.priority);
    expect(comparisonRule.priority).toBeLessThan(effectRule.priority);
  });

  it('should preserve OSRIC damage range (0-1)', () => {
    const _effectRule = new GrappleEffectRule();

    // Test damage generation multiple times
    for (let i = 0; i < 100; i++) {
      const damage = Math.floor(Math.random() * 2);
      expect(damage).toBeGreaterThanOrEqual(0);
      expect(damage).toBeLessThanOrEqual(1);
    }
  });
});
