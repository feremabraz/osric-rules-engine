import { GameContext } from '@osric/core/GameContext';
import { type ReactionRollParams, ReactionRules } from '@osric/rules/npc/ReactionRules';
import { COMMAND_TYPES } from '@osric/types/constants';
import type { Character } from '@osric/types/entities';
import { createStore } from 'jotai';
import { beforeEach, describe, expect, it } from 'vitest';

interface ReactionResultData {
  reactionResult: {
    rollResult: number;
    totalModifier: number;
    finalResult: number;
    reaction: string;
    description: string;
    combatLikely: boolean;
    furtherInteractionPossible: boolean;
  };
  characterId: string;
  targetId: string;
  interactionType: string;
}

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
      charismaMaxHenchmen: null,
      charismaLoyaltyBase: null,
      charismaReactionAdj: null,
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

class MockReactionCommand {
  readonly type = COMMAND_TYPES.REACTION_ROLL;
  readonly actorId = 'test-character';
  readonly targetIds: string[] = [];

  async execute(_context: GameContext) {
    return { success: true, message: 'Mock reaction command executed' };
  }

  canExecute(_context: GameContext): boolean {
    return true;
  }

  getRequiredRules(): string[] {
    return ['reaction-roll'];
  }

  getInvolvedEntities(): string[] {
    return [this.actorId, ...this.targetIds];
  }
}

describe('ReactionRules', () => {
  let rule: ReactionRules;
  let context: GameContext;
  let mockCommand: MockReactionCommand;

  beforeEach(() => {
    const store = createStore();
    context = new GameContext(store);
    rule = new ReactionRules();

    const character = createMockCharacter({
      id: 'test-character',
      name: 'Test Hero',
      abilities: { ...createMockCharacter().abilities, charisma: 12 },
    });

    context.setEntity('test-character', character);

    mockCommand = new MockReactionCommand();
  });

  describe('Rule Application', () => {
    it('should apply when command type is REACTION_ROLL and params are provided', () => {
      context.setTemporary('reaction-roll-params', {
        characterId: 'test-character',
        targetId: 'test-npc',
        interactionType: 'first_meeting',
      } as ReactionRollParams);

      expect(rule.canApply(context, mockCommand)).toBe(true);
    });

    it('should not apply when command type is wrong', () => {
      context.setTemporary('reaction-roll-params', {
        characterId: 'test-character',
        targetId: 'test-npc',
        interactionType: 'first_meeting',
      } as ReactionRollParams);

      const wrongCommand = new MockReactionCommand();

      Object.defineProperty(wrongCommand, 'type', { value: 'wrong-type', writable: true });
      expect(rule.canApply(context, wrongCommand)).toBe(false);
    });

    it('should not apply when reaction roll params are missing', () => {
      expect(rule.canApply(context, mockCommand)).toBe(false);
    });
  });

  describe('Basic Reaction Execution', () => {
    it('should execute successfully with valid data', async () => {
      context.setTemporary('reaction-roll-params', {
        characterId: 'test-character',
        targetId: 'test-npc',
        interactionType: 'first_meeting',
      } as ReactionRollParams);

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Reaction roll:');
      expect(result.data).toBeDefined();
      expect(result.data?.reactionResult).toBeDefined();
    });

    it('should handle missing character', async () => {
      context.setTemporary('reaction-roll-params', {
        characterId: 'nonexistent-character',
        targetId: 'test-npc',
        interactionType: 'first_meeting',
      } as ReactionRollParams);

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Character not found');
    });

    it('should handle missing reaction roll data', async () => {
      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('No reaction roll data provided');
    });
  });

  describe('Charisma Modifiers', () => {
    it('should apply negative modifier for low charisma (3)', async () => {
      const lowCharismaCharacter = createMockCharacter({
        id: 'low-charisma',
        abilities: { ...createMockCharacter().abilities, charisma: 3 },
      });
      context.setEntity('low-charisma', lowCharismaCharacter);

      context.setTemporary('reaction-roll-params', {
        characterId: 'low-charisma',
        targetId: 'test-npc',
        interactionType: 'first_meeting',
      } as ReactionRollParams);

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('-3');
    });

    it('should apply positive modifier for high charisma (18)', async () => {
      const highCharismaCharacter = createMockCharacter({
        id: 'high-charisma',
        abilities: { ...createMockCharacter().abilities, charisma: 18 },
      });
      context.setEntity('high-charisma', highCharismaCharacter);

      context.setTemporary('reaction-roll-params', {
        characterId: 'high-charisma',
        targetId: 'test-npc',
        interactionType: 'first_meeting',
      } as ReactionRollParams);

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('+3');
    });

    it('should apply no modifier for average charisma (10)', async () => {
      const averageCharismaCharacter = createMockCharacter({
        id: 'average-charisma',
        abilities: { ...createMockCharacter().abilities, charisma: 10 },
      });
      context.setEntity('average-charisma', averageCharismaCharacter);

      context.setTemporary('reaction-roll-params', {
        characterId: 'average-charisma',
        targetId: 'test-npc',
        interactionType: 'first_meeting',
      } as ReactionRollParams);

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('+0');
    });
  });

  describe('Situational Modifiers', () => {
    it('should apply positive modifiers for gifts', async () => {
      context.setTemporary('reaction-roll-params', {
        characterId: 'test-character',
        targetId: 'test-npc',
        interactionType: 'negotiation',
        modifiers: {
          gifts: 2,
        },
      } as ReactionRollParams);

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('+2');
    });

    it('should apply negative modifiers for threats', async () => {
      context.setTemporary('reaction-roll-params', {
        characterId: 'test-character',
        targetId: 'test-npc',
        interactionType: 'intimidation',
        modifiers: {
          threats: -2,
        },
      } as ReactionRollParams);

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('-2');
    });

    it('should handle reputation modifiers', async () => {
      context.setTemporary('reaction-roll-params', {
        characterId: 'test-character',
        targetId: 'test-npc',
        interactionType: 'first_meeting',
        modifiers: {
          reputation: 1,
        },
      } as ReactionRollParams);

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('+1');
    });

    it('should handle language barrier penalties', async () => {
      context.setTemporary('reaction-roll-params', {
        characterId: 'test-character',
        targetId: 'test-npc',
        interactionType: 'first_meeting',
        modifiers: {
          languageBarrier: -1,
        },
      } as ReactionRollParams);

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('-1');
    });

    it('should combine multiple modifiers correctly', async () => {
      const highCharismaCharacter = createMockCharacter({
        id: 'combo-test',
        abilities: { ...createMockCharacter().abilities, charisma: 16 },
      });
      context.setEntity('combo-test', highCharismaCharacter);

      context.setTemporary('reaction-roll-params', {
        characterId: 'combo-test',
        targetId: 'test-npc',
        interactionType: 'negotiation',
        modifiers: {
          gifts: 1,
          reputation: 1,
          languageBarrier: -1,
        },
      } as ReactionRollParams);

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);

      expect(result.message).toContain('+2');
    });
  });

  describe('Reaction Categories', () => {
    it('should return reaction result with proper structure', async () => {
      context.setTemporary('reaction-roll-params', {
        characterId: 'test-character',
        targetId: 'test-npc',
        interactionType: 'first_meeting',
      } as ReactionRollParams);

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.reactionResult).toBeDefined();

      const reactionResult = result.data?.reactionResult;
      expect(reactionResult).toHaveProperty('rollResult');
      expect(reactionResult).toHaveProperty('totalModifier');
      expect(reactionResult).toHaveProperty('finalResult');
      expect(reactionResult).toHaveProperty('reaction');
      expect(reactionResult).toHaveProperty('description');
      expect(reactionResult).toHaveProperty('combatLikely');
      expect(reactionResult).toHaveProperty('furtherInteractionPossible');
    });

    it('should have valid reaction category', async () => {
      context.setTemporary('reaction-roll-params', {
        characterId: 'test-character',
        targetId: 'test-npc',
        interactionType: 'first_meeting',
      } as ReactionRollParams);

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      const reactionData = result.data as unknown as ReactionResultData;
      const reaction = reactionData?.reactionResult?.reaction;
      expect(['hostile', 'unfriendly', 'neutral', 'friendly', 'enthusiastic']).toContain(reaction);
    });

    it('should set combat likely for intimidation with unfriendly results', async () => {
      const lowCharismaCharacter = createMockCharacter({
        id: 'intimidator',
        abilities: { ...createMockCharacter().abilities, charisma: 3 },
      });
      context.setEntity('intimidator', lowCharismaCharacter);

      context.setTemporary('reaction-roll-params', {
        characterId: 'intimidator',
        targetId: 'test-npc',
        interactionType: 'intimidation',
        modifiers: {
          threats: -3,
        },
      } as ReactionRollParams);

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);

      const reactionData = result.data as unknown as ReactionResultData;
      expect(reactionData?.reactionResult?.combatLikely).toBeDefined();
      expect(typeof reactionData?.reactionResult?.combatLikely).toBe('boolean');
    });
  });

  describe('Interaction Types', () => {
    const interactionTypes: ReactionRollParams['interactionType'][] = [
      'first_meeting',
      'negotiation',
      'intimidation',
      'persuasion',
      'bribery',
    ];

    for (const interactionType of interactionTypes) {
      it(`should handle ${interactionType} interaction type`, async () => {
        context.setTemporary('reaction-roll-params', {
          characterId: 'test-character',
          targetId: 'test-npc',
          interactionType,
        } as ReactionRollParams);

        const result = await rule.execute(context, mockCommand);

        expect(result.success).toBe(true);
        expect(result.data?.interactionType).toBe(interactionType);
      });
    }
  });

  describe('Edge Cases', () => {
    it('should handle extreme charisma values', async () => {
      const extremeCharacter = createMockCharacter({
        id: 'extreme-charisma',
        abilities: { ...createMockCharacter().abilities, charisma: 25 },
      });
      context.setEntity('extreme-charisma', extremeCharacter);

      context.setTemporary('reaction-roll-params', {
        characterId: 'extreme-charisma',
        targetId: 'test-npc',
        interactionType: 'first_meeting',
      } as ReactionRollParams);

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);

      expect(result.message).toContain('+3');
    });

    it('should handle extreme modifier values', async () => {
      context.setTemporary('reaction-roll-params', {
        characterId: 'test-character',
        targetId: 'test-npc',
        interactionType: 'first_meeting',
        modifiers: {
          gifts: 10,
          threats: -10,
        },
      } as ReactionRollParams);

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);

      expect(result.data?.reactionResult).toBeDefined();
    });

    it('should store last reaction result for follow-up interactions', async () => {
      context.setTemporary('reaction-roll-params', {
        characterId: 'test-character',
        targetId: 'test-npc',
        interactionType: 'first_meeting',
      } as ReactionRollParams);

      await rule.execute(context, mockCommand);

      const lastResult = context.getTemporary('last-reaction-result');
      expect(lastResult).toBeDefined();
    });
  });

  describe('OSRIC Compliance', () => {
    it('should use 2d6 for reaction rolls (result range 2-12)', async () => {
      context.setTemporary('reaction-roll-params', {
        characterId: 'test-character',
        targetId: 'test-npc',
        interactionType: 'first_meeting',
      } as ReactionRollParams);

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      const reactionData = result.data as unknown as ReactionResultData;
      const rollResult = reactionData?.reactionResult?.rollResult;
      expect(rollResult).toBeGreaterThanOrEqual(2);
      expect(rollResult).toBeLessThanOrEqual(12);
    });

    it('should follow OSRIC reaction table ranges', async () => {
      for (let i = 0; i < 10; i++) {
        context.setTemporary('reaction-roll-params', {
          characterId: 'test-character',
          targetId: 'test-npc',
          interactionType: 'first_meeting',
        } as ReactionRollParams);

        const result = await rule.execute(context, mockCommand);

        expect(result.success).toBe(true);
        const reactionData = result.data as unknown as ReactionResultData;
        const finalResult = reactionData?.reactionResult?.finalResult;
        const reaction = reactionData?.reactionResult?.reaction;

        if (finalResult <= 2) {
          expect(reaction).toBe('hostile');
        } else if (finalResult <= 5) {
          expect(reaction).toBe('unfriendly');
        } else if (finalResult <= 8) {
          expect(reaction).toBe('neutral');
        } else if (finalResult <= 11) {
          expect(reaction).toBe('friendly');
        } else {
          expect(reaction).toBe('enthusiastic');
        }
      }
    });
  });
});
