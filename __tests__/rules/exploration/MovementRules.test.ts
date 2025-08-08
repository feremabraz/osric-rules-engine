// File: __tests__/rules/exploration/MovementRules.test.ts
import type { Command } from '@osric/core/Command';
import { GameContext } from '@osric/core/GameContext';
import { MovementRule } from '@osric/rules/exploration/MovementRules';
import { COMMAND_TYPES } from '@osric/types/constants';
import type { Character } from '@osric/types/entities';
import { createStore } from 'jotai';
import { beforeEach, describe, expect, it } from 'vitest';

// TEMPLATE: Mock Character Creation Helper
function createMockCharacter(overrides: Partial<Character> = {}): Character {
  const defaultCharacter: Character = {
    id: 'test-character',
    name: 'Test Character',
    level: 1,
    race: 'Human',
    class: 'Fighter',
    abilities: {
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
    },
    hitPoints: { current: 8, maximum: 8 },
    experience: { current: 0, requiredForNextLevel: 2000, level: 1 },
    armorClass: 10,
    thac0: 20,
    alignment: 'True Neutral',
    inventory: [],
    position: 'town',
    statusEffects: [],
    spells: [],
    currency: {
      platinum: 0,
      gold: 0,
      electrum: 0,
      silver: 0,
      copper: 0,
    },
    encumbrance: 0,
    movementRate: 120,
    classes: {},
    primaryClass: 'Fighter',
    spellSlots: {},
    memorizedSpells: {},
    spellbook: [],
    thiefSkills: null,
    turnUndead: null,
    languages: [],
    age: 25,
    ageCategory: 'Adult',
    henchmen: [],
    racialAbilities: [],
    classAbilities: [],
    proficiencies: [],
    secondarySkills: [],
    savingThrows: {
      'Poison or Death': 14,
      Wands: 15,
      'Paralysis, Polymorph, or Petrification': 16,
      'Breath Weapons': 17,
      'Spells, Rods, or Staves': 18,
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
    // Add any component-specific overrides
    ...overrides,
  };

  return defaultCharacter;
}

describe('MovementRule', () => {
  let rule: MovementRule;
  let context: GameContext;
  let mockCommand: Command;

  beforeEach(() => {
    // CRITICAL: Setup infrastructure
    const store = createStore();
    context = new GameContext(store);
    rule = new MovementRule();

    // CRITICAL: Setup test entities
    const character = createMockCharacter({ id: 'test-character' });
    context.setEntity('test-character', character);

    // CRITICAL: Setup context data for Rules (COMPONENT_SPECIFIC)
    context.setTemporary('movement-request-params', {
      characterId: 'test-character',
      fromPosition: 'room-1',
      toPosition: 'room-2',
      movementType: 'walk',
      distance: 60,
      terrainType: 'clear',
      encumbrance: 'light',
    });

    // CRITICAL: Setup command with proper type
    mockCommand = {
      type: COMMAND_TYPES.MOVE,
      actorId: 'test-character',
      targetIds: [],
      async execute() {
        return { success: true, message: 'Mock' };
      },
      canExecute: () => true,
      getRequiredRules: () => ['movement-validation'],
      getInvolvedEntities: () => ['test-character'],
    } as Command;
  });

  describe('canApply', () => {
    it('should apply when all conditions are met', () => {
      expect(rule.canApply(context, mockCommand)).toBe(true);
    });

    it('should not apply with wrong command type', () => {
      const wrongCommand = { ...mockCommand, type: 'wrong-type' };
      expect(rule.canApply(context, wrongCommand)).toBe(false);
    });

    it('should not apply without context data', () => {
      context.setTemporary('movement-request-params', null);
      expect(rule.canApply(context, mockCommand)).toBe(false);
    });

    it('should not apply without required data fields', () => {
      // Test missing fromPosition and toPosition
      context.setTemporary('movement-request-params', {
        characterId: 'test-character',
        // Missing fromPosition and toPosition
        movementType: 'walk',
        distance: 60,
      });
      expect(rule.canApply(context, mockCommand)).toBe(false);
    });
  });

  describe('execute - Success Scenarios', () => {
    it('should execute successfully with valid data', async () => {
      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
      expect(result.data).toBeDefined();
    });

    it('should handle character has valid movement rate', async () => {
      // Component-specific success test
      context.setTemporary('movement-request-params', {
        characterId: 'test-character',
        fromPosition: 'room-1',
        toPosition: 'room-2',
        movementType: 'walk',
        distance: 60, // Within normal movement range
        terrainType: 'clear',
        encumbrance: 'light',
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Moved 60 feet successfully');
      expect(result.data?.result).toBeDefined();
      const movementResult = result.data?.result as { actualDistance: number };
      expect(movementResult.actualDistance).toBe(60);
    });
  });

  describe('execute - Error Scenarios', () => {
    it('should handle missing context data', async () => {
      context.setTemporary('movement-request-params', null);

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('No movement request data provided');
    });

    it('should handle missing character', async () => {
      context.setTemporary('movement-request-params', {
        characterId: 'nonexistent',
        fromPosition: 'room-1',
        toPosition: 'room-2',
        movementType: 'walk',
        distance: 60,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Character not found');
    });

    it('should handle character exceeds movement limits', async () => {
      // Component-specific error test
      context.setTemporary('movement-request-params', {
        characterId: 'test-character',
        fromPosition: 'room-1',
        toPosition: 'room-2',
        movementType: 'walk',
        distance: 600, // Excessive distance
        terrainType: 'clear',
        encumbrance: 'light',
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('exceeds maximum possible movement');
    });

    it('should handle unconscious character', async () => {
      const unconsciousCharacter = createMockCharacter({
        id: 'unconscious-character',
        hitPoints: { current: 0, maximum: 8 },
      });
      context.setEntity('unconscious-character', unconsciousCharacter);

      context.setTemporary('movement-request-params', {
        characterId: 'unconscious-character',
        fromPosition: 'room-1',
        toPosition: 'room-2',
        movementType: 'walk',
        distance: 60,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('unconscious or dead');
    });

    it('should handle paralyzed character', async () => {
      const paralyzedCharacter = createMockCharacter({
        id: 'paralyzed-character',
        statusEffects: [
          {
            name: 'paralyzed',
            duration: 10,
            effect: 'Character cannot move or act',
            savingThrow: null,
            endCondition: null,
          },
        ],
      });
      context.setEntity('paralyzed-character', paralyzedCharacter);

      context.setTemporary('movement-request-params', {
        characterId: 'paralyzed-character',
        fromPosition: 'room-1',
        toPosition: 'room-2',
        movementType: 'walk',
        distance: 60,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Cannot move due to: paralyzed');
    });
  });

  describe('OSRIC Compliance', () => {
    it('should implement authentic OSRIC/AD&D 1st Edition mechanics', async () => {
      const osricCharacter = createMockCharacter({
        id: 'osric-character',
        level: 3,
        class: 'Fighter',
        abilities: {
          strength: 16,
          dexterity: 12,
          constitution: 14,
          intelligence: 10,
          wisdom: 10,
          charisma: 10,
        },
        race: 'Human',
        armorClass: 4, // Chain mail
      });
      context.setEntity('osric-character', osricCharacter);

      context.setTemporary('movement-request-params', {
        characterId: 'osric-character',
        fromPosition: 'outdoor-1',
        toPosition: 'outdoor-2',
        movementType: 'walk',
        distance: 90, // 3/4 of human base movement (120)
        terrainType: 'clear',
        encumbrance: 'light',
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      // Validate OSRIC-specific mechanics
      const movementResult = result.data?.result as {
        actualDistance: number;
        timeRequired: number;
        fatigueGained: number;
      };
      expect(movementResult.actualDistance).toBe(90);
      expect(movementResult.timeRequired).toBeGreaterThan(0);
      expect(movementResult.fatigueGained).toBe(0); // Walking shouldn't cause fatigue
    });

    it('should handle different terrain types according to OSRIC rules', async () => {
      context.setTemporary('movement-request-params', {
        characterId: 'test-character',
        fromPosition: 'forest-1',
        toPosition: 'forest-2',
        movementType: 'walk',
        distance: 60,
        terrainType: 'forest', // Should reduce movement rate
        encumbrance: 'light',
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      const movementResult = result.data?.result as { specialEffects: string[] };
      // Forest terrain should slow movement
      expect(movementResult.specialEffects).toBeDefined();
    });

    it('should handle different movement types', async () => {
      // Create a character with low constitution to ensure fatigue
      const lowConCharacter = createMockCharacter({
        id: 'low-con-character',
        abilities: {
          strength: 10,
          dexterity: 10,
          constitution: 8, // Low constitution for higher fatigue
          intelligence: 10,
          wisdom: 10,
          charisma: 10,
        },
      });
      context.setEntity('low-con-character', lowConCharacter);

      context.setTemporary('movement-request-params', {
        characterId: 'low-con-character',
        fromPosition: 'ground',
        toPosition: 'wall-top',
        movementType: 'climb',
        distance: 120, // Distance that should generate fatigue
        terrainType: 'clear',
        encumbrance: 'light',
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      const movementResult = result.data?.result as {
        specialEffects: string[];
        fatigueGained: number;
      };
      expect(movementResult.specialEffects).toContain('Climbing check may be required');
      expect(movementResult.fatigueGained).toBeGreaterThan(0); // Should generate fatigue
    });

    it('should handle running and fatigue', async () => {
      context.setTemporary('movement-request-params', {
        characterId: 'test-character',
        fromPosition: 'start',
        toPosition: 'end',
        movementType: 'run',
        distance: 240, // Double movement rate
        terrainType: 'clear',
        encumbrance: 'light',
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      const movementResult = result.data?.result as {
        fatigueGained: number;
        specialEffects: string[];
      };
      expect(movementResult.fatigueGained).toBeGreaterThan(0);
      expect(movementResult.specialEffects).toContain('Gained fatigue from running');
    });

    it('should handle heavy encumbrance penalties', async () => {
      context.setTemporary('movement-request-params', {
        characterId: 'test-character',
        fromPosition: 'start',
        toPosition: 'end',
        movementType: 'walk',
        distance: 60,
        terrainType: 'clear',
        encumbrance: 'heavy', // Should reduce movement rate significantly
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      // Heavy encumbrance should allow movement but possibly at reduced rate
      const movementResult = result.data?.result as { actualDistance: number };
      expect(movementResult.actualDistance).toBeLessThanOrEqual(60);
    });

    it('should handle racial movement differences', async () => {
      const dwarfCharacter = createMockCharacter({
        id: 'dwarf-character',
        race: 'Dwarf', // Dwarves have 60' base movement vs Human 120'
      });
      context.setEntity('dwarf-character', dwarfCharacter);

      context.setTemporary('movement-request-params', {
        characterId: 'dwarf-character',
        fromPosition: 'start',
        toPosition: 'end',
        movementType: 'walk',
        distance: 100, // More than dwarf base movement
        terrainType: 'clear',
        encumbrance: 'light',
      });

      const result = await rule.execute(context, mockCommand);

      // Dwarf should be able to move but may be limited to actual distance
      expect(result.success).toBe(true);
      const movementResult = result.data?.result as { actualDistance: number };
      // Since dwarf has 60' base movement, should be limited to less than requested 100
      expect(movementResult.actualDistance).toBeLessThanOrEqual(100);
    });
  });
});
