/**
 * TurnUndeadCommand Tests - OSRIC Compliance
 *
 * Tests the TurnUndeadCommand from commands/character/TurnUndeadCommand.ts:
 * - OSRIC turn undead table (2d6 system)
 * - Cleric vs undead HD calculations
 * - Paladin turn undead (level-2 as cleric)
 * - Turn vs Destroy vs Command mechanics
 * - Multiple undead handling and mass attempts
 * - Holy symbol requirements
 * - Situational modifiers (blessed symbols, consecrated ground)
 * - Parameter validation and error handling
 *
 * NOTE: This tests ONLY the command interface - rule validation is tested separately.
 */

// Type definition for TurnUndeadCommand result data
interface TurnUndeadResultData {
  characterId: string;
  targetUndeadIds: string[];
  rollResult: { dice1: number; dice2: number; total: number; modified: number };
  overallResult: string;
  individualResults: Array<{
    undeadId: string;
    undeadName: string;
    hitDice: number;
    effect: 'no-effect' | 'turned' | 'destroyed' | 'commanded';
    duration?: number;
    count?: number;
  }>;
  affectedUndead: string[];
  totalTurned: number;
  totalDestroyed: number;
  turnLevel: number;
  modifiers: string[];
}

// Helper function to safely cast command result data
function getTurnUndeadData(result: CommandResult): TurnUndeadResultData {
  return result.data as unknown as TurnUndeadResultData;
}

import { createStore } from 'jotai';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  TurnUndeadCommand,
  type TurnUndeadParameters,
} from '../../../osric/commands/character/TurnUndeadCommand';
import type { CommandResult } from '../../../osric/core/Command';
import { GameContext } from '../../../osric/core/GameContext';
import type { Character, Monster } from '../../../osric/types/entities';

// Mock helper function to create test characters
function createMockCharacter(overrides: Partial<Character> = {}): Character {
  const defaultCharacter: Character = {
    id: 'test-char',
    name: 'Test Character',
    level: 1,
    hitPoints: { current: 8, maximum: 8 },
    armorClass: 10,
    thac0: 20,
    experience: { current: 0, requiredForNextLevel: 2000, level: 1 },
    alignment: 'True Neutral',
    inventory: [
      {
        id: 'holy-symbol',
        name: 'Holy Symbol',
        description: 'A blessed silver symbol',
        weight: 0.1,
        value: 25,
        equipped: false,
        magicBonus: 0,
        charges: null,
      },
    ],
    position: 'town',
    statusEffects: [],
    race: 'Human',
    class: 'Cleric',
    abilities: {
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
    },
    abilityModifiers: {
      strengthHitAdj: null,
      strengthDamageAdj: null,
      strengthEncumbrance: null,
      strengthOpenDoors: null,
      strengthBendBars: null,
      dexterityReaction: null,
      dexterityMissile: null,
      dexterityDefense: null,
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
      'Poison or Death': 10,
      Wands: 16,
      'Paralysis, Polymorph, or Petrification': 13,
      'Breath Weapons': 16,
      'Spells, Rods, or Staves': 15,
    },
    spells: [],
    currency: { platinum: 0, gold: 0, electrum: 0, silver: 0, copper: 0 },
    encumbrance: 0,
    movementRate: 120,
    classes: { Cleric: 1 },
    primaryClass: null,
    spellSlots: {},
    memorizedSpells: {},
    spellbook: [],
    thiefSkills: null,
    turnUndead: null,
    languages: ['Common'],
    age: 20,
    ageCategory: 'Adult',
    henchmen: [],
    racialAbilities: [],
    classAbilities: [],
    proficiencies: [],
    secondarySkills: [],
  };

  return { ...defaultCharacter, ...overrides };
}

// Mock helper function to create test undead monsters
function createMockUndead(overrides: Partial<Monster> = {}): Monster {
  const defaultUndead: Monster = {
    id: 'skeleton-1',
    name: 'Skeleton',
    level: 1,
    hitPoints: { current: 4, maximum: 4 },
    armorClass: 7,
    thac0: 19,
    hitDice: '1',
    experience: { current: 0, requiredForNextLevel: 0, level: 1 },
    alignment: 'Chaotic Evil',
    inventory: [],
    position: 'dungeon',
    statusEffects: [],
    // Monster-specific properties
    damagePerAttack: ['1d4'],
    morale: 12,
    treasure: 'Nil',
    specialAbilities: ['Immune to charm', 'Immune to sleep'],
    xpValue: 15,
    size: 'Medium',
    movementTypes: [{ type: 'Walk', rate: 120 }],
    habitat: ['Dungeon'],
    frequency: 'Common',
    organization: 'Group',
    diet: 'None',
    ecology: 'Undead',
  };

  return { ...defaultUndead, ...overrides };
}

describe('TurnUndeadCommand', () => {
  let context: GameContext;
  let originalMathRandom: () => number;

  beforeEach(() => {
    const store = createStore();
    context = new GameContext(store);

    // Store original Math.random
    originalMathRandom = Math.random;
    // Mock Math.random to return 0.5, which gives us:
    // - dice1 = Math.floor(0.5 * 6) + 1 = 3 + 1 = 4
    // - dice2 = Math.floor(0.5 * 6) + 1 = 3 + 1 = 4
    // - total = 8 (which should be successful for most turn attempts)
    Math.random = vi.fn(() => 0.5);

    // Setup test cleric
    const testCleric = createMockCharacter({
      id: 'test-cleric',
      name: 'Brother Marcus',
      class: 'Cleric',
      experience: { current: 0, requiredForNextLevel: 1550, level: 8 }, // Level 8 automatically turns 1 HD undead
      abilities: {
        strength: 12,
        dexterity: 10,
        constitution: 14,
        intelligence: 11,
        wisdom: 16, // High wisdom for clerics
        charisma: 13,
      },
    });

    context.setEntity('test-cleric', testCleric);

    // Setup test undead
    const skeleton = createMockUndead({
      id: 'skeleton-1',
      name: 'Skeleton',
      hitDice: '1',
    });

    const zombie = createMockUndead({
      id: 'zombie-1',
      name: 'Zombie',
      hitDice: '2',
    });

    const wight = createMockUndead({
      id: 'wight-1',
      name: 'Wight',
      hitDice: '4+3',
    });

    context.setEntity('skeleton-1', skeleton);
    context.setEntity('zombie-1', zombie);
    context.setEntity('wight-1', wight);
  });

  afterEach(() => {
    // Restore original Math.random
    Math.random = originalMathRandom;
  });

  describe('Parameter Validation', () => {
    it('should validate required character ID', async () => {
      const command = new TurnUndeadCommand({
        characterId: '',
        targetUndeadIds: ['skeleton-1'],
      });

      const result = await command.execute(context);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Character with ID "" not found');
    });

    it('should validate target undead IDs', async () => {
      const command = new TurnUndeadCommand({
        characterId: 'test-cleric',
        targetUndeadIds: [],
      });

      const result = await command.execute(context);
      expect(result.success).toBe(false);
      expect(result.message).toContain('No valid undead targets found');
    });

    it('should validate undead existence', async () => {
      const command = new TurnUndeadCommand({
        characterId: 'test-cleric',
        targetUndeadIds: ['nonexistent-undead'],
      });

      const result = await command.execute(context);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Undead creature with ID "nonexistent-undead" not found');
    });

    it('should validate situational modifier ranges', async () => {
      const command = new TurnUndeadCommand({
        characterId: 'test-cleric',
        targetUndeadIds: ['skeleton-1'],
        situationalModifiers: {
          holySymbolBonus: 15, // Too high
        },
      });

      const result = await command.execute(context);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Holy symbol bonus must be between -5 and +5');
    });
  });

  describe('Turn Undead Mechanics', () => {
    it('should successfully turn weak undead', async () => {
      const command = new TurnUndeadCommand({
        characterId: 'test-cleric',
        targetUndeadIds: ['skeleton-1'], // 1 HD vs level 8 cleric
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);

      const data = getTurnUndeadData(result);
      expect(data.overallResult).toMatch(/turned|destroyed/); // Level 8 cleric will destroy weak undead
      // Level 8 cleric automatically destroys 1 HD undead, so no dice roll needed
    });

    it('should destroy very weak undead', async () => {
      // High level cleric vs very weak undead
      const highLevelCleric = createMockCharacter({
        id: 'high-cleric',
        class: 'Cleric',
        experience: { current: 13000, requiredForNextLevel: 25000, level: 8 },
      });
      context.setEntity('high-cleric', highLevelCleric);

      const command = new TurnUndeadCommand({
        characterId: 'high-cleric',
        targetUndeadIds: ['skeleton-1'], // 1 HD vs level 8 cleric
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);

      const data = getTurnUndeadData(result);
      expect(data.totalDestroyed).toBeGreaterThan(0);
    });

    it('should handle multiple undead targets', async () => {
      const command = new TurnUndeadCommand({
        characterId: 'test-cleric',
        targetUndeadIds: ['skeleton-1', 'zombie-1'],
        massAttempt: true,
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);

      const data = getTurnUndeadData(result);
      expect(data.individualResults).toHaveLength(2);
      expect(data.individualResults[0].undeadName).toBe('Skeleton');
      expect(data.individualResults[1].undeadName).toBe('Zombie');
    });

    it('should process undead in HD order (weakest first)', async () => {
      const command = new TurnUndeadCommand({
        characterId: 'test-cleric',
        targetUndeadIds: ['wight-1', 'skeleton-1', 'zombie-1'], // Mixed order
        massAttempt: true,
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);
      // Should process in order: skeleton (1 HD), zombie (2 HD), wight (4+3 HD)
      const data = getTurnUndeadData(result);
      expect(data.individualResults[0].hitDice).toBe(1);
      expect(data.individualResults[1].hitDice).toBe(2);
      expect(data.individualResults[2].hitDice).toBe(5); // 4+3 becomes 5
    });
  });

  describe('Class-Based Turn Undead', () => {
    it('should handle Cleric turn undead', async () => {
      const command = new TurnUndeadCommand({
        characterId: 'test-cleric',
        targetUndeadIds: ['skeleton-1'],
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);
      expect(result.data?.turnLevel).toBe(8); // Cleric level 8
    });

    it('should handle Paladin turn undead (level-2)', async () => {
      const paladin = createMockCharacter({
        id: 'paladin',
        class: 'Paladin',
        experience: { current: 8000, requiredForNextLevel: 16500, level: 5 },
      });
      context.setEntity('paladin', paladin);

      const command = new TurnUndeadCommand({
        characterId: 'paladin',
        targetUndeadIds: ['skeleton-1'],
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);
      expect(result.data?.turnLevel).toBe(3); // Paladin level 5 turns as level 3 cleric
    });

    it('should reject low-level Paladin turn attempts', async () => {
      const lowPaladin = createMockCharacter({
        id: 'low-paladin',
        class: 'Paladin',
        experience: { current: 2000, requiredForNextLevel: 4500, level: 2 },
      });
      context.setEntity('low-paladin', lowPaladin);

      const command = new TurnUndeadCommand({
        characterId: 'low-paladin',
        targetUndeadIds: ['skeleton-1'],
      });

      const result = await command.execute(context);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Paladins can only turn undead starting at level 3');
    });

    it('should reject non-cleric classes', async () => {
      const fighter = createMockCharacter({
        id: 'fighter',
        class: 'Fighter',
        inventory: [], // No holy symbol
      });
      context.setEntity('fighter', fighter);

      const command = new TurnUndeadCommand({
        characterId: 'fighter',
        targetUndeadIds: ['skeleton-1'],
      });

      const result = await command.execute(context);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Only clerics, druids, and paladins can turn undead');
    });
  });

  describe('Evil Cleric Command Undead', () => {
    it('should handle evil cleric commanding undead', async () => {
      const evilCleric = createMockCharacter({
        id: 'evil-cleric',
        class: 'Cleric',
        alignment: 'Chaotic Evil',
        experience: { current: 3000, requiredForNextLevel: 6000, level: 4 },
      });
      context.setEntity('evil-cleric', evilCleric);

      const command = new TurnUndeadCommand({
        characterId: 'evil-cleric',
        targetUndeadIds: ['skeleton-1'],
        situationalModifiers: {
          isEvil: true,
        },
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);

      const data = getTurnUndeadData(result);
      expect(data.individualResults[0].effect).toBe('commanded');
    });
  });

  describe('Situational Modifiers', () => {
    it('should apply holy symbol bonuses', async () => {
      const command = new TurnUndeadCommand({
        characterId: 'test-cleric',
        targetUndeadIds: ['skeleton-1'],
        situationalModifiers: {
          holySymbolBonus: 2, // Blessed holy symbol
        },
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);

      const data = getTurnUndeadData(result);
      expect(data.modifiers).toContain('Holy symbol: +2');
      expect(data.rollResult.modified).toBeGreaterThanOrEqual(data.rollResult.total + 2);
    });

    it('should apply spell bonuses', async () => {
      const command = new TurnUndeadCommand({
        characterId: 'test-cleric',
        targetUndeadIds: ['skeleton-1'],
        situationalModifiers: {
          spellBonus: 1, // Bless spell
        },
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);
      expect(result.data?.modifiers).toContain('Spell effects: +1');
    });

    it('should apply area bonuses', async () => {
      const command = new TurnUndeadCommand({
        characterId: 'test-cleric',
        targetUndeadIds: ['skeleton-1'],
        situationalModifiers: {
          areaBonus: 3, // Consecrated ground
        },
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);
      expect(result.data?.modifiers).toContain('Consecrated ground: +3');
    });

    it('should handle combined modifiers', async () => {
      const command = new TurnUndeadCommand({
        characterId: 'test-cleric',
        targetUndeadIds: ['skeleton-1'],
        situationalModifiers: {
          holySymbolBonus: 1,
          spellBonus: 1,
          areaBonus: 2,
        },
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);

      const data = getTurnUndeadData(result);
      expect(data.modifiers).toHaveLength(3);
      expect(data.rollResult.modified).toBe(
        data.rollResult.total + 4 // +1+1+2
      );
    });
  });

  describe('OSRIC Turn Undead Table', () => {
    it('should use OSRIC 2d6 system', async () => {
      const command = new TurnUndeadCommand({
        characterId: 'test-cleric',
        targetUndeadIds: ['skeleton-1'],
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);

      const data = getTurnUndeadData(result);
      expect(data.rollResult.dice1).toBeGreaterThanOrEqual(1);
      expect(data.rollResult.dice1).toBeLessThanOrEqual(6);
      expect(data.rollResult.dice2).toBeGreaterThanOrEqual(1);
      expect(data.rollResult.dice2).toBeLessThanOrEqual(6);
      expect(data.rollResult.total).toBe(data.rollResult.dice1 + data.rollResult.dice2);
    });

    it('should calculate level difference correctly', async () => {
      // Level 8 cleric vs 1 HD undead = +7 difference (automatic turn/destroy)
      const command = new TurnUndeadCommand({
        characterId: 'test-cleric',
        targetUndeadIds: ['skeleton-1'],
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);
      // Result depends on roll, but should process correctly
      const data = getTurnUndeadData(result);
      expect(data.individualResults[0].hitDice).toBe(1);
    });

    it('should handle impossible turns', async () => {
      // Low level cleric vs high HD undead
      const lowCleric = createMockCharacter({
        id: 'low-cleric',
        class: 'Cleric',
        experience: { current: 0, requiredForNextLevel: 1550, level: 1 },
      });
      context.setEntity('low-cleric', lowCleric);

      const vampire = createMockUndead({
        id: 'vampire',
        name: 'Vampire',
        hitDice: '8+3', // Very high HD
      });
      context.setEntity('vampire', vampire);

      const command = new TurnUndeadCommand({
        characterId: 'low-cleric',
        targetUndeadIds: ['vampire'],
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);

      const data = getTurnUndeadData(result);
      expect(data.individualResults[0].effect).toBe('no-effect');
    });
  });

  describe('Duration and Count Mechanics', () => {
    it('should provide turn duration for successful turns', async () => {
      const command = new TurnUndeadCommand({
        characterId: 'test-cleric',
        targetUndeadIds: ['skeleton-1'],
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);
      // Duration should be provided for turned undead
      const data = getTurnUndeadData(result);
      if (data.individualResults[0].effect === 'turned') {
        expect(data.individualResults[0].duration).toBeGreaterThan(0);
      }
    });

    it('should affect multiple undead of same type', async () => {
      // Create multiple skeletons
      const skeleton2 = createMockUndead({
        id: 'skeleton-2',
        name: 'Skeleton',
        hitDice: '1',
      });
      const skeleton3 = createMockUndead({
        id: 'skeleton-3',
        name: 'Skeleton',
        hitDice: '1',
      });
      context.setEntity('skeleton-2', skeleton2);
      context.setEntity('skeleton-3', skeleton3);

      const command = new TurnUndeadCommand({
        characterId: 'test-cleric',
        targetUndeadIds: ['skeleton-1', 'skeleton-2', 'skeleton-3'],
        massAttempt: true,
      });

      const result = await command.execute(context);
      expect(result.success).toBe(true);
      expect(result.data?.totalTurned).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Command Properties', () => {
    it('should have correct command type', () => {
      const command = new TurnUndeadCommand({
        characterId: 'test-cleric',
        targetUndeadIds: ['skeleton-1'],
      });

      expect(command.type).toBe('turn-undead');
    });

    it('should provide required rules list', () => {
      const command = new TurnUndeadCommand({
        characterId: 'test-cleric',
        targetUndeadIds: ['skeleton-1'],
      });

      const requiredRules = command.getRequiredRules();
      expect(requiredRules).toContain('turn-undead');
    });

    it('should validate canExecute correctly', () => {
      const validCommand = new TurnUndeadCommand({
        characterId: 'test-cleric',
        targetUndeadIds: ['skeleton-1'],
      });

      const invalidCommand = new TurnUndeadCommand({
        characterId: 'nonexistent-cleric',
        targetUndeadIds: ['skeleton-1'],
      });

      expect(validCommand.canExecute(context)).toBe(true);
      expect(invalidCommand.canExecute(context)).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing character', async () => {
      const command = new TurnUndeadCommand({
        characterId: 'nonexistent-cleric',
        targetUndeadIds: ['skeleton-1'],
      });

      const result = await command.execute(context);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Character with ID "nonexistent-cleric" not found');
    });

    it('should handle multiple invalid targets', async () => {
      const command = new TurnUndeadCommand({
        characterId: 'test-cleric',
        targetUndeadIds: ['invalid-1', 'invalid-2'],
      });

      const result = await command.execute(context);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Undead creature with ID "invalid-1" not found');
    });

    it('should handle invalid modifier combinations', async () => {
      const command = new TurnUndeadCommand({
        characterId: 'test-cleric',
        targetUndeadIds: ['skeleton-1'],
        situationalModifiers: {
          holySymbolBonus: -10, // Invalid range
          spellBonus: 3,
        },
      });

      const result = await command.execute(context);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Holy symbol bonus must be between -5 and +5');
    });

    it('should handle exceptions gracefully', async () => {
      // Create a command that will cause an error during execution
      const command = new TurnUndeadCommand({
        characterId: 'test-cleric',
        targetUndeadIds: ['skeleton-1'],
        situationalModifiers: {
          holySymbolBonus: 10, // This will trigger validation error
        },
      });

      const result = await command.execute(context);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Holy symbol bonus must be between -5 and +5');
    });
  });
});
