import { createStore } from 'jotai';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Command } from '../../../osric/core/Command';
import { GameContext } from '../../../osric/core/GameContext';
import { LoyaltyRules } from '../../../osric/rules/npc/LoyaltyRules';
import { COMMAND_TYPES } from '../../../osric/types/constants';
import type { Character } from '../../../osric/types/entities';

class MockLoyaltyCommand implements Command {
  readonly type = COMMAND_TYPES.LOYALTY_CHECK;

  constructor(
    public readonly characterId: string,
    public readonly leaderId?: string,
    public readonly trigger:
      | 'initial_hire'
      | 'combat_casualties'
      | 'dangerous_mission'
      | 'treasure_share'
      | 'leader_behavior'
      | 'periodic_check'
      | 'other' = 'periodic_check',
    public readonly situationalModifiers?: {
      leadershipBonus?: number;
      generousPayment?: boolean;
      harshTreatment?: boolean;
      sharedDanger?: boolean;
      successfulMissions?: number;
      failedMissions?: number;
      treasureBonus?: number;
      magicalInfluence?: number;
      customModifiers?: Record<string, number>;
    }
  ) {}

  async execute(
    _context: GameContext
  ): Promise<import('../../../osric/core/Command').CommandResult> {
    throw new Error('Mock command execute not implemented');
  }

  canExecute(_context: GameContext): boolean {
    return true;
  }

  getRequiredRules(): string[] {
    return ['loyalty-check'];
  }

  getInvolvedEntities(): string[] {
    return this.leaderId ? [this.characterId, this.leaderId] : [this.characterId];
  }
}

describe('OSRIC Loyalty Rules', () => {
  let loyaltyRules: LoyaltyRules;
  let context: GameContext;

  const mockFollower: Partial<Character> & {
    id: string;
    name: string;
    abilities: Character['abilities'];
    level: number;
    abilityModifiers: Character['abilityModifiers'];
  } = {
    id: 'follower1',
    name: 'Test Follower',
    abilities: {
      charisma: 12,
      strength: 14,
      dexterity: 13,
      constitution: 15,
      intelligence: 11,
      wisdom: 12,
    },
    level: 3,
    hitPoints: { current: 20, maximum: 20 },
    armorClass: 15,
    thac0: 18,
    experience: { current: 5000, requiredForNextLevel: 8000, level: 3 },
    alignment: 'True Neutral',
    inventory: [],
    position: 'dungeon',
    statusEffects: [],
    race: 'Human',
    class: 'Fighter',
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
  };

  const mockLeaderHighCharisma: Partial<Character> & {
    id: string;
    name: string;
    abilities: Character['abilities'];
    level: number;
    abilityModifiers: Character['abilityModifiers'];
  } = {
    id: 'leader1',
    name: 'Charismatic Leader',
    abilities: {
      charisma: 18,
      strength: 16,
      dexterity: 12,
      constitution: 14,
      intelligence: 15,
      wisdom: 13,
    },
    level: 8,
    hitPoints: { current: 45, maximum: 45 },
    armorClass: 17,
    thac0: 14,
    experience: { current: 125000, requiredForNextLevel: 250000, level: 8 },
    alignment: 'Lawful Good',
    inventory: [],
    position: 'town',
    statusEffects: [],
    race: 'Human',
    class: 'Paladin',
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
  };

  const mockLeaderLowCharisma: Partial<Character> & {
    id: string;
    name: string;
    abilities: Character['abilities'];
    level: number;
    abilityModifiers: Character['abilityModifiers'];
  } = {
    id: 'leader2',
    name: 'Poor Leader',
    abilities: {
      charisma: 6,
      strength: 15,
      dexterity: 11,
      constitution: 13,
      intelligence: 12,
      wisdom: 14,
    },
    level: 5,
    hitPoints: { current: 30, maximum: 30 },
    armorClass: 16,
    thac0: 16,
    experience: { current: 16000, requiredForNextLevel: 32000, level: 5 },
    alignment: 'Chaotic Neutral',
    inventory: [],
    position: 'wilderness',
    statusEffects: [],
    race: 'Human',
    class: 'Fighter',
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
  };

  beforeEach(() => {
    loyaltyRules = new LoyaltyRules();
    context = new GameContext(createStore());

    context.setEntity(mockFollower.id, mockFollower as Character);
    context.setEntity(mockLeaderHighCharisma.id, mockLeaderHighCharisma as Character);
    context.setEntity(mockLeaderLowCharisma.id, mockLeaderLowCharisma as Character);
  });

  describe('Rule Application', () => {
    it('should apply to loyalty check commands', () => {
      const command = new MockLoyaltyCommand('follower1', 'leader1', 'initial_hire');

      expect(loyaltyRules.canApply(context, command)).toBe(true);
    });

    it('should not apply to non-loyalty commands', () => {
      const command = {
        type: 'OTHER_COMMAND',
        characterId: 'follower1',
        execute: async () => ({ success: false, message: 'mock' }),
        canExecute: () => false,
        getRequiredRules: () => [],
        getInvolvedEntities: () => ['follower1'],
      };

      expect(loyaltyRules.canApply(context, command)).toBe(false);
    });

    it('should have correct priority', () => {
      expect(loyaltyRules.priority).toBe(150);
    });

    it('should have correct rule name', () => {
      expect(loyaltyRules.name).toBe('loyalty-check');
    });
  });

  describe('Basic Loyalty Checks', () => {
    it('should perform initial hiring loyalty check', async () => {
      const command = new MockLoyaltyCommand('follower1', 'leader1', 'initial_hire');

      const result = await loyaltyRules.execute(context, command);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.loyaltyCheck).toBeDefined();
      expect(result.data?.rollResult).toBeGreaterThanOrEqual(1);
      expect(result.data?.rollResult).toBeLessThanOrEqual(100);
      expect(result.data?.baseValue).toBe(99);
    });

    it('should handle follower without leader', async () => {
      const command = new MockLoyaltyCommand('follower1', undefined, 'periodic_check');

      const result = await loyaltyRules.execute(context, command);

      expect(result.success).toBe(true);
      expect(result.data?.baseValue).toBe(70);
    });

    it('should calculate different base loyalty from leader Charisma', async () => {
      const command = new MockLoyaltyCommand('follower1', 'leader2', 'initial_hire');

      const result = await loyaltyRules.execute(context, command);

      expect(result.success).toBe(true);
      expect(result.data?.baseValue).toBe(40);
    });
  });

  describe('Trigger Types', () => {
    it('should handle combat casualties trigger with penalty', async () => {
      const command = new MockLoyaltyCommand('follower1', 'leader1', 'combat_casualties');

      const result = await loyaltyRules.execute(context, command);

      expect(result.success).toBe(true);
      expect(result.data?.totalModifier).toBe(-10);
      expect(result.data?.finalValue).toBe(89);
    });

    it('should handle dangerous mission trigger', async () => {
      const command = new MockLoyaltyCommand('follower1', 'leader1', 'dangerous_mission');

      const result = await loyaltyRules.execute(context, command);

      expect(result.success).toBe(true);
      expect(result.data?.totalModifier).toBe(-5);
    });

    it('should handle treasure share trigger with bonus', async () => {
      const command = new MockLoyaltyCommand('follower1', 'leader1', 'treasure_share');

      const result = await loyaltyRules.execute(context, command);

      expect(result.success).toBe(true);
      expect(result.data?.totalModifier).toBe(5);
    });
  });

  describe('Situational Modifiers', () => {
    it('should apply generous payment bonus', async () => {
      const command = new MockLoyaltyCommand('follower1', 'leader1', 'periodic_check', {
        generousPayment: true,
      });

      const result = await loyaltyRules.execute(context, command);

      expect(result.success).toBe(true);
      expect(result.data?.totalModifier).toBe(10);
      expect(result.data?.modifiers).toContain('Generous payment: +10');
    });

    it('should apply harsh treatment penalty', async () => {
      const command = new MockLoyaltyCommand('follower1', 'leader1', 'periodic_check', {
        harshTreatment: true,
      });

      const result = await loyaltyRules.execute(context, command);

      expect(result.success).toBe(true);
      expect(result.data?.totalModifier).toBe(-15);
    });

    it('should apply shared danger bonus', async () => {
      const command = new MockLoyaltyCommand('follower1', 'leader1', 'periodic_check', {
        sharedDanger: true,
      });

      const result = await loyaltyRules.execute(context, command);

      expect(result.success).toBe(true);
      expect(result.data?.totalModifier).toBe(5);
    });

    it('should accumulate successful mission bonuses', async () => {
      const command = new MockLoyaltyCommand('follower1', 'leader1', 'periodic_check', {
        successfulMissions: 4,
      });

      const result = await loyaltyRules.execute(context, command);

      expect(result.success).toBe(true);
      expect(result.data?.totalModifier).toBe(12);
    });

    it('should cap successful mission bonus at 15', async () => {
      const command = new MockLoyaltyCommand('follower1', 'leader1', 'periodic_check', {
        successfulMissions: 10,
      });

      const result = await loyaltyRules.execute(context, command);

      expect(result.success).toBe(true);
      expect(result.data?.totalModifier).toBe(15);
    });

    it('should apply failed mission penalties', async () => {
      const command = new MockLoyaltyCommand('follower1', 'leader1', 'periodic_check', {
        failedMissions: 3,
      });

      const result = await loyaltyRules.execute(context, command);

      expect(result.success).toBe(true);
      expect(result.data?.totalModifier).toBe(-9);
    });

    it('should apply treasure bonus modifiers', async () => {
      const command = new MockLoyaltyCommand('follower1', 'leader1', 'periodic_check', {
        treasureBonus: 150,
      });

      const result = await loyaltyRules.execute(context, command);

      expect(result.success).toBe(true);
      expect(result.data?.totalModifier).toBe(10);
    });

    it('should apply minor treasure bonus for smaller amounts', async () => {
      const command = new MockLoyaltyCommand('follower1', 'leader1', 'periodic_check', {
        treasureBonus: 50,
      });

      const result = await loyaltyRules.execute(context, command);

      expect(result.success).toBe(true);
      expect(result.data?.totalModifier).toBe(5);
    });

    it('should apply magical influence modifiers', async () => {
      const command = new MockLoyaltyCommand('follower1', 'leader1', 'periodic_check', {
        magicalInfluence: 20,
      });

      const result = await loyaltyRules.execute(context, command);

      expect(result.success).toBe(true);
      expect(result.data?.totalModifier).toBe(20);
      expect(result.data?.modifiers).toContain('Magical loyalty: +20');
    });

    it('should apply negative magical influence', async () => {
      const command = new MockLoyaltyCommand('follower1', 'leader1', 'periodic_check', {
        magicalInfluence: -15,
      });

      const result = await loyaltyRules.execute(context, command);

      expect(result.success).toBe(true);
      expect(result.data?.totalModifier).toBe(-15);
      expect(result.data?.modifiers).toContain('Magical fear: -15');
    });

    it('should apply custom modifiers', async () => {
      const command = new MockLoyaltyCommand('follower1', 'leader1', 'periodic_check', {
        customModifiers: {
          'Religious devotion': 15,
          'Language barrier': -5,
        },
      });

      const result = await loyaltyRules.execute(context, command);

      expect(result.success).toBe(true);
      expect(result.data?.totalModifier).toBe(10);
      expect(result.data?.modifiers).toContain('Religious devotion: +15');
      expect(result.data?.modifiers).toContain('Language barrier: -5');
    });
  });

  describe('Complex Modifier Combinations', () => {
    it('should combine multiple modifiers correctly', async () => {
      const command = new MockLoyaltyCommand('follower1', 'leader1', 'combat_casualties', {
        generousPayment: true,
        sharedDanger: true,
        successfulMissions: 2,
        failedMissions: 1,
        treasureBonus: 75,
      });

      const result = await loyaltyRules.execute(context, command);

      expect(result.success).toBe(true);
      expect(result.data?.totalModifier).toBe(13);
      expect(result.data?.finalValue).toBe(99);
    });

    it('should cap final value at 99', async () => {
      const command = new MockLoyaltyCommand('follower1', 'leader1', 'treasure_share', {
        generousPayment: true,
        magicalInfluence: 20,
        successfulMissions: 5,
        treasureBonus: 200,
      });

      const result = await loyaltyRules.execute(context, command);

      expect(result.success).toBe(true);
      expect(result.data?.totalModifier).toBe(60);
      expect(result.data?.finalValue).toBe(99);
    });

    it('should not go below 0 for final value', async () => {
      const command = new MockLoyaltyCommand('follower1', 'leader2', 'combat_casualties', {
        harshTreatment: true,
        failedMissions: 5,
        magicalInfluence: -20,
      });

      const result = await loyaltyRules.execute(context, command);

      expect(result.success).toBe(true);
      expect(result.data?.totalModifier).toBe(-60);
      expect(result.data?.finalValue).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should fail when character not found', async () => {
      const command = new MockLoyaltyCommand('nonexistent', undefined, 'initial_hire');

      const result = await loyaltyRules.execute(context, command);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Character not found');
    });

    it('should fail when leader not found', async () => {
      const command = new MockLoyaltyCommand('follower1', 'nonexistent', 'initial_hire');

      const result = await loyaltyRules.execute(context, command);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Leader not found');
    });

    it('should handle commands without loyalty data', async () => {
      const command = {
        type: COMMAND_TYPES.LOYALTY_CHECK,
        execute: async () => ({ success: false, message: 'mock' }),
        canExecute: () => false,
        getRequiredRules: () => [],
        getInvolvedEntities: () => [],
      };

      const result = await loyaltyRules.execute(context, command);

      expect(result.success).toBe(false);
      expect(result.message).toContain('No loyalty check data provided');
    });
  });

  describe('Outcome Determination', () => {
    it('should include outcome in result data', async () => {
      const command = new MockLoyaltyCommand('follower1', 'leader1', 'initial_hire');

      const result = await loyaltyRules.execute(context, command);

      expect(result.success).toBe(true);
      expect(result.data?.outcome).toBeDefined();
      expect([
        'loyal_devotion',
        'remain_loyal',
        'wavering',
        'disloyal',
        'betrayal',
        'desertion',
      ]).toContain(result.data?.outcome);
    });

    it('should include future modifier in result', async () => {
      const command = new MockLoyaltyCommand('follower1', 'leader1', 'initial_hire');

      const result = await loyaltyRules.execute(context, command);

      expect(result.success).toBe(true);
      expect(result.data?.futureModifier).toBeDefined();
      expect(typeof result.data?.futureModifier).toBe('number');
    });

    it('should include modifier breakdown', async () => {
      const command = new MockLoyaltyCommand('follower1', 'leader1', 'treasure_share', {
        generousPayment: true,
      });

      const result = await loyaltyRules.execute(context, command);

      expect(result.success).toBe(true);
      expect(result.data?.modifiers).toBeDefined();
      expect(Array.isArray(result.data?.modifiers)).toBe(true);
      expect(result.data?.modifiers).toContain('Treasure sharing: +5');
      expect(result.data?.modifiers).toContain('Generous payment: +10');
    });
  });
});
