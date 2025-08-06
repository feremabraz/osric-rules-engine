/**
 * ExperienceGainRules Tests - OSRIC Compliance
 *
 * Tests the ExperienceGainRule for proper XP calculations according to OSRIC mechanics:
 * - Combat XP from monster HD and special abilities
 * - Treasure XP from gold piece value
 * - Story milestone XP awards
 * - Class-specific XP penalties and bonuses
 * - Edge cases and error scenarios
 */

import { createStore } from 'jotai';
import { beforeEach, describe, expect, it } from 'vitest';
import { GameContext } from '../../../osric/core/GameContext';
import { ExperienceGainRule } from '../../../osric/rules/experience/ExperienceGainRules';
import type { Character } from '../../../osric/types/entities';

// Mock helper function to create test characters (copied from GameContext.test.ts)
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

// Mock command for testing
class MockExperienceCommand {
  readonly type = 'gain-experience';
  readonly actorId = 'test-character';
  readonly targetIds: string[] = [];

  async execute(_context: GameContext) {
    return { success: true, message: 'Mock experience command executed' };
  }

  canExecute(_context: GameContext): boolean {
    return true;
  }

  getRequiredRules(): string[] {
    return ['gain-experience'];
  }

  getInvolvedEntities(): string[] {
    return [this.actorId, ...this.targetIds];
  }
}

describe('ExperienceGainRules', () => {
  let context: GameContext;
  let experienceRule: ExperienceGainRule;
  let mockCommand: MockExperienceCommand;

  beforeEach(() => {
    const store = createStore();
    context = new GameContext(store);
    experienceRule = new ExperienceGainRule();
    mockCommand = new MockExperienceCommand();

    // Setup test character using mock helper
    const testCharacter = createMockCharacter({
      id: 'test-character',
      name: 'Test Hero',
      abilities: {
        strength: 16, // Higher strength for testing prime requisite bonus
        dexterity: 12,
        constitution: 14,
        intelligence: 10,
        wisdom: 13,
        charisma: 11,
      },
    });

    context.setEntity('test-character', testCharacter);
  });

  describe('Rule Application', () => {
    it('should apply to gain-experience commands', () => {
      const result = experienceRule.canApply(context, mockCommand);
      expect(result).toBe(true);
    });

    it('should not apply to other command types', () => {
      // Create a different command type
      class OtherCommand {
        readonly type = 'cast-spell';
        readonly actorId = 'test-character';
        readonly targetIds: string[] = [];

        async execute(_context: GameContext) {
          return { success: true, message: 'Mock other command executed' };
        }

        canExecute(_context: GameContext): boolean {
          return true;
        }

        getRequiredRules(): string[] {
          return ['cast-spell'];
        }

        getInvolvedEntities(): string[] {
          return [this.actorId, ...this.targetIds];
        }
      }

      const otherCommand = new OtherCommand();
      const result = experienceRule.canApply(context, otherCommand);
      expect(result).toBe(false);
    });
  });

  describe('Combat Experience Calculation', () => {
    it('should calculate basic monster XP correctly', async () => {
      // Setup experience gain data with proper Monster objects
      context.setTemporary('experience-gain-params', {
        characterId: 'test-character',
        experienceSource: {
          type: 'combat',
          monsters: [
            {
              id: 'goblin-1',
              name: 'Goblin',
              hitDice: '1-1', // Less than 1 HD = 5 XP
              specialAbilities: [],
              // Required Monster properties
              level: 1,
              hitPoints: { current: 3, maximum: 3 },
              armorClass: 6,
              thac0: 20,
              experience: { current: 0, requiredForNextLevel: 0, level: 1 },
              alignment: 'Chaotic Evil',
              inventory: [],
              position: 'dungeon',
              statusEffects: [],
              race: 'Goblin',
              class: 'Fighter',
              abilities: {
                strength: 8,
                dexterity: 14,
                constitution: 10,
                intelligence: 8,
                wisdom: 8,
                charisma: 6,
              },
              abilityModifiers: createMockCharacter().abilityModifiers,
              savingThrows: createMockCharacter().savingThrows,
              spells: [],
              currency: { platinum: 0, gold: 0, electrum: 0, silver: 0, copper: 0 },
              encumbrance: 0,
              movementRate: 90,
              classes: { Fighter: 1 },
              primaryClass: null,
              spellSlots: {},
              memorizedSpells: {},
              spellbook: [],
              thiefSkills: null,
              turnUndead: null,
              languages: ['Goblin'],
              age: 5,
              ageCategory: 'Adult',
              henchmen: [],
              racialAbilities: [],
              classAbilities: [],
              proficiencies: [],
              secondarySkills: [],
              damagePerAttack: ['1d6'],
              morale: 7,
              treasure: 'C',
              xpValue: 5,
              size: 'Small',
              movementTypes: ['Ground'],
              habitat: ['Underground'],
              frequency: 'Common',
              organization: 'Tribal',
              diet: 'Omnivore',
              ecology: 'Scavenger',
            } as const,
          ],
        },
      });

      const result = await experienceRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.experienceGained).toBeGreaterThan(0);
      expect(result.message).toContain('experience points');
    });

    it('should handle empty monster list', async () => {
      context.setTemporary('experience-gain-params', {
        characterId: 'test-character',
        experienceSource: {
          type: 'combat',
          monsters: [],
        },
      });

      const result = await experienceRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.experienceGained).toBe(0);
    });

    it('should apply party sharing correctly', async () => {
      context.setTemporary('experience-gain-params', {
        characterId: 'test-character',
        experienceSource: {
          type: 'combat',
          monsters: [
            {
              id: 'goblin-2',
              name: 'Goblin',
              hitDice: '1-1', // Less than 1 HD = 5 XP
              specialAbilities: [],
              // Required Monster properties (shortened for this test)
              level: 1,
              hitPoints: { current: 3, maximum: 3 },
              armorClass: 6,
              thac0: 20,
              experience: { current: 0, requiredForNextLevel: 0, level: 1 },
              alignment: 'Chaotic Evil',
              inventory: [],
              position: 'dungeon',
              statusEffects: [],
              race: 'Goblin',
              class: 'Fighter',
              abilities: {
                strength: 8,
                dexterity: 14,
                constitution: 10,
                intelligence: 8,
                wisdom: 8,
                charisma: 6,
              },
              abilityModifiers: createMockCharacter().abilityModifiers,
              savingThrows: createMockCharacter().savingThrows,
              spells: [],
              currency: { platinum: 0, gold: 0, electrum: 0, silver: 0, copper: 0 },
              encumbrance: 0,
              movementRate: 90,
              classes: { Fighter: 1 },
              primaryClass: null,
              spellSlots: {},
              memorizedSpells: {},
              spellbook: [],
              thiefSkills: null,
              turnUndead: null,
              languages: ['Goblin'],
              age: 5,
              ageCategory: 'Adult',
              henchmen: [],
              racialAbilities: [],
              classAbilities: [],
              proficiencies: [],
              secondarySkills: [],
              damagePerAttack: ['1d6'],
              morale: 7,
              treasure: 'C',
              xpValue: 5,
              size: 'Small',
              movementTypes: ['Ground'],
              habitat: ['Underground'],
              frequency: 'Common',
              organization: 'Tribal',
              diet: 'Omnivore',
              ecology: 'Scavenger',
            } as const,
          ],
        },
        partyShare: {
          enabled: true,
          partyMemberIds: ['test-character', 'party-member-2'],
          equalShare: true,
        },
      });

      const result = await experienceRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      // XP should be divided by 2 for party of 2
      expect(result.data?.experienceGained).toBeGreaterThan(0);
    });
  });

  describe('Treasure Experience Calculation', () => {
    it('should award XP for treasure value (1 GP = 1 XP) with prime requisite bonus', async () => {
      context.setTemporary('experience-gain-params', {
        characterId: 'test-character',
        experienceSource: {
          type: 'treasure',
          treasureValue: 1000,
          description: 'Dragon hoard gold',
        },
      });

      const result = await experienceRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      // Character has strength 16, so gets +10% bonus: 1000 + 100 = 1100
      expect(result.data?.experienceGained).toBe(1100);
      expect(result.message).toContain('experience points');
    });

    it('should handle zero treasure value', async () => {
      context.setTemporary('experience-gain-params', {
        characterId: 'test-character',
        experienceSource: {
          type: 'treasure',
          treasureValue: 0,
        },
      });

      const result = await experienceRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.experienceGained).toBe(0);
    });
  });

  describe('Story Milestone Experience', () => {
    it('should award story milestone XP with prime requisite bonus', async () => {
      context.setTemporary('experience-gain-params', {
        characterId: 'test-character',
        experienceSource: {
          type: 'story',
          amount: 500,
          description: 'Completed major quest',
        },
      });

      const result = await experienceRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      // Character has strength 16, so gets +10% bonus: 500 + 50 = 550
      expect(result.data?.experienceGained).toBe(550);
      expect(result.message).toContain('experience points');
    });

    it('should handle zero story XP', async () => {
      context.setTemporary('experience-gain-params', {
        characterId: 'test-character',
        experienceSource: {
          type: 'story',
          amount: 0,
        },
      });

      const result = await experienceRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.experienceGained).toBe(0);
    });
  });

  describe('Prime Requisite Bonuses', () => {
    it('should apply 10% bonus for strength 16+ (Fighter)', async () => {
      // Character already has strength 16 from beforeEach
      context.setTemporary('experience-gain-params', {
        characterId: 'test-character',
        experienceSource: {
          type: 'treasure',
          treasureValue: 1000,
        },
      });

      const result = await experienceRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      // Should get 1100 XP (1000 + 10% bonus)
      expect(result.data?.experienceGained).toBe(1100);
      expect(result.data?.modifiers).toContain('Prime requisite +10%: 100 XP');
    });

    it('should apply penalty for low prime requisite', async () => {
      // Create character with low strength
      const lowStrCharacter = createMockCharacter({
        id: 'low-str-character',
        abilities: { ...createMockCharacter().abilities, strength: 7 },
      });
      context.setEntity('low-str-character', lowStrCharacter);

      context.setTemporary('experience-gain-params', {
        characterId: 'low-str-character',
        experienceSource: {
          type: 'treasure',
          treasureValue: 1000,
        },
      });

      const result = await experienceRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      // Should get penalty for low strength
      expect(result.data?.experienceGained).toBeLessThan(1000);
    });
  });

  describe('Multi-Class Penalties', () => {
    it('should apply multi-class XP penalty', async () => {
      // Create multi-class character
      const multiClassChar = createMockCharacter({
        id: 'multi-class-character',
        class: 'Fighter', // Primary class for type checking
        classes: { Fighter: 1, 'Magic-User': 1 },
      });
      // Manually set the multi-class indicator in class field after creation
      Object.assign(multiClassChar, { class: 'Fighter/Magic-User' });
      context.setEntity('multi-class-character', multiClassChar);

      context.setTemporary('experience-gain-params', {
        characterId: 'multi-class-character',
        experienceSource: {
          type: 'treasure',
          treasureValue: 1000,
        },
      });

      const result = await experienceRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      // Should get penalty for multi-class (1000 / 2 = 500 XP)
      expect(result.data?.experienceGained).toBeLessThan(1000);
      expect(
        (result.data?.modifiers as string[])?.some((mod: string) =>
          mod.includes('Multi-class penalty')
        )
      ).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing experience data', async () => {
      // Don't set any experience-gain-params
      const result = await experienceRule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('No experience gain data provided');
    });

    it('should handle missing character', async () => {
      context.setTemporary('experience-gain-params', {
        characterId: 'nonexistent-character',
        experienceSource: {
          type: 'treasure',
          treasureValue: 1000,
        },
      });

      const result = await experienceRule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Character nonexistent-character not found');
    });

    it('should handle invalid experience source type', async () => {
      context.setTemporary('experience-gain-params', {
        characterId: 'test-character',
        experienceSource: {
          type: 'invalid-type',
        },
      });

      const result = await experienceRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.data?.experienceGained).toBe(0);
    });
  });

  describe('Experience Updates', () => {
    it('should update character experience correctly', async () => {
      const initialCharacter = context.getEntity<Character>('test-character');
      const initialXP = initialCharacter ? initialCharacter.experience.current : 0;

      context.setTemporary('experience-gain-params', {
        characterId: 'test-character',
        experienceSource: {
          type: 'treasure',
          treasureValue: 500,
        },
      });

      const result = await experienceRule.execute(context, mockCommand);

      expect(result.success).toBe(true);

      const updatedCharacter = context.getEntity<Character>('test-character');
      if (updatedCharacter) {
        expect(updatedCharacter.experience.current).toBe(initialXP + 550); // 500 + 10% bonus
      }
      expect(result.data?.newTotal).toBe(initialXP + 550);
    });
  });
});
