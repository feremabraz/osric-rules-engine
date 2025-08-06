import { createStore } from 'jotai';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Command } from '../../../osric/core/Command';
import { GameContext } from '../../../osric/core/GameContext';
import { MoraleRules } from '../../../osric/rules/npc/MoraleRules';
import { COMMAND_TYPES } from '../../../osric/types/constants';
import type { Character, Monster } from '../../../osric/types/entities';

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

function createMockMonster(overrides: Partial<Monster> = {}): Monster {
  const defaultMonster: Monster = {
    id: 'test-monster',
    name: 'Test Monster',
    level: 2,
    hitDice: '2+0',
    hitPoints: { current: 8, maximum: 8 },
    armorClass: 6,
    thac0: 19,
    experience: { current: 0, requiredForNextLevel: 2000, level: 2 },
    alignment: 'Neutral Evil',
    inventory: [],
    position: 'wilderness',
    statusEffects: [],
    damagePerAttack: ['1d6'],
    morale: 8,
    treasure: 'C',
    specialAbilities: [],
    xpValue: 35,
    size: 'Medium',
    movementTypes: [{ type: 'Walk', rate: 12 }],
    habitat: ['Any'],
    frequency: 'Common',
    organization: 'Solitary',
    diet: 'Omnivore',
    ecology: 'Scavenger',
    ...overrides,
  };

  return defaultMonster;
}

class MockMoraleCommand implements Command {
  readonly type = COMMAND_TYPES.MORALE_CHECK;
  readonly actorId: string;
  readonly targetIds: string[] = [];

  constructor(
    actorId: string,
    public params: {
      characterId: string;
      groupIds?: string[];
      trigger: 'damage' | 'leader_death' | 'overwhelming_odds' | 'rally_attempt' | 'other';
      situationalModifiers?: {
        leadershipBonus?: number;
        eliteUnit?: boolean;
        veteranUnit?: boolean;
        inexperiencedUnit?: boolean;
        favorableTerrain?: boolean;
        unfavorableTerrain?: boolean;
        religiousZeal?: boolean;
        magicalFear?: boolean;
        outnumbered?: number;
        customModifiers?: Record<string, number>;
      };
    }
  ) {
    this.actorId = actorId;
  }

  async execute(
    _context: GameContext
  ): Promise<import('../../../osric/core/Command').CommandResult> {
    throw new Error('Mock command execute not implemented');
  }

  canExecute(_context: GameContext): boolean {
    return true;
  }

  getRequiredRules(): string[] {
    return ['morale-check'];
  }

  getInvolvedEntities(): string[] {
    return [this.actorId];
  }
}

describe('MoraleRules', () => {
  let moraleRules: MoraleRules;
  let context: GameContext;
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
    context = new GameContext(store);
    moraleRules = new MoraleRules();

    vi.spyOn(Math, 'random').mockImplementation(() => 0.5);
  });

  describe('Command Validation', () => {
    it('should not apply to non-morale commands', () => {
      const mockCommand = {
        type: 'attack',
        actorId: 'test',
        targetIds: [],
        params: {},
        async execute() {
          return { success: true, message: 'test' };
        },
        canExecute() {
          return true;
        },
        getRequiredRules() {
          return [];
        },
        getInvolvedEntities() {
          return ['test'];
        },
      };

      const canApply = moraleRules.canApply(context, mockCommand);
      expect(canApply).toBe(false);
    });

    it('should apply to morale-check commands', () => {
      const character = createMockCharacter({ id: 'char1' });
      context.setEntity(character.id, character);

      const command = new MockMoraleCommand('char1', {
        characterId: 'char1',
        trigger: 'damage',
      });

      const canApply = moraleRules.canApply(context, command);
      expect(canApply).toBe(true);
    });

    it('should require valid character ID', async () => {
      const command = new MockMoraleCommand('invalid', {
        characterId: 'invalid',
        trigger: 'damage',
      });

      const result = await moraleRules.execute(context, command);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Character not found');
    });
  });

  describe('Base Morale Calculation', () => {
    it('should calculate base morale as 50% + 5% per level for characters', async () => {
      const character = createMockCharacter({ id: 'char1', level: 4 });
      context.setEntity(character.id, character);

      vi.spyOn(Math, 'random').mockReturnValue(0.64);

      const command = new MockMoraleCommand('char1', {
        characterId: 'char1',
        trigger: 'damage',
      });

      const result = await moraleRules.execute(context, command);
      expect(result.success).toBe(true);
      expect(result.data?.baseValue).toBe(70);
    });

    it('should calculate base morale using hit dice for monsters', async () => {
      const monster = createMockMonster({ id: 'monster1', hitDice: '3+0', level: 3 });
      context.setEntity(monster.id, monster);

      const command = new MockMoraleCommand('monster1', {
        characterId: 'monster1',
        trigger: 'damage',
      });

      const result = await moraleRules.execute(context, command);
      expect(result.data?.baseValue).toBe(65);
    });

    it('should cap base morale at 95%', async () => {
      const character = createMockCharacter({ id: 'char1', level: 20 });
      context.setEntity(character.id, character);

      const command = new MockMoraleCommand('char1', {
        characterId: 'char1',
        trigger: 'damage',
      });

      const result = await moraleRules.execute(context, command);
      expect(result.data?.baseValue).toBe(95);
    });

    it('should have minimum base morale of 50%', async () => {
      const monster = createMockMonster({ id: 'monster1', hitDice: '0+0', level: 0 });
      context.setEntity(monster.id, monster);

      const command = new MockMoraleCommand('monster1', {
        characterId: 'monster1',
        trigger: 'damage',
      });

      const result = await moraleRules.execute(context, command);
      expect(result.data?.baseValue).toBe(50);
    });
  });

  describe('Trigger-Based Modifiers', () => {
    it('should apply appropriate modifier for damage trigger', async () => {
      const character = createMockCharacter({ id: 'char1', level: 2 });
      context.setEntity(character.id, character);

      const command = new MockMoraleCommand('char1', {
        characterId: 'char1',
        trigger: 'damage',
      });

      const result = await moraleRules.execute(context, command);
      expect(result.data?.modifiers).toContain('Damage taken: -5');
    });

    it('should apply appropriate modifier for leader death', async () => {
      const character = createMockCharacter({ id: 'char1', level: 2 });
      context.setEntity(character.id, character);

      const command = new MockMoraleCommand('char1', {
        characterId: 'char1',
        trigger: 'leader_death',
      });

      const result = await moraleRules.execute(context, command);
      expect(result.data?.modifiers).toContain('Leader death: -15');
    });

    it('should apply appropriate modifier for overwhelming odds', async () => {
      const character = createMockCharacter({ id: 'char1', level: 2 });
      context.setEntity(character.id, character);

      const command = new MockMoraleCommand('char1', {
        characterId: 'char1',
        trigger: 'overwhelming_odds',
      });

      const result = await moraleRules.execute(context, command);
      expect(result.data?.modifiers).toContain('Overwhelming odds: -10');
    });

    it('should apply bonus for rally attempts', async () => {
      const character = createMockCharacter({ id: 'char1', level: 2 });
      context.setEntity(character.id, character);

      const command = new MockMoraleCommand('char1', {
        characterId: 'char1',
        trigger: 'rally_attempt',
      });

      const result = await moraleRules.execute(context, command);
      expect(result.data?.modifiers).toContain('Rally attempt: +10');
    });
  });

  describe('Situational Modifiers', () => {
    it('should apply leadership bonus', async () => {
      const character = createMockCharacter({ id: 'char1', level: 2 });
      context.setEntity(character.id, character);

      const command = new MockMoraleCommand('char1', {
        characterId: 'char1',
        trigger: 'damage',
        situationalModifiers: {
          leadershipBonus: 8,
        },
      });

      const result = await moraleRules.execute(context, command);
      expect(result.data?.modifiers).toContain('Leadership: +4');
    });

    it('should apply elite unit bonus', async () => {
      const character = createMockCharacter({ id: 'char1', level: 2 });
      context.setEntity(character.id, character);

      const command = new MockMoraleCommand('char1', {
        characterId: 'char1',
        trigger: 'damage',
        situationalModifiers: {
          eliteUnit: true,
        },
      });

      const result = await moraleRules.execute(context, command);
      expect(result.data?.modifiers).toContain('Elite unit: +5');
    });

    it('should apply veteran unit bonus', async () => {
      const character = createMockCharacter({ id: 'char1', level: 2 });
      context.setEntity(character.id, character);

      const command = new MockMoraleCommand('char1', {
        characterId: 'char1',
        trigger: 'damage',
        situationalModifiers: {
          veteranUnit: true,
        },
      });

      const result = await moraleRules.execute(context, command);
      expect(result.data?.modifiers).toContain('Veteran unit: +3');
    });

    it('should apply inexperienced unit penalty', async () => {
      const character = createMockCharacter({ id: 'char1', level: 2 });
      context.setEntity(character.id, character);

      const command = new MockMoraleCommand('char1', {
        characterId: 'char1',
        trigger: 'damage',
        situationalModifiers: {
          inexperiencedUnit: true,
        },
      });

      const result = await moraleRules.execute(context, command);
      expect(result.data?.modifiers).toContain('Inexperienced unit: -5');
    });

    it('should apply terrain modifiers', async () => {
      const character = createMockCharacter({ id: 'char1', level: 2 });
      context.setEntity(character.id, character);

      const command = new MockMoraleCommand('char1', {
        characterId: 'char1',
        trigger: 'damage',
        situationalModifiers: {
          favorableTerrain: true,
          unfavorableTerrain: false,
        },
      });

      const result = await moraleRules.execute(context, command);
      expect(result.data?.modifiers).toContain('Favorable terrain: +2');
    });

    it('should apply special condition modifiers', async () => {
      const character = createMockCharacter({ id: 'char1', level: 2 });
      context.setEntity(character.id, character);

      const command = new MockMoraleCommand('char1', {
        characterId: 'char1',
        trigger: 'damage',
        situationalModifiers: {
          religiousZeal: true,
          magicalFear: true,
        },
      });

      const result = await moraleRules.execute(context, command);
      expect(result.data?.modifiers).toContain('Religious zeal: +5');
      expect(result.data?.modifiers).toContain('Magical fear: -10');
    });

    it('should apply outnumbered penalties', async () => {
      const character = createMockCharacter({ id: 'char1', level: 2 });
      context.setEntity(character.id, character);

      const command = new MockMoraleCommand('char1', {
        characterId: 'char1',
        trigger: 'damage',
        situationalModifiers: {
          outnumbered: 3,
        },
      });

      const result = await moraleRules.execute(context, command);
      expect(result.data?.modifiers).toContain('Outnumbered 3:1: -10');
    });

    it('should apply custom modifiers', async () => {
      const character = createMockCharacter({ id: 'char1', level: 2 });
      context.setEntity(character.id, character);

      const command = new MockMoraleCommand('char1', {
        characterId: 'char1',
        trigger: 'damage',
        situationalModifiers: {
          customModifiers: {
            'Battle cry': 3,
            'Enemy magic': -8,
          },
        },
      });

      const result = await moraleRules.execute(context, command);
      expect(result.data?.modifiers).toContain('Battle cry: +3');
      expect(result.data?.modifiers).toContain('Enemy magic: -8');
    });
  });

  describe('Group Morale Effects', () => {
    it('should handle group morale when group members present', async () => {
      const character = createMockCharacter({ id: 'char1', level: 2 });
      const ally1 = createMockCharacter({ id: 'ally1', level: 3 });
      const ally2 = createMockCharacter({ id: 'ally2', level: 1 });

      context.setEntity(character.id, character);
      context.setEntity(ally1.id, ally1);
      context.setEntity(ally2.id, ally2);

      const command = new MockMoraleCommand('char1', {
        characterId: 'char1',
        groupIds: ['ally1', 'ally2'],
        trigger: 'damage',
      });

      const result = await moraleRules.execute(context, command);

      expect(result.success).toBeDefined();
      expect(result.data?.groupEffects).toBeDefined();
    });
  });

  describe('Outcome Determination', () => {
    it('should result in success when roll passes', async () => {
      const character = createMockCharacter({ id: 'char1', level: 4 });
      context.setEntity(character.id, character);

      vi.spyOn(Math, 'random').mockReturnValue(0.49);

      const command = new MockMoraleCommand('char1', {
        characterId: 'char1',
        trigger: 'damage',
      });

      const result = await moraleRules.execute(context, command);
      expect(result.success).toBe(true);
      expect(result.data?.outcome).toBe('stand_ground');
    });

    it('should result in failure when roll fails', async () => {
      const character = createMockCharacter({ id: 'char1', level: 2 });
      context.setEntity(character.id, character);

      vi.spyOn(Math, 'random').mockReturnValue(0.69);

      const command = new MockMoraleCommand('char1', {
        characterId: 'char1',
        trigger: 'damage',
      });

      const result = await moraleRules.execute(context, command);
      expect(result.success).toBe(false);
      expect(result.data?.outcome).toBe('fighting_withdrawal');
    });

    it('should determine different failure outcomes based on margin', async () => {
      const character = createMockCharacter({ id: 'char1', level: 1 });
      context.setEntity(character.id, character);

      const testCases = [
        { roll: 0.6, expected: 'fighting_withdrawal' },
        { roll: 0.75, expected: 'retreat' },
        { roll: 0.9, expected: 'rout' },
        { roll: 0.99, expected: 'surrender' },
      ];

      for (const testCase of testCases) {
        vi.spyOn(Math, 'random').mockReturnValue(testCase.roll);

        const command = new MockMoraleCommand('char1', {
          characterId: 'char1',
          trigger: 'damage',
        });

        const result = await moraleRules.execute(context, command);
        expect(result.data?.outcome).toBe(testCase.expected);
      }
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle combination of multiple modifiers', async () => {
      const character = createMockCharacter({ id: 'char1', level: 3 });
      context.setEntity(character.id, character);

      const command = new MockMoraleCommand('char1', {
        characterId: 'char1',
        trigger: 'leader_death',
        situationalModifiers: {
          eliteUnit: true,
          magicalFear: true,
          leadershipBonus: 6,
          customModifiers: {
            'Blessed weapon': 2,
          },
        },
      });

      const result = await moraleRules.execute(context, command);

      expect(result.data?.totalModifier).toBe(-15);
      expect(result.data?.finalValue).toBe(50);
    });

    it('should handle edge case with very negative modifiers', async () => {
      const character = createMockCharacter({ id: 'char1', level: 1 });
      context.setEntity(character.id, character);

      const command = new MockMoraleCommand('char1', {
        characterId: 'char1',
        trigger: 'leader_death',
        situationalModifiers: {
          inexperiencedUnit: true,
          magicalFear: true,
          outnumbered: 5,
          customModifiers: {
            'Cursed ground': -20,
          },
        },
      });

      const result = await moraleRules.execute(context, command);

      expect(result.data?.finalValue).toBe(-10);
      expect(result.success).toBe(false);
    });
  });

  describe('OSRIC Compliance', () => {
    it('should follow OSRIC base morale formula', async () => {
      const testCases = [
        { level: 1, expected: 55 },
        { level: 2, expected: 60 },
        { level: 4, expected: 70 },
        { level: 8, expected: 90 },
        { level: 10, expected: 95 },
        { level: 20, expected: 95 },
      ];

      for (const { level, expected } of testCases) {
        const character = createMockCharacter({ id: 'test', level });
        context.setEntity(character.id, character);

        const command = new MockMoraleCommand('test', {
          characterId: 'test',
          trigger: 'other',
        });

        const result = await moraleRules.execute(context, command);
        expect(result.data?.baseValue).toBe(expected);
      }
    });

    it('should use correct OSRIC trigger modifiers', async () => {
      const character = createMockCharacter({ id: 'char1', level: 2 });
      context.setEntity(character.id, character);

      const triggerTests = [
        { trigger: 'damage', expectedMod: -5 },
        { trigger: 'leader_death', expectedMod: -15 },
        { trigger: 'overwhelming_odds', expectedMod: -10 },
        { trigger: 'rally_attempt', expectedMod: 10 },
        { trigger: 'other', expectedMod: 0 },
      ];

      for (const { trigger, expectedMod } of triggerTests) {
        const command = new MockMoraleCommand('char1', {
          characterId: 'char1',
          trigger: trigger as
            | 'damage'
            | 'leader_death'
            | 'overwhelming_odds'
            | 'rally_attempt'
            | 'other',
        });

        const result = await moraleRules.execute(context, command);
        expect(result.data?.totalModifier).toBe(expectedMod);
      }
    });

    it('should implement correct OSRIC outcome determination', async () => {
      const character = createMockCharacter({ id: 'char1', level: 1 });
      context.setEntity(character.id, character);

      const outcomeTests = [
        { roll: 0.54, expected: 'stand_ground' },
        { roll: 0.64, expected: 'fighting_withdrawal' },
        { roll: 0.75, expected: 'retreat' },
        { roll: 0.9, expected: 'rout' },
        { roll: 0.99, expected: 'surrender' },
      ];

      for (const { roll, expected } of outcomeTests) {
        vi.spyOn(Math, 'random').mockReturnValue(roll);

        const command = new MockMoraleCommand('char1', {
          characterId: 'char1',
          trigger: 'other',
        });

        const result = await moraleRules.execute(context, command);
        expect(result.data?.outcome).toBe(expected);
      }
    });
  });
});
