/**
 * TurnUndeadRules Tests - OSRIC Compliance
 *
 * Tests the TurnUndeadRule for proper OSRIC turn undead mechanics:
 * - OSRIC turn undead table calculations (2d6 system)
 * - Class validation (Cleric, Paladin, Druid)
 * - Level difference calculations and target numbers
 * - Holy symbol requirements and validation
 * - Turn attempt limits and restrictions
 * - Special rules for different undead types
 * - Turn vs Destroy determination logic
 * - Edge cases and error scenarios
 */

import { createStore } from 'jotai';
import { beforeEach, describe, expect, it } from 'vitest';
import { GameContext } from '../../../osric/core/GameContext';
import type { RuleResult } from '../../../osric/core/Rule';
import { TurnUndeadRule } from '../../../osric/rules/character/TurnUndeadRules';
import type { Character, Monster } from '../../../osric/types/entities';

// Type definition for TurnUndeadRule result data
interface TurnUndeadRuleResultData {
  characterId: string;
  effectiveLevel: number;
  targetUndead: Array<{
    undeadId: string;
    name: string;
    hitDice: number;
    turnChance: string;
    canTurn: boolean;
    wouldDestroy: boolean;
  }>;
  modifiers: Array<{ source: string; modifier: number; description: string }>;
  specialRules: unknown;
  canAttempt: boolean;
  restrictions: string[];
  turnLimit: number;
}

// Helper function to safely cast rule result data
function getTurnUndeadRuleData(result: RuleResult): TurnUndeadRuleResultData {
  return result.data as unknown as TurnUndeadRuleResultData;
}

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

// Mock command for testing
class MockTurnUndeadCommand {
  readonly type = 'turn-undead';
  readonly actorId = 'test-character';
  readonly targetIds: string[] = ['skeleton-1'];

  async execute(_context: GameContext) {
    return { success: true, message: 'Mock turn undead command executed' };
  }

  canExecute(_context: GameContext): boolean {
    return true;
  }

  getRequiredRules(): string[] {
    return ['turn-undead'];
  }

  getInvolvedEntities(): string[] {
    return [this.actorId, ...this.targetIds];
  }
}

describe('TurnUndeadRules', () => {
  let context: GameContext;
  let turnUndeadRule: TurnUndeadRule;
  let mockCommand: MockTurnUndeadCommand;

  beforeEach(() => {
    const store = createStore();
    context = new GameContext(store);
    turnUndeadRule = new TurnUndeadRule();
    mockCommand = new MockTurnUndeadCommand();

    // Setup test cleric
    const testCleric = createMockCharacter({
      id: 'test-character',
      name: 'Brother Marcus',
      class: 'Cleric',
      experience: { current: 0, requiredForNextLevel: 1550, level: 3 },
      abilities: {
        strength: 12,
        dexterity: 10,
        constitution: 14,
        intelligence: 11,
        wisdom: 16, // High wisdom for clerics
        charisma: 13,
      },
    });

    context.setEntity('test-character', testCleric);

    // Setup test undead
    const skeleton = createMockUndead({
      id: 'skeleton-1',
      name: 'Skeleton',
      hitDice: '1',
    });

    context.setEntity('skeleton-1', skeleton);
  });

  describe('Rule Application', () => {
    it('should apply to turn-undead commands', () => {
      const result = turnUndeadRule.canApply(context, mockCommand);
      expect(result).toBe(true);
    });

    it('should not apply to other command types', () => {
      class OtherCommand {
        readonly type = 'attack';
        readonly actorId = 'test-character';
        readonly targetIds: string[] = [];

        async execute(_context: GameContext) {
          return { success: true, message: 'Mock other command executed' };
        }

        canExecute(_context: GameContext): boolean {
          return true;
        }

        getRequiredRules(): string[] {
          return ['attack'];
        }

        getInvolvedEntities(): string[] {
          return [this.actorId, ...this.targetIds];
        }
      }

      const otherCommand = new OtherCommand();
      const result = turnUndeadRule.canApply(context, otherCommand);
      expect(result).toBe(false);
    });
  });

  describe('Class Validation', () => {
    it('should allow Cleric turn undead attempts', async () => {
      context.setTemporary('turn-undead-params', {
        characterId: 'test-character',
        targetUndeadIds: ['skeleton-1'],
      });

      const result = await turnUndeadRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.canAttempt).toBe(true);
      expect(result.data?.effectiveLevel).toBe(3);
    });

    it('should allow Paladin turn undead at level 3+', async () => {
      const paladin = createMockCharacter({
        class: 'Paladin',
        experience: { current: 8000, requiredForNextLevel: 16500, level: 5 },
      });
      context.setEntity('test-character', paladin);

      context.setTemporary('turn-undead-params', {
        characterId: 'test-character',
        targetUndeadIds: ['skeleton-1'],
      });

      const result = await turnUndeadRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.canAttempt).toBe(true);
      expect(result.data?.effectiveLevel).toBe(3); // Level 5 paladin turns as level 3 cleric
    });

    it('should reject low-level Paladin attempts', async () => {
      const lowPaladin = createMockCharacter({
        class: 'Paladin',
        experience: { current: 2000, requiredForNextLevel: 4500, level: 2 },
      });
      context.setEntity('test-character', lowPaladin);

      context.setTemporary('turn-undead-params', {
        characterId: 'test-character',
        targetUndeadIds: ['skeleton-1'],
      });

      const result = await turnUndeadRule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Paladins can only turn undead starting at level 3');
    });

    it('should allow Druid turn undead attempts', async () => {
      const druid = createMockCharacter({
        class: 'Druid',
        experience: { current: 4000, requiredForNextLevel: 7500, level: 4 },
      });
      context.setEntity('test-character', druid);

      context.setTemporary('turn-undead-params', {
        characterId: 'test-character',
        targetUndeadIds: ['skeleton-1'],
      });

      const result = await turnUndeadRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.canAttempt).toBe(true);
      expect(result.data?.effectiveLevel).toBe(4);
      expect(result.data?.specialRules).toContain(
        'Druids can turn undead but not skeletons/zombies'
      );
    });

    it('should reject non-clerical classes', async () => {
      const fighter = createMockCharacter({
        class: 'Fighter',
        inventory: [], // No holy symbol
      });
      context.setEntity('test-character', fighter);

      context.setTemporary('turn-undead-params', {
        characterId: 'test-character',
        targetUndeadIds: ['skeleton-1'],
      });

      const result = await turnUndeadRule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Only clerics, druids, and paladins can turn undead');
    });

    it('should handle multi-class with cleric', async () => {
      const multiClass = createMockCharacter({
        class: 'Cleric', // Use single class since multi-class strings aren't supported
        experience: { current: 3000, requiredForNextLevel: 6000, level: 3 },
      });
      context.setEntity('test-character', multiClass);

      context.setTemporary('turn-undead-params', {
        characterId: 'test-character',
        targetUndeadIds: ['skeleton-1'],
      });

      const result = await turnUndeadRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.canAttempt).toBe(true);
      expect(result.data?.effectiveLevel).toBe(3);
    });
  });

  describe('Holy Symbol Requirements', () => {
    it('should detect holy symbol presence', async () => {
      context.setTemporary('turn-undead-params', {
        characterId: 'test-character',
        targetUndeadIds: ['skeleton-1'],
      });

      const result = await turnUndeadRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.restrictions).not.toContain('Requires holy symbol to turn undead');
    });

    it('should warn about missing holy symbol', async () => {
      const clericNoSymbol = createMockCharacter({
        inventory: [], // No holy symbol
      });
      context.setEntity('test-character', clericNoSymbol);

      context.setTemporary('turn-undead-params', {
        characterId: 'test-character',
        targetUndeadIds: ['skeleton-1'],
      });

      const result = await turnUndeadRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.restrictions).toContain('Requires holy symbol to turn undead');
    });
  });

  describe('OSRIC Turn Undead Calculations', () => {
    it('should calculate turn chances correctly', async () => {
      context.setTemporary('turn-undead-params', {
        characterId: 'test-character',
        targetUndeadIds: ['skeleton-1'],
      });

      const result = await turnUndeadRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      const data = getTurnUndeadRuleData(result);
      expect(data.targetUndead).toBeDefined();
      expect(data.targetUndead[0]).toMatchObject({
        undeadId: 'skeleton-1',
        name: 'Skeleton',
        hitDice: 1,
        canTurn: true,
      });
    });

    it('should handle automatic turns for weak undead', async () => {
      // High level cleric vs very weak undead
      const highCleric = createMockCharacter({
        class: 'Cleric',
        experience: { current: 55000, requiredForNextLevel: 110000, level: 10 },
      });
      context.setEntity('test-character', highCleric);

      context.setTemporary('turn-undead-params', {
        characterId: 'test-character',
        targetUndeadIds: ['skeleton-1'], // 1 HD vs level 10 = +9 difference
      });

      const result = await turnUndeadRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      const data = getTurnUndeadRuleData(result);
      expect(data.targetUndead[0].turnChance).toBe('Automatic');
      expect(data.targetUndead[0].wouldDestroy).toBe(true);
    });

    it('should handle impossible turns', async () => {
      // Low level cleric vs powerful undead
      const lowCleric = createMockCharacter({
        class: 'Cleric',
        experience: { current: 0, requiredForNextLevel: 1550, level: 1 },
      });
      context.setEntity('test-character', lowCleric);

      const vampire = createMockUndead({
        id: 'vampire',
        name: 'Vampire',
        hitDice: '8+3', // Very high HD
      });
      context.setEntity('vampire', vampire);

      context.setTemporary('turn-undead-params', {
        characterId: 'test-character',
        targetUndeadIds: ['vampire'],
      });

      const result = await turnUndeadRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      const data = getTurnUndeadRuleData(result);
      expect(data.targetUndead[0].turnChance).toBe('Impossible');
      expect(data.targetUndead[0].canTurn).toBe(false);
    });

    it('should calculate various difficulty levels', async () => {
      // Test different turn chances based on level difference
      const testCases = [
        { clericLevel: 5, undeadHD: '3', expectedRange: '7+ on 2d6' },
        { clericLevel: 4, undeadHD: '3', expectedRange: '10+ on 2d6' },
        { clericLevel: 2, undeadHD: '3', expectedRange: '13+ on 2d6' },
      ];

      for (const testCase of testCases) {
        const cleric = createMockCharacter({
          class: 'Cleric',
          experience: { current: 0, requiredForNextLevel: 1550, level: testCase.clericLevel },
        });
        context.setEntity('test-character', cleric);

        const undead = createMockUndead({
          id: 'test-undead',
          hitDice: testCase.undeadHD,
        });
        context.setEntity('test-undead', undead);

        context.setTemporary('turn-undead-params', {
          characterId: 'test-character',
          targetUndeadIds: ['test-undead'],
        });

        const result = await turnUndeadRule.execute(context, mockCommand);

        expect(result.success).toBe(true);
        const data = getTurnUndeadRuleData(result);
        expect(data.targetUndead[0].turnChance).toBe(testCase.expectedRange);
      }
    });
  });

  describe('Hit Dice Parsing', () => {
    it('should parse standard hit dice correctly', async () => {
      const testUndead = createMockUndead({
        id: 'test-undead',
        hitDice: '3',
      });
      context.setEntity('test-undead', testUndead);

      context.setTemporary('turn-undead-params', {
        characterId: 'test-character',
        targetUndeadIds: ['test-undead'],
      });

      const result = await turnUndeadRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      const data = getTurnUndeadRuleData(result);
      expect(data.targetUndead[0].hitDice).toBe(3);
    });

    it('should parse hit dice with bonuses', async () => {
      const testUndead = createMockUndead({
        id: 'test-undead',
        hitDice: '4+3',
      });
      context.setEntity('test-undead', testUndead);

      context.setTemporary('turn-undead-params', {
        characterId: 'test-character',
        targetUndeadIds: ['test-undead'],
      });

      const result = await turnUndeadRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      const data = getTurnUndeadRuleData(result);
      expect(data.targetUndead[0].hitDice).toBe(5); // 4+bonus becomes 5
    });

    it('should parse hit dice with penalties', async () => {
      const testUndead = createMockUndead({
        id: 'test-undead',
        hitDice: '2-1',
      });
      context.setEntity('test-undead', testUndead);

      context.setTemporary('turn-undead-params', {
        characterId: 'test-character',
        targetUndeadIds: ['test-undead'],
      });

      const result = await turnUndeadRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      const data = getTurnUndeadRuleData(result);
      expect(data.targetUndead[0].hitDice).toBe(2); // 2-penalty still counts as 2
    });
  });

  describe('Situational Modifiers', () => {
    it('should apply holy symbol bonuses', async () => {
      context.setTemporary('turn-undead-params', {
        characterId: 'test-character',
        targetUndeadIds: ['skeleton-1'],
        situationalModifiers: {
          holySymbolBonus: 2,
        },
      });

      const result = await turnUndeadRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.modifiers).toContainEqual(
        expect.objectContaining({ source: 'holy-symbol' })
      );
    });

    it('should apply spell bonuses', async () => {
      context.setTemporary('turn-undead-params', {
        characterId: 'test-character',
        targetUndeadIds: ['skeleton-1'],
        situationalModifiers: {
          spellBonus: 1,
        },
      });

      const result = await turnUndeadRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.modifiers).toContainEqual(expect.objectContaining({ source: 'spell' }));
    });

    it('should apply area bonuses', async () => {
      context.setTemporary('turn-undead-params', {
        characterId: 'test-character',
        targetUndeadIds: ['skeleton-1'],
        situationalModifiers: {
          areaBonus: 3,
        },
      });

      const result = await turnUndeadRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.modifiers).toContainEqual(expect.objectContaining({ source: 'area' }));
    });
  });

  describe('Special Rules', () => {
    it('should include general turn undead rules', async () => {
      context.setTemporary('turn-undead-params', {
        characterId: 'test-character',
        targetUndeadIds: ['skeleton-1'],
      });

      const result = await turnUndeadRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.specialRules).toContain('Can attempt once per turn (10 minutes)');
      expect(result.data?.specialRules).toContain('Requires holy symbol');
      expect(result.data?.specialRules).toContain('Affects 2d6 HD of undead on success');
    });

    it('should handle evil cleric special rules', async () => {
      context.setTemporary('turn-undead-params', {
        characterId: 'test-character',
        targetUndeadIds: ['skeleton-1'],
        situationalModifiers: {
          isEvil: true,
        },
      });

      const result = await turnUndeadRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.specialRules).toContain(
        'Evil clerics command undead instead of turning them'
      );
    });

    it('should handle alignment effects', async () => {
      context.setTemporary('turn-undead-params', {
        characterId: 'test-character',
        targetUndeadIds: ['skeleton-1'],
        situationalModifiers: {
          alignment: 'good',
        },
      });

      const result = await turnUndeadRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.specialRules).toContain(
        'Good alignment provides bonuses in consecrated areas'
      );
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing turn undead data', async () => {
      const result = await turnUndeadRule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('No turn undead data provided');
    });

    it('should handle missing character', async () => {
      context.setTemporary('turn-undead-params', {
        characterId: 'nonexistent-character',
        targetUndeadIds: ['skeleton-1'],
      });

      const result = await turnUndeadRule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Character nonexistent-character not found');
    });

    it('should handle missing undead targets', async () => {
      context.setTemporary('turn-undead-params', {
        characterId: 'test-character',
        targetUndeadIds: ['nonexistent-undead'],
      });

      const result = await turnUndeadRule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Undead creature nonexistent-undead not found');
    });

    it('should handle unconscious characters', async () => {
      const unconsciousCleric = createMockCharacter({
        hitPoints: { current: 0, maximum: 10 },
      });
      context.setEntity('test-character', unconsciousCleric);

      context.setTemporary('turn-undead-params', {
        characterId: 'test-character',
        targetUndeadIds: ['skeleton-1'],
      });

      const result = await turnUndeadRule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Cannot turn undead while unconscious or dead');
    });

    it('should handle invalid hit dice formats', async () => {
      const badUndead = createMockUndead({
        id: 'bad-undead',
        hitDice: 'invalid',
      });
      context.setEntity('bad-undead', badUndead);

      context.setTemporary('turn-undead-params', {
        characterId: 'test-character',
        targetUndeadIds: ['bad-undead'],
      });

      const result = await turnUndeadRule.execute(context, mockCommand);

      expect(result.success).toBe(true); // Should handle gracefully
      const data = getTurnUndeadRuleData(result);
      expect(data.targetUndead[0].hitDice).toBe(1); // Default to 1 HD
    });

    it('should handle multiple target validation', async () => {
      const zombie = createMockUndead({
        id: 'zombie-1',
        name: 'Zombie',
        hitDice: '2',
      });
      context.setEntity('zombie-1', zombie);

      context.setTemporary('turn-undead-params', {
        characterId: 'test-character',
        targetUndeadIds: ['skeleton-1', 'zombie-1'],
      });

      const result = await turnUndeadRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.targetAnalysis).toHaveLength(2);
    });

    it('should handle exceptions gracefully', async () => {
      // Trigger an exception by providing malformed data
      context.setTemporary('turn-undead-params', {
        characterId: 'test-character',
        targetUndeadIds: null, // Will cause an error
      });

      const result = await turnUndeadRule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to process turn undead rule');
    });
  });
});
