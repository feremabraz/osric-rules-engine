import type { Command } from '@osric/core/Command';
import { GameContext } from '@osric/core/GameContext';
import { type VisibilityResult, VisibilityRules } from '@osric/rules/exploration/VisibilityRules';
import { COMMAND_TYPES } from '@osric/types/constants';
import type { Character } from '@osric/types/entities';
import { createStore } from 'jotai';
import { beforeEach, describe, expect, it } from 'vitest';

interface VisibilityRuleResult {
  result: VisibilityResult;
}

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

    ...overrides,
  };

  return defaultCharacter;
}

describe('VisibilityRules', () => {
  let rule: VisibilityRules;
  let context: GameContext;
  let mockCommand: Command;

  beforeEach(() => {
    const store = createStore();
    context = new GameContext(store);
    rule = new VisibilityRules();

    const character = createMockCharacter({ id: 'test-character' });
    context.setEntity('test-character', character);

    context.setTemporary('visibility-check-params', {
      observerId: 'test-character',
      targetId: undefined,
      activityType: 'general',
      conditions: {
        lightLevel: { type: 'normal-light' },
      },
      distance: 100,
    });

    mockCommand = {
      type: COMMAND_TYPES.SEARCH,
      actorId: 'test-character',
      targetIds: [],
      async execute() {
        return { success: true, message: 'Mock' };
      },
      canExecute: () => true,
      getRequiredRules: () => ['visibility-rules'],
      getInvolvedEntities: () => ['test-character'],
    } as Command;
  });

  describe('canApply', () => {
    it('should apply when visibility parameters are present', () => {
      expect(rule.canApply(context, mockCommand)).toBe(true);
    });

    it('should not apply without context data', () => {
      context.setTemporary('visibility-check-params', null);
      expect(rule.canApply(context, mockCommand)).toBe(false);
    });
  });

  describe('execute - Success Scenarios', () => {
    it('should execute successfully with valid data', async () => {
      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
      expect(result.data).toBeDefined();

      if (result.data) {
        const data = result.data as unknown as VisibilityRuleResult;
        expect(data.result).toBeDefined();
        expect(data.result.canSee).toBeDefined();
        expect(data.result.effectiveRange).toBeDefined();
      }
    });

    it('should handle daylight visibility check', async () => {
      context.setTemporary('visibility-check-params', {
        observerId: 'test-character',
        targetId: undefined,
        activityType: 'general',
        conditions: {
          lightLevel: { type: 'normal-light' },
        },
        distance: 1000,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      if (result.data) {
        const data = result.data as unknown as VisibilityRuleResult;
        expect(data.result.canSee).toBe(true);
        expect(data.result.effectiveRange).toBe(6000);
      }
      expect(result.message).toContain('Test Character');
    });

    it('should handle bright light conditions', async () => {
      context.setTemporary('visibility-check-params', {
        observerId: 'test-character',
        targetId: undefined,
        activityType: 'general',
        conditions: {
          lightLevel: { type: 'bright-light' },
        },
        distance: 5000,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      if (result.data) {
        const data = result.data as unknown as VisibilityRuleResult;
        expect(data.result.canSee).toBe(true);
        expect(data.result.effectiveRange).toBe(12000);
        expect(data.result.lightingBonus).toBe(5);
      }
    });

    it('should handle elevation bonus calculation', async () => {
      context.setTemporary('visibility-check-params', {
        observerId: 'test-character',
        targetId: undefined,
        activityType: 'general',
        conditions: {
          lightLevel: { type: 'normal-light' },
          elevation: {
            observerHeight: 100,
            targetHeight: 0,
          },
        },
        distance: 8000,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      if (result.data) {
        const data = result.data as unknown as VisibilityRuleResult;
        expect(data.result.canSee).toBe(true);
        expect(data.result.effectiveRange).toBeGreaterThan(6000);
      }
    });
  });

  describe('execute - Error Scenarios', () => {
    it('should handle missing context data', async () => {
      context.setTemporary('visibility-check-params', null);

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('No visibility check parameters found');
    });

    it('should handle missing observer', async () => {
      context.setTemporary('visibility-check-params', {
        observerId: 'nonexistent',
        targetId: undefined,
        activityType: 'general',
        conditions: { lightLevel: { type: 'normal-light' } },
        distance: 100,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Observer not found');
    });

    it('should handle darkness limiting visibility', async () => {
      context.setTemporary('visibility-check-params', {
        observerId: 'test-character',
        targetId: undefined,
        activityType: 'general',
        conditions: {
          lightLevel: { type: 'darkness' },
        },
        distance: 200,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      if (result.data) {
        const data = result.data as unknown as VisibilityRuleResult;
        expect(data.result.canSee).toBe(false);
        expect(data.result.effectiveRange).toBe(60);
        expect(data.result.penalties.attack).toBe(-4);
      }
    });

    it('should handle magical darkness blocking all vision', async () => {
      context.setTemporary('visibility-check-params', {
        observerId: 'test-character',
        targetId: undefined,
        activityType: 'general',
        conditions: {
          lightLevel: { type: 'magical-darkness' },
        },
        distance: 50,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      if (result.data) {
        const data = result.data as unknown as VisibilityRuleResult;
        expect(data.result.canSee).toBe(false);
        expect(data.result.effectiveRange).toBe(0);
        expect(data.result.detectionChance).toBe(5);
      }
    });

    it('should handle weather reducing visibility', async () => {
      context.setTemporary('visibility-check-params', {
        observerId: 'test-character',
        targetId: undefined,
        activityType: 'general',
        conditions: {
          lightLevel: { type: 'normal-light' },
          weather: {
            type: 'heavy-fog',
            visibilityReduction: 300,
          },
        },
        distance: 500,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      if (result.data) {
        const data = result.data as unknown as VisibilityRuleResult;
        expect(data.result.canSee).toBe(false);
        expect(data.result.effectiveRange).toBe(300);
      }
    });
  });

  describe('OSRIC Compliance', () => {
    it('should implement authentic OSRIC/AD&D 1st Edition mechanics', async () => {
      const osricCharacter = createMockCharacter({
        level: 3,
        class: 'Fighter',
        abilities: {
          strength: 16,
          dexterity: 12,
          constitution: 14,
          intelligence: 10,
          wisdom: 16,
          charisma: 10,
        },
      });
      context.setEntity('osric-character', osricCharacter);

      context.setTemporary('visibility-check-params', {
        observerId: 'osric-character',
        targetId: undefined,
        activityType: 'searching',
        conditions: {
          lightLevel: { type: 'dim-light' },
          terrain: {
            type: 'forest',
            baseVisibility: 300,
          },
        },
        distance: 150,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      if (result.data) {
        const data = result.data as unknown as VisibilityRuleResult;

        expect(data.result.penalties.search).toBe(-2);
        expect(data.result.lightingBonus).toBe(-5);

        expect(data.result.detectionChance).toBe(64);

        expect(data.result.effectiveRange).toBe(300);
        expect(data.result.canSee).toBe(true);
      }
    });

    it('should handle torch light mechanics correctly', async () => {
      context.setTemporary('visibility-check-params', {
        observerId: 'test-character',
        targetId: undefined,
        activityType: 'general',
        conditions: {
          lightLevel: {
            type: 'normal-light',
            source: 'torch',
            radius: 30,
            duration: 6,
          },
        },
        distance: 25,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      if (result.data) {
        const data = result.data as unknown as VisibilityRuleResult;
        expect(data.result.canSee).toBe(true);
        expect(data.result.effectiveRange).toBe(6000);
      }
    });

    it('should apply elevation bonuses per OSRIC rules', async () => {
      context.setTemporary('visibility-check-params', {
        observerId: 'test-character',
        targetId: undefined,
        activityType: 'general',
        conditions: {
          lightLevel: { type: 'normal-light' },
          elevation: {
            observerHeight: 50,
            targetHeight: 0,
          },
        },
        distance: 8000,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      if (result.data) {
        const data = result.data as unknown as VisibilityRuleResult;

        expect(data.result.effectiveRange).toBe(32400);
        expect(data.result.canSee).toBe(true);
      }
    });
  });
});
