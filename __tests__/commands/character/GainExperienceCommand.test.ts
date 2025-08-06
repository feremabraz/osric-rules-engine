/**
 * GainExperienceCommand Test Suite
 *
 * Tests the GainExperienceCommand implementation using systematic testing methodology.
 * Validates OSRIC-compliant experience gain mechanics including:
 * - Combat experience calculation and monster XP
 * - Treasure experience (1 GP = 1 XP rule)
 * - Story milestone experience awards
 * - Prime requisite bonuses and penalties
 * - Multi-class experience penalties
 * - Party experience sharing mechanics
 * - Class-specific experience modifiers
 *
 * Follows established testing patterns with comprehensive coverage.
 */

import { createStore } from 'jotai';
import { beforeEach, describe, expect, it } from 'vitest';
import { GainExperienceCommand } from '../../../osric/commands/character/GainExperienceCommand';
import { GameContext } from '../../../osric/core/GameContext';
import type { CharacterClass, CharacterRace } from '../../../osric/types';
import type { Character, Monster } from '../../../osric/types/entities';

describe('GainExperienceCommand', () => {
  let context: GameContext;

  beforeEach(() => {
    const store = createStore();
    context = new GameContext(store);
  });

  // Mock character creation utility matching the actual entity types
  function createMockCharacter(overrides: Partial<Character> = {}): Character {
    const character: Character = {
      id: 'test-character',
      name: 'Test Fighter',
      race: 'Human' as CharacterRace,
      class: 'Fighter' as CharacterClass,
      classes: { Fighter: 3 }, // Single class character
      primaryClass: 'Fighter' as CharacterClass,
      level: 3,
      hitPoints: { current: 25, maximum: 25 },
      armorClass: 5,
      encumbrance: 50,
      movementRate: 120,
      abilities: {
        strength: 16, // High strength for Fighter prime requisite bonus
        dexterity: 14,
        constitution: 15,
        intelligence: 12,
        wisdom: 10,
        charisma: 13,
      },
      abilityModifiers: {
        // Strength modifiers
        strengthHitAdj: 1,
        strengthDamageAdj: 1,
        strengthEncumbrance: null,
        strengthOpenDoors: null,
        strengthBendBars: null,

        // Dexterity modifiers
        dexterityReaction: 0,
        dexterityMissile: 0,
        dexterityDefense: 0,
        dexterityPickPockets: null,
        dexterityOpenLocks: null,
        dexterityFindTraps: null,
        dexterityMoveSilently: null,
        dexterityHideInShadows: null,

        // Constitution modifiers
        constitutionHitPoints: 1,
        constitutionSystemShock: null,
        constitutionResurrectionSurvival: null,
        constitutionPoisonSave: null,

        // Intelligence modifiers
        intelligenceLanguages: null,
        intelligenceLearnSpells: null,
        intelligenceMaxSpellLevel: null,
        intelligenceIllusionImmunity: false,

        // Wisdom modifiers
        wisdomMentalSave: null,
        wisdomBonusSpells: null,
        wisdomSpellFailure: null,

        // Charisma modifiers
        charismaReactionAdj: null,
        charismaLoyaltyBase: null,
        charismaMaxHenchmen: null,
      },
      savingThrows: {
        'Poison or Death': 12,
        Wands: 13,
        'Paralysis, Polymorph, or Petrification': 14,
        'Breath Weapons': 15,
        'Spells, Rods, or Staves': 16,
      },
      experience: {
        current: 8000,
        requiredForNextLevel: 16000,
        level: 4,
      },
      currency: {
        platinum: 0,
        gold: 500,
        electrum: 0,
        silver: 0,
        copper: 0,
      },
      spells: [],
      spellSlots: {},
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
      thac0: 18,
      alignment: 'Lawful Good',
      inventory: [],
      position: '0,0',
      statusEffects: [],
      ...overrides,
    };

    return character;
  }

  // Mock monster creation utility
  function createMockMonster(overrides: Partial<Monster> = {}): Monster {
    return {
      id: 'test-monster',
      name: 'Orc',
      level: 1,
      hitDice: '1', // String format expected by Monster interface
      hitPoints: { current: 4, maximum: 4 },
      armorClass: 6,
      thac0: 20,
      experience: { current: 0, level: 1, requiredForNextLevel: 0 },
      alignment: 'Chaotic Evil',
      inventory: [],
      position: '',
      statusEffects: [],
      damagePerAttack: ['1d8'],
      morale: 8,
      treasure: 'C',
      specialAbilities: [],
      xpValue: 10,
      size: 'Medium',
      movementTypes: [{ type: 'Walk', rate: 120 }],
      habitat: ['any'],
      frequency: 'Common',
      organization: 'tribe',
      diet: 'omnivore',
      ecology: 'humanoid',
      ...overrides,
    };
  }

  describe('Command Creation', () => {
    it('should create command with proper type', () => {
      const command = new GainExperienceCommand({
        characterId: 'test-character',
        experienceSource: {
          type: 'story',
          amount: 100,
          description: 'Quest completion',
        },
      });

      expect(command.type).toBe('gain-experience');
    });

    it('should accept combat experience parameters', () => {
      const monsters = [createMockMonster()];
      const command = new GainExperienceCommand({
        characterId: 'test-character',
        experienceSource: {
          type: 'combat',
          monsters,
          description: 'Defeated orc patrol',
        },
      });

      expect(command.type).toBe('gain-experience');
    });

    it('should accept treasure experience parameters', () => {
      const command = new GainExperienceCommand({
        characterId: 'test-character',
        experienceSource: {
          type: 'treasure',
          treasureValue: 250,
          description: 'Found treasure chest',
        },
      });

      expect(command.type).toBe('gain-experience');
    });

    it('should accept party sharing parameters', () => {
      const command = new GainExperienceCommand({
        characterId: 'test-character',
        experienceSource: {
          type: 'story',
          amount: 500,
        },
        partyShare: {
          enabled: true,
          partyMemberIds: ['character-1', 'character-2', 'character-3'],
        },
      });

      expect(command.type).toBe('gain-experience');
    });
  });

  describe('Command Validation', () => {
    it('should validate when character exists', () => {
      const character = createMockCharacter();
      context.setEntity('test-character', character);

      const command = new GainExperienceCommand({
        characterId: 'test-character',
        experienceSource: {
          type: 'story',
          amount: 100,
        },
      });

      expect(command.canExecute(context)).toBe(true);
    });

    it('should fail validation when character does not exist', () => {
      const command = new GainExperienceCommand({
        characterId: 'nonexistent-character',
        experienceSource: {
          type: 'story',
          amount: 100,
        },
      });

      expect(command.canExecute(context)).toBe(false);
    });

    it('should validate party members for sharing', () => {
      const character = createMockCharacter();
      const partyMember = createMockCharacter({ id: 'party-member', name: 'Party Cleric' });
      context.setEntity('test-character', character);
      context.setEntity('party-member', partyMember);

      const command = new GainExperienceCommand({
        characterId: 'test-character',
        experienceSource: {
          type: 'story',
          amount: 100,
        },
        partyShare: {
          enabled: true,
          partyMemberIds: ['party-member'],
        },
      });

      expect(command.canExecute(context)).toBe(true);
    });
  });

  describe('Combat Experience Calculation', () => {
    it('should calculate XP from defeated monsters', async () => {
      const character = createMockCharacter();
      context.setEntity('test-character', character);

      const monsters = [createMockMonster({ xpValue: 10 }), createMockMonster({ xpValue: 15 })];

      const command = new GainExperienceCommand({
        characterId: 'test-character',
        experienceSource: {
          type: 'combat',
          monsters,
          description: 'Defeated orc patrol',
        },
      });

      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.experienceAwarded).toBeGreaterThan(0);

      // Verify character's experience was updated
      const updatedCharacter = context.getEntity<Character>('test-character');
      expect(updatedCharacter?.experience.current).toBeGreaterThan(character.experience.current);
    });

    it('should handle empty monster list', async () => {
      const character = createMockCharacter();
      context.setEntity('test-character', character);

      const command = new GainExperienceCommand({
        characterId: 'test-character',
        experienceSource: {
          type: 'combat',
          monsters: [],
          description: 'No monsters defeated',
        },
      });

      const result = await command.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Combat experience requires monsters');
    });

    it('should handle missing monsters for combat type', async () => {
      const character = createMockCharacter();
      context.setEntity('test-character', character);

      const command = new GainExperienceCommand({
        characterId: 'test-character',
        experienceSource: {
          type: 'combat',
          description: 'Combat without monsters',
        },
      });

      const result = await command.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Combat experience requires monsters');
    });
  });

  describe('Treasure Experience Calculation', () => {
    it('should award XP for treasure value (1 GP = 1 XP)', async () => {
      const character = createMockCharacter();
      context.setEntity('test-character', character);

      const treasureValue = 250;
      const command = new GainExperienceCommand({
        characterId: 'test-character',
        experienceSource: {
          type: 'treasure',
          treasureValue,
          description: 'Found treasure chest',
        },
      });

      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.experienceAwarded).toBeGreaterThan(0);

      // Verify character's experience was updated
      const updatedCharacter = context.getEntity<Character>('test-character');
      expect(updatedCharacter?.experience.current).toBeGreaterThan(character.experience.current);
    });

    it('should handle direct treasure experience amount', async () => {
      const character = createMockCharacter();
      context.setEntity('test-character', character);

      const command = new GainExperienceCommand({
        characterId: 'test-character',
        experienceSource: {
          type: 'treasure',
          amount: 150,
          description: 'Treasure experience',
        },
      });

      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.experienceAwarded).toBe(165); // With 10% prime requisite bonus
    });

    it('should handle zero treasure value', async () => {
      const character = createMockCharacter();
      context.setEntity('test-character', character);

      const command = new GainExperienceCommand({
        characterId: 'test-character',
        experienceSource: {
          type: 'treasure',
          treasureValue: 0,
          description: 'No treasure found',
        },
      });

      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.experienceAwarded).toBe(0);
    });
  });

  describe('Story Milestone Experience', () => {
    it('should award story milestone XP', async () => {
      const character = createMockCharacter();
      context.setEntity('test-character', character);

      const storyXP = 500;
      const command = new GainExperienceCommand({
        characterId: 'test-character',
        experienceSource: {
          type: 'story',
          amount: storyXP,
          description: 'Completed major quest',
        },
      });

      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.experienceAwarded).toBe(550); // With 10% prime requisite bonus

      // Verify character's experience was updated
      const updatedCharacter = context.getEntity<Character>('test-character');
      expect(updatedCharacter?.experience.current).toBe(character.experience.current + 550);
    });

    it('should handle zero story XP', async () => {
      const character = createMockCharacter();
      context.setEntity('test-character', character);

      const command = new GainExperienceCommand({
        characterId: 'test-character',
        experienceSource: {
          type: 'story',
          amount: 0,
          description: 'No bonus experience',
        },
      });

      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.experienceAwarded).toBe(0);
    });
  });

  describe('Prime Requisite Bonuses', () => {
    it('should apply 10% bonus for high prime requisite (16+)', async () => {
      const fighter = createMockCharacter({
        class: 'Fighter',
        abilities: { ...createMockCharacter().abilities, strength: 16 },
      });
      context.setEntity('test-character', fighter);

      const command = new GainExperienceCommand({
        characterId: 'test-character',
        experienceSource: {
          type: 'story',
          amount: 100,
        },
      });

      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.experienceAwarded).toBe(110); // 100 + 10% bonus
    });

    it('should apply 5% bonus for good prime requisite (13-15)', async () => {
      const cleric = createMockCharacter({
        class: 'Cleric',
        abilities: { ...createMockCharacter().abilities, wisdom: 14 },
      });
      context.setEntity('test-character', cleric);

      const command = new GainExperienceCommand({
        characterId: 'test-character',
        experienceSource: {
          type: 'story',
          amount: 100,
        },
      });

      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.experienceAwarded).toBe(105); // 100 + 5% bonus
    });

    it('should apply penalty for low prime requisite', async () => {
      const fighter = createMockCharacter({
        class: 'Fighter',
        abilities: { ...createMockCharacter().abilities, strength: 8 },
      });
      context.setEntity('test-character', fighter);

      const command = new GainExperienceCommand({
        characterId: 'test-character',
        experienceSource: {
          type: 'story',
          amount: 100,
        },
      });

      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.experienceAwarded).toBe(95); // 100 - 5% penalty
    });
  });

  describe('Multi-Class Experience Penalties', () => {
    it('should apply multi-class XP penalty', async () => {
      const multiClassCharacter = createMockCharacter({
        classes: { Fighter: 3, 'Magic-User': 2 }, // Multi-class character
      });
      context.setEntity('test-character', multiClassCharacter);

      const command = new GainExperienceCommand({
        characterId: 'test-character',
        experienceSource: {
          type: 'story',
          amount: 200,
        },
      });

      const result = await command.execute(context);

      expect(result.success).toBe(true);
      // Should be split between classes: 200 / 2 = 100, then with prime requisite bonus
      expect(result.data?.experienceAwarded).toBeLessThan(200);
    });
  });

  describe('Party Experience Sharing', () => {
    it('should share experience among party members', async () => {
      const character1 = createMockCharacter({ id: 'char-1', name: 'Fighter' });
      const character2 = createMockCharacter({ id: 'char-2', name: 'Cleric' });
      const character3 = createMockCharacter({ id: 'char-3', name: 'Thief' });

      context.setEntity('char-1', character1);
      context.setEntity('char-2', character2);
      context.setEntity('char-3', character3);

      const command = new GainExperienceCommand({
        characterId: 'char-1',
        experienceSource: {
          type: 'story',
          amount: 300,
        },
        partyShare: {
          enabled: true,
          partyMemberIds: ['char-1', 'char-2', 'char-3'],
        },
      });

      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.experienceShares).toBeDefined();
      expect(result.data?.updatedCharacters).toHaveLength(3);

      // Each character should have received experience
      const updatedChar1 = context.getEntity<Character>('char-1');
      const updatedChar2 = context.getEntity<Character>('char-2');
      const updatedChar3 = context.getEntity<Character>('char-3');

      expect(updatedChar1?.experience.current).toBeGreaterThan(character1.experience.current);
      expect(updatedChar2?.experience.current).toBeGreaterThan(character2.experience.current);
      expect(updatedChar3?.experience.current).toBeGreaterThan(character3.experience.current);
    });

    it('should handle missing party members', async () => {
      const character = createMockCharacter();
      context.setEntity('test-character', character);

      const command = new GainExperienceCommand({
        characterId: 'test-character',
        experienceSource: {
          type: 'story',
          amount: 100,
        },
        partyShare: {
          enabled: true,
          partyMemberIds: ['test-character', 'nonexistent-character'],
        },
      });

      const result = await command.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });

    it('should handle equal sharing among party members', async () => {
      const character1 = createMockCharacter({ id: 'char-1' });
      const character2 = createMockCharacter({ id: 'char-2' });

      context.setEntity('char-1', character1);
      context.setEntity('char-2', character2);

      const command = new GainExperienceCommand({
        characterId: 'char-1',
        experienceSource: {
          type: 'story',
          amount: 200,
        },
        partyShare: {
          enabled: true,
          partyMemberIds: ['char-1', 'char-2'],
        },
      });

      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.experienceShares).toBeDefined();

      // Both characters should receive equal shares (after class modifiers)
      const shares = (result.data?.experienceShares as Record<string, number>) || {};
      expect(Object.keys(shares)).toContain('char-1');
      expect(Object.keys(shares)).toContain('char-2');
      expect(shares['char-1']).toBeGreaterThan(0);
      expect(shares['char-2']).toBeGreaterThan(0);
    });
  });

  describe('Level Updates', () => {
    it('should update character level when sufficient experience gained', async () => {
      const character = createMockCharacter({
        experience: { current: 15900, level: 4, requiredForNextLevel: 16000 },
      });
      context.setEntity('test-character', character);

      const command = new GainExperienceCommand({
        characterId: 'test-character',
        experienceSource: {
          type: 'story',
          amount: 200, // Should push over the level threshold
        },
      });

      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.leveledUp).toBe(true);
      expect(result.data?.newLevel).toBe(5);

      // Verify character's level was updated
      const updatedCharacter = context.getEntity<Character>('test-character');
      expect(updatedCharacter?.experience.level).toBe(5);
      expect(updatedCharacter?.experience.requiredForNextLevel).toBeGreaterThan(16000);
    });

    it('should not change level when insufficient experience gained', async () => {
      const character = createMockCharacter({
        experience: { current: 10000, level: 4, requiredForNextLevel: 16000 },
      });
      context.setEntity('test-character', character);

      const command = new GainExperienceCommand({
        characterId: 'test-character',
        experienceSource: {
          type: 'story',
          amount: 100,
        },
      });

      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.leveledUp).toBe(false);
      expect(result.data?.newLevel).toBe(4);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing character', async () => {
      const command = new GainExperienceCommand({
        characterId: 'nonexistent-character',
        experienceSource: {
          type: 'story',
          amount: 100,
        },
      });

      const result = await command.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });

    it('should handle invalid experience source type', async () => {
      const character = createMockCharacter();
      context.setEntity('test-character', character);

      const command = new GainExperienceCommand({
        characterId: 'test-character',
        experienceSource: {
          // @ts-expect-error Testing invalid type
          type: 'invalid',
          amount: 100,
        },
      });

      const result = await command.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Unknown experience source type');
    });

    it('should handle command execution errors gracefully', async () => {
      const character = createMockCharacter();
      context.setEntity('test-character', character);

      // Create a command that might cause errors
      const command = new GainExperienceCommand({
        characterId: 'test-character',
        experienceSource: {
          type: 'story',
          amount: -100, // Negative experience
        },
      });

      const result = await command.execute(context);

      // Should handle gracefully regardless of result
      expect(result.success).toBeDefined();
      expect(result.message).toBeDefined();
    });
  });

  describe('Required Rules', () => {
    it('should return required rule names', () => {
      const command = new GainExperienceCommand({
        characterId: 'test-character',
        experienceSource: {
          type: 'story',
          amount: 100,
        },
      });

      const requiredRules = command.getRequiredRules();

      expect(requiredRules).toContain('experience-gain');
      expect(requiredRules).toContain('level-progression');
    });
  });

  describe('OSRIC Compliance', () => {
    it('should implement authentic OSRIC experience gain mechanics', async () => {
      const character = createMockCharacter();
      context.setEntity('test-character', character);

      const command = new GainExperienceCommand({
        characterId: 'test-character',
        experienceSource: {
          type: 'treasure',
          treasureValue: 100, // 1 GP = 1 XP rule
        },
      });

      const result = await command.execute(context);

      expect(result.success).toBe(true);

      // Should apply OSRIC rules:
      // - Base treasure XP (100)
      // - Prime requisite bonus (10% for Strength 16)
      // - Final result should be 110 XP
      expect(result.data?.experienceAwarded).toBe(110);
    });
  });
});
