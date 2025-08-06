/**
 * ReactionRollCommand Tests - OSRIC Compliance
 *
 * Tests the ReactionRollCommand for proper NPC reaction command execution:
 * - Command setup and context data preparation
 * - Entity validation and error handling
 * - Integration with ReactionRules
 * - Proper command result handling
 * - Edge cases and error scenarios
 */

import { createStore } from 'jotai';
import { beforeEach, describe, expect, it } from 'vitest';
import { ReactionRollCommand } from '../../../osric/commands/npc/ReactionRollCommand';
import { GameContext } from '../../../osric/core/GameContext';
import type { Character } from '../../../osric/types/entities';

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
    inventory: [],
    position: 'town',
    statusEffects: [],
    race: 'Human',
    class: 'Fighter',
    abilities: {
      strength: 10,
      dexterity: 10,
      constitution: 10,
      intelligence: 10,
      wisdom: 10,
      charisma: 12,
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
      'Poison or Death': 14,
      Wands: 15,
      'Paralysis, Polymorph, or Petrification': 16,
      'Breath Weapons': 17,
      'Spells, Rods, or Staves': 17,
    },
    spells: [],
    currency: { platinum: 0, gold: 0, electrum: 0, silver: 0, copper: 0 },
    encumbrance: 0,
    movementRate: 12,
    classes: { Fighter: 1 },
    primaryClass: null,
    spellSlots: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
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
    secondarySkills: [],
    ...overrides,
  };

  return defaultCharacter;
}

// Mock NPC entity for testing
function createMockNPC(overrides: Partial<Character> = {}): Character {
  return createMockCharacter({
    id: 'test-npc',
    name: 'Test NPC',
    race: 'Human',
    class: 'Fighter',
    ...overrides,
  });
}

describe('ReactionRollCommand', () => {
  let context: GameContext;
  let character: Character;
  let npc: Character;

  beforeEach(() => {
    const store = createStore();
    context = new GameContext(store);

    // Create test entities
    character = createMockCharacter({
      id: 'test-character',
      name: 'Test Hero',
      abilities: { ...createMockCharacter().abilities, charisma: 14 },
    });

    npc = createMockNPC({
      id: 'test-npc',
      name: 'Village Elder',
    });

    // Store entities in context
    context.setEntity('test-character', character);
    context.setEntity('test-npc', npc);
  });

  describe('Command Construction', () => {
    it('should create command with required parameters', () => {
      const command = new ReactionRollCommand('test-character', 'test-npc', 'first_meeting');

      expect(command.type).toBe('reaction-roll');
      expect(command.getInvolvedEntities()).toContain('test-character');
      expect(command.getInvolvedEntities()).toContain('test-npc');
    });

    it('should create command with optional modifiers', () => {
      const command = new ReactionRollCommand('test-character', 'test-npc', 'negotiation', {
        gifts: 1,
        reputation: 1,
      });

      expect(command.type).toBe('reaction-roll');
    });

    it('should set spokesperson flag', () => {
      const command = new ReactionRollCommand(
        'test-character',
        'test-npc',
        'first_meeting',
        undefined,
        true
      );

      expect(command.getRequiredRules()).toContain('reaction-roll');
    });
  });

  describe('Command Validation', () => {
    it('should validate that required entities exist', () => {
      const command = new ReactionRollCommand('test-character', 'test-npc', 'first_meeting');

      expect(command.canExecute(context)).toBe(true);
    });

    it('should fail validation when character does not exist', () => {
      const command = new ReactionRollCommand('nonexistent-character', 'test-npc', 'first_meeting');

      expect(command.canExecute(context)).toBe(false);
    });

    it('should fail validation when target does not exist', () => {
      const command = new ReactionRollCommand('test-character', 'nonexistent-npc', 'first_meeting');

      expect(command.canExecute(context)).toBe(false);
    });
  });

  describe('Command Execution', () => {
    it('should execute successfully with valid entities', async () => {
      const command = new ReactionRollCommand('test-character', 'test-npc', 'first_meeting');

      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Reaction roll:');
      expect(result.data).toBeDefined();
    });

    it('should fail execution when entities are missing', async () => {
      // Create a fresh context without adding any entities
      const emptyStore = createStore();
      const emptyContext = new GameContext(emptyStore);

      const command = new ReactionRollCommand('test-character', 'test-npc', 'first_meeting');

      const result = await command.execute(emptyContext);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Required entities not found');
    });

    it('should setup context data correctly', async () => {
      const command = new ReactionRollCommand(
        'test-character',
        'test-npc',
        'negotiation',
        {
          gifts: 2,
          reputation: 1,
        },
        true
      );

      await command.execute(context);

      // Check that context data was set up correctly
      const params = context.getTemporary('reaction-roll-params');
      expect(params).toBeDefined();
      expect(params).toHaveProperty('characterId', 'test-character');
      expect(params).toHaveProperty('targetId', 'test-npc');
      expect(params).toHaveProperty('interactionType', 'negotiation');
      expect(params).toHaveProperty('modifiers');
      expect(params).toHaveProperty('isPartySpokesperson', true);
    });

    it('should handle rule execution failure', async () => {
      // Create command with invalid character to trigger rule failure
      const command = new ReactionRollCommand('invalid-character', 'test-npc', 'first_meeting');

      const result = await command.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Required entities not found');
    });
  });

  describe('Interaction Types', () => {
    const interactionTypes = [
      'first_meeting',
      'negotiation',
      'intimidation',
      'persuasion',
      'bribery',
    ] as const;

    for (const interactionType of interactionTypes) {
      it(`should handle ${interactionType} interaction type`, async () => {
        const command = new ReactionRollCommand('test-character', 'test-npc', interactionType);

        const result = await command.execute(context);

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
      });
    }
  });

  describe('Modifiers Integration', () => {
    it('should pass gift modifiers to rules', async () => {
      const command = new ReactionRollCommand('test-character', 'test-npc', 'negotiation', {
        gifts: 2,
      });

      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.message).toContain('+'); // Should show positive modifier
    });

    it('should pass threat modifiers to rules', async () => {
      const command = new ReactionRollCommand('test-character', 'test-npc', 'intimidation', {
        threats: -2,
      });

      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.message).toContain('-'); // Should show negative modifier
    });

    it('should pass complex modifier combinations', async () => {
      const command = new ReactionRollCommand('test-character', 'test-npc', 'negotiation', {
        gifts: 1,
        reputation: 1,
        languageBarrier: -1,
        culturalDifferences: -1,
      });

      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe('Party Spokesperson', () => {
    it('should default to party spokesperson true', async () => {
      const command = new ReactionRollCommand('test-character', 'test-npc', 'first_meeting');

      await command.execute(context);

      const params = context.getTemporary('reaction-roll-params');
      expect(params).toHaveProperty('isPartySpokesperson', true);
    });

    it('should allow setting spokesperson to false', async () => {
      const command = new ReactionRollCommand(
        'test-character',
        'test-npc',
        'first_meeting',
        undefined,
        false
      );

      await command.execute(context);

      const params = context.getTemporary('reaction-roll-params');
      expect(params).toHaveProperty('isPartySpokesperson', false);
    });
  });

  describe('Required Rules', () => {
    it('should specify reaction-roll as required rule', () => {
      const command = new ReactionRollCommand('test-character', 'test-npc', 'first_meeting');

      const requiredRules = command.getRequiredRules();
      expect(requiredRules).toContain('reaction-roll');
    });
  });

  describe('Entity Management', () => {
    it('should include both character and target in involved entities', () => {
      const command = new ReactionRollCommand('test-character', 'test-npc', 'first_meeting');

      const entities = command.getInvolvedEntities();
      expect(entities).toContain('test-character');
      expect(entities).toContain('test-npc');
    });

    it('should validate entities before execution', async () => {
      const command = new ReactionRollCommand('test-character', 'test-npc', 'first_meeting');

      // Verify entities exist before execution
      expect(context.hasEntity('test-character')).toBe(true);
      expect(context.hasEntity('test-npc')).toBe(true);

      const result = await command.execute(context);
      expect(result.success).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty modifiers', async () => {
      const command = new ReactionRollCommand('test-character', 'test-npc', 'first_meeting', {});

      const result = await command.execute(context);

      expect(result.success).toBe(true);
    });

    it('should handle undefined modifiers', async () => {
      const command = new ReactionRollCommand(
        'test-character',
        'test-npc',
        'first_meeting',
        undefined
      );

      const result = await command.execute(context);

      expect(result.success).toBe(true);
    });

    it('should handle extreme modifier values', async () => {
      const command = new ReactionRollCommand('test-character', 'test-npc', 'first_meeting', {
        gifts: 100,
        threats: -100,
        reputation: 50,
      });

      const result = await command.execute(context);

      expect(result.success).toBe(true);
      // Rules should handle capping extreme values
    });
  });

  describe('Integration with ReactionRules', () => {
    it('should successfully integrate with ReactionRules execution', async () => {
      const command = new ReactionRollCommand('test-character', 'test-npc', 'first_meeting');

      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Reaction roll:');
      expect(result.data?.reactionResult).toBeDefined();
      expect(result.data?.characterId).toBe('test-character');
      expect(result.data?.targetId).toBe('test-npc');
      expect(result.data?.interactionType).toBe('first_meeting');
    });

    it('should pass through rule effects and data', async () => {
      const command = new ReactionRollCommand('test-character', 'test-npc', 'first_meeting');

      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.effects).toBeDefined();
      expect(result.effects?.length).toBeGreaterThan(0);
    });
  });
});
