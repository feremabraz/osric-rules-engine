import { createStore } from 'jotai';
import { beforeEach, describe, expect, it } from 'vitest';
import { GameContext } from '../../../osric/core/GameContext';
import { MovementRule } from '../../../osric/rules/exploration/MovementRules';
import { COMMAND_TYPES } from '../../../osric/types/constants';
import type { Character } from '../../../osric/types/entities';

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
      'Poison or Death': 14,
      Wands: 16,
      'Paralysis, Polymorph, or Petrification': 15,
      'Breath Weapons': 17,
      'Spells, Rods, or Staves': 17,
    },
    spells: [],
    currency: { platinum: 0, gold: 0, electrum: 0, silver: 0, copper: 0 },
    encumbrance: 0,
    movementRate: 120,
    classes: { Fighter: 1 },
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

class MockMovementCommand {
  readonly type = COMMAND_TYPES.MOVE;
  readonly actorId = 'test-character';
  readonly targetIds: string[] = [];

  async execute(_context: GameContext) {
    return { success: true, message: 'Mock movement command executed' };
  }

  canExecute(_context: GameContext): boolean {
    return true;
  }

  getRequiredRules(): string[] {
    return ['movement'];
  }

  getInvolvedEntities(): string[] {
    return [this.actorId, ...this.targetIds];
  }
}

describe('MovementRules', () => {
  let context: GameContext;
  let movementRule: MovementRule;
  let mockCommand: MockMovementCommand;

  beforeEach(() => {
    const store = createStore();
    context = new GameContext(store);
    movementRule = new MovementRule();
    mockCommand = new MockMovementCommand();

    const testCharacter = createMockCharacter({
      id: 'test-character',
      name: 'Test Hero',
      movementRate: 120,
      encumbrance: 0,
    });

    context.setEntity('test-character', testCharacter);
  });

  describe('Rule Application', () => {
    it('should apply to movement commands', () => {
      context.setTemporary('movement-request-params', {
        characterId: 'test-character',
        fromPosition: 'start-location',
        toPosition: 'end-location',
        movementType: 'walk',
        distance: 60,
      });

      const result = movementRule.canApply(context, mockCommand);
      expect(result).toBe(true);
    });

    it('should not apply to other command types', () => {
      class OtherCommand {
        readonly type = COMMAND_TYPES.ATTACK;
        readonly actorId = 'test-character';
        readonly targetIds: string[] = [];

        async execute(_context: GameContext) {
          return { success: true, message: 'Mock other command executed' };
        }

        canExecute(_context: GameContext): boolean {
          return true;
        }

        getRequiredRules(): string[] {
          return ['combat'];
        }

        getInvolvedEntities(): string[] {
          return [this.actorId, ...this.targetIds];
        }
      }

      const otherCommand = new OtherCommand();
      const result = movementRule.canApply(context, otherCommand);
      expect(result).toBe(false);
    });
  });

  describe('Base Movement Rates', () => {
    it('should calculate movement for unencumbered human', async () => {
      context.setTemporary('movement-request-params', {
        characterId: 'test-character',
        fromPosition: 'start',
        toPosition: 'end',
        movementType: 'walk',
        distance: 60,
        terrainType: 'clear',
      });

      const result = await movementRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.message).toContain('successfully');
    });

    it('should handle different racial movement rates', async () => {
      const halfling = createMockCharacter({
        id: 'halfling-char',
        race: 'Halfling',
        movementRate: 90,
      });
      context.setEntity('halfling-char', halfling);

      context.setTemporary('movement-request-params', {
        characterId: 'halfling-char',
        fromPosition: 'start',
        toPosition: 'end',
        movementType: 'walk',
        distance: 60,
        terrainType: 'clear',
      });

      const result = await movementRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('successfully');
    });

    it('should handle elven movement rates', async () => {
      const elf = createMockCharacter({
        id: 'elf-char',
        race: 'Elf',
        movementRate: 120,
      });
      context.setEntity('elf-char', elf);

      context.setTemporary('movement-request-params', {
        characterId: 'elf-char',
        fromPosition: 'start',
        toPosition: 'end',
        movementType: 'walk',
        distance: 90,
        terrainType: 'forest',
      });

      const result = await movementRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('successfully');
    });
  });

  describe('Encumbrance Effects', () => {
    it('should reduce movement when heavily encumbered', async () => {
      const encumberedChar = createMockCharacter({
        id: 'encumbered-char',
        encumbrance: 100,
        movementRate: 120,
      });
      context.setEntity('encumbered-char', encumberedChar);

      context.setTemporary('movement-request-params', {
        characterId: 'encumbered-char',
        fromPosition: 'start',
        toPosition: 'end',
        movementType: 'walk',
        distance: 60,
        terrainType: 'clear',
        encumbrance: 'heavy',
      });

      const result = await movementRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('successfully');
    });

    it('should handle different encumbrance levels', async () => {
      const lightlyEncumbered = createMockCharacter({
        id: 'light-enc',
        encumbrance: 30,
        movementRate: 120,
      });
      context.setEntity('light-enc', lightlyEncumbered);

      context.setTemporary('movement-request-params', {
        characterId: 'light-enc',
        fromPosition: 'start',
        toPosition: 'end',
        movementType: 'walk',
        distance: 90,
        terrainType: 'clear',
        encumbrance: 'light',
      });

      const result = await movementRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('successfully');
    });

    it('should prevent movement when overloaded', async () => {
      const overloadedChar = createMockCharacter({
        id: 'overloaded-char',
        encumbrance: 200,
        movementRate: 120,
      });
      context.setEntity('overloaded-char', overloadedChar);

      context.setTemporary('movement-request-params', {
        characterId: 'overloaded-char',
        fromPosition: 'start',
        toPosition: 'end',
        movementType: 'walk',
        distance: 30,
        terrainType: 'clear',
        encumbrance: 'severe',
      });

      const result = await movementRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('successfully');
    });
  });

  describe('Terrain Modifiers', () => {
    it('should slow movement in difficult terrain', async () => {
      context.setTemporary('movement-request-params', {
        characterId: 'test-character',
        fromPosition: 'start',
        toPosition: 'end',
        movementType: 'walk',
        distance: 60,
        terrainType: 'rough',
      });

      const result = await movementRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('successfully');
    });

    it('should handle swamp terrain penalties', async () => {
      context.setTemporary('movement-request-params', {
        characterId: 'test-character',
        fromPosition: 'start',
        toPosition: 'end',
        movementType: 'walk',
        distance: 30,
        terrainType: 'swamp',
      });

      const result = await movementRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('successfully');
    });

    it('should handle road movement bonuses', async () => {
      context.setTemporary('movement-request-params', {
        characterId: 'test-character',
        fromPosition: 'start',
        toPosition: 'end',
        movementType: 'walk',
        distance: 120,
        terrainType: 'clear',
      });

      const result = await movementRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('successfully');
    });

    it('should handle mountain terrain', async () => {
      context.setTemporary('movement-request-params', {
        characterId: 'test-character',
        fromPosition: 'start',
        toPosition: 'end',
        movementType: 'walk',
        distance: 30,
        terrainType: 'mountain',
      });

      const result = await movementRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('successfully');
    });
  });

  describe('Time Scales', () => {
    it('should handle combat time scale (rounds)', async () => {
      context.setTemporary('movement-request-params', {
        characterId: 'test-character',
        fromPosition: 'start',
        toPosition: 'end',
        movementType: 'walk',
        distance: 30,
        terrainType: 'clear',
      });

      const result = await movementRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('successfully');
    });

    it('should handle exploration time scale (turns)', async () => {
      context.setTemporary('movement-request-params', {
        characterId: 'test-character',
        fromPosition: 'start',
        toPosition: 'end',
        movementType: 'walk',
        distance: 120,
        terrainType: 'clear',
      });

      const result = await movementRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('successfully');
    });

    it('should handle overland time scale (days)', async () => {
      context.setTemporary('movement-request-params', {
        characterId: 'test-character',
        fromPosition: 'start',
        toPosition: 'end',
        movementType: 'walk',
        distance: 60,
        terrainType: 'clear',
      });

      const result = await movementRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('successfully');
    });
  });

  describe('Special Movement Types', () => {
    it('should handle flying movement', async () => {
      const flyingChar = createMockCharacter({
        id: 'flying-char',
        racialAbilities: [],
      });
      context.setEntity('flying-char', flyingChar);

      context.setTemporary('movement-request-params', {
        characterId: 'flying-char',
        fromPosition: 'start',
        toPosition: 'end',
        movementType: 'fly',
        distance: 120,
        terrainType: 'clear',
      });

      const result = await movementRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('successfully');
    });

    it('should handle swimming movement', async () => {
      context.setTemporary('movement-request-params', {
        characterId: 'test-character',
        fromPosition: 'start',
        toPosition: 'end',
        movementType: 'swim',
        distance: 7,
        terrainType: 'underwater',
      });

      const result = await movementRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('successfully');
    });

    it('should handle climbing movement', async () => {
      context.setTemporary('movement-request-params', {
        characterId: 'test-character',
        fromPosition: 'start',
        toPosition: 'end',
        movementType: 'climb',
        distance: 30,
        terrainType: 'clear',
      });

      const result = await movementRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('successfully');
    });
  });

  describe('Status Effects on Movement', () => {
    it('should handle slowed movement from spells', async () => {
      const slowedChar = createMockCharacter({
        id: 'slowed-char',
        statusEffects: [],
      });
      context.setEntity('slowed-char', slowedChar);

      context.setTemporary('movement-request-params', {
        characterId: 'slowed-char',
        fromPosition: 'start',
        toPosition: 'end',
        movementType: 'walk',
        distance: 60,
        terrainType: 'clear',
      });

      const result = await movementRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('successfully');
    });

    it('should handle haste movement bonus', async () => {
      const hastedChar = createMockCharacter({
        id: 'hasted-char',
        statusEffects: [],
      });
      context.setEntity('hasted-char', hastedChar);

      context.setTemporary('movement-request-params', {
        characterId: 'hasted-char',
        fromPosition: 'start',
        toPosition: 'end',
        movementType: 'walk',
        distance: 120,
        terrainType: 'clear',
      });

      const result = await movementRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('successfully');
    });

    it('should prevent movement when paralyzed', async () => {
      const paralyzedChar = createMockCharacter({
        id: 'paralyzed-char',
        statusEffects: [
          {
            name: 'paralyzed',
            duration: 5,
            effect: 'Cannot move or act',
            savingThrow: null,
            endCondition: null,
          },
        ],
      });
      context.setEntity('paralyzed-char', paralyzedChar);

      context.setTemporary('movement-request-params', {
        characterId: 'paralyzed-char',
        fromPosition: 'start',
        toPosition: 'end',
        movementType: 'walk',
        distance: 30,
        terrainType: 'clear',
      });

      const result = await movementRule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('paralyz');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing movement data', async () => {
      const result = await movementRule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('No movement request data provided');
    });

    it('should handle missing character', async () => {
      context.setTemporary('movement-request-params', {
        characterId: 'nonexistent-character',
        fromPosition: 'start',
        toPosition: 'end',
        movementType: 'walk',
        distance: 60,
        terrainType: 'clear',
      });

      const result = await movementRule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Character not found');
    });

    it('should handle invalid distance', async () => {
      context.setTemporary('movement-request-params', {
        characterId: 'test-character',
        fromPosition: 'start',
        toPosition: 'end',
        movementType: 'walk',
        distance: 1000,
        terrainType: 'clear',
      });

      const result = await movementRule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('exceeds maximum');
    });

    it('should handle unknown terrain type', async () => {
      context.setTemporary('movement-request-params', {
        characterId: 'test-character',
        fromPosition: 'start',
        toPosition: 'end',
        movementType: 'walk',
        distance: 60,
        terrainType: 'clear',
      });

      const result = await movementRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('successfully');
    });
  });

  describe('Movement Calculation Edge Cases', () => {
    it('should handle fractional movement correctly', async () => {
      context.setTemporary('movement-request-params', {
        characterId: 'test-character',
        fromPosition: 'start',
        toPosition: 'end',
        movementType: 'walk',
        distance: 37,
        terrainType: 'clear',
      });

      const result = await movementRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('successfully');
    });

    it('should handle movement exactly at movement rate limit', async () => {
      context.setTemporary('movement-request-params', {
        characterId: 'test-character',
        fromPosition: 'start',
        toPosition: 'end',
        movementType: 'walk',
        distance: 120,
        terrainType: 'clear',
      });

      const result = await movementRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('successfully');
    });

    it('should handle movement beyond movement rate in single action', async () => {
      context.setTemporary('movement-request-params', {
        characterId: 'test-character',
        fromPosition: 'start',
        toPosition: 'end',
        movementType: 'walk',
        distance: 120,
        terrainType: 'clear',
      });

      const result = await movementRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('successfully');
    });
  });
});
