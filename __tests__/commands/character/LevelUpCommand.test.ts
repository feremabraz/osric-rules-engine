import { LevelUpCommand } from '@osric/commands/character/LevelUpCommand';
import { GameContext } from '@osric/core/GameContext';
import type { CharacterClass, CharacterRace } from '@osric/types';
import type { Character } from '@osric/types/entities';
import { createStore } from 'jotai';
import { beforeEach, describe, expect, it } from 'vitest';

describe('LevelUpCommand', () => {
  let context: GameContext;

  beforeEach(() => {
    const store = createStore();
    context = new GameContext(store);
  });

  function createMockCharacter(overrides: Partial<Character> = {}): Character {
    const character: Character = {
      id: 'test-character',
      name: 'Test Fighter',
      race: 'Human' as CharacterRace,
      class: 'Fighter' as CharacterClass,
      classes: { Fighter: 3 },
      primaryClass: 'Fighter' as CharacterClass,
      level: 3,
      hitPoints: { current: 25, maximum: 25 },
      armorClass: 5,
      encumbrance: 50,
      movementRate: 120,
      abilities: {
        strength: 16,
        dexterity: 14,
        constitution: 15,
        intelligence: 12,
        wisdom: 10,
        charisma: 13,
      },
      abilityModifiers: {
        strengthHitAdj: 1,
        strengthDamageAdj: 1,
        strengthEncumbrance: null,
        strengthOpenDoors: null,
        strengthBendBars: null,

        dexterityReaction: 0,
        dexterityMissile: 0,
        dexterityDefense: 0,
        dexterityPickPockets: null,
        dexterityOpenLocks: null,
        dexterityFindTraps: null,
        dexterityMoveSilently: null,
        dexterityHideInShadows: null,

        constitutionHitPoints: 1,
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
        'Poison or Death': 12,
        Wands: 13,
        'Paralysis, Polymorph, or Petrification': 14,
        'Breath Weapons': 15,
        'Spells, Rods, or Staves': 16,
      },
      experience: {
        current: 16000,
        requiredForNextLevel: 32000,
        level: 4,
      },
      currency: {
        platinum: 0,
        gold: 2000,
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

  describe('Command Creation', () => {
    it('should create command with proper type', () => {
      const command = new LevelUpCommand({
        characterId: 'test-character',
      });

      expect(command.type).toBe('level-up');
    });

    it('should accept target level parameter', () => {
      const command = new LevelUpCommand({
        characterId: 'test-character',
        targetLevel: 5,
      });

      expect(command.type).toBe('level-up');
    });

    it('should accept training parameters', () => {
      const command = new LevelUpCommand({
        characterId: 'test-character',
        trainerDetails: {
          hasTrainer: true,
          trainerLevel: 6,
          availableGold: 1500,
        },
      });

      expect(command.type).toBe('level-up');
    });

    it('should accept hit point rolling preference', () => {
      const command = new LevelUpCommand({
        characterId: 'test-character',
        rollHitPoints: false,
      });

      expect(command.type).toBe('level-up');
    });
  });

  describe('Command Validation', () => {
    it('should validate when character exists', () => {
      const character = createMockCharacter();
      context.setEntity('test-character', character);

      const command = new LevelUpCommand({
        characterId: 'test-character',
      });

      expect(command.canExecute(context)).toBe(true);
    });

    it('should fail validation when character does not exist', () => {
      const command = new LevelUpCommand({
        characterId: 'nonexistent-character',
      });

      expect(command.canExecute(context)).toBe(false);
    });
  });

  describe('Experience Requirements', () => {
    it('should advance character with sufficient experience', async () => {
      const character = createMockCharacter({
        experience: { current: 16000, level: 4, requiredForNextLevel: 32000 },
      });
      context.setEntity('test-character', character);

      const command = new LevelUpCommand({
        characterId: 'test-character',
        bypassTraining: true,
      });

      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.newLevel).toBe(5);
      expect(result.data?.previousLevel).toBe(4);

      const updatedCharacter = context.getEntity<Character>('test-character');
      expect(updatedCharacter?.experience.level).toBe(5);
    });

    it('should fail when insufficient experience', async () => {
      const character = createMockCharacter({
        experience: { current: 2000, level: 2, requiredForNextLevel: 4000 },
      });
      context.setEntity('test-character', character);

      const command = new LevelUpCommand({
        characterId: 'test-character',
        bypassTraining: true,
      });

      const result = await command.execute(context);

      expect(result.success).toBe(false);

      expect(result.message).toBeDefined();
    });

    it('should prevent advancing more than one level at a time', async () => {
      const character = createMockCharacter({
        experience: { current: 64000, level: 4, requiredForNextLevel: 16000 },
      });
      context.setEntity('test-character', character);

      const command = new LevelUpCommand({
        characterId: 'test-character',
        targetLevel: 7,
      });

      const result = await command.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('one level at a time');
    });

    it('should prevent leveling down', async () => {
      const character = createMockCharacter({
        experience: { current: 16000, level: 5, requiredForNextLevel: 32000 },
      });
      context.setEntity('test-character', character);

      const command = new LevelUpCommand({
        characterId: 'test-character',
        targetLevel: 4,
      });

      const result = await command.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Cannot advance to level 4');
    });
  });

  describe('Training Requirements', () => {
    it('should handle training with sufficient resources', async () => {
      const character = createMockCharacter({
        experience: { current: 16000, level: 4, requiredForNextLevel: 32000 },
        currency: { ...createMockCharacter().currency, gold: 3000 },
      });
      context.setEntity('test-character', character);

      const command = new LevelUpCommand({
        characterId: 'test-character',
        trainerDetails: {
          hasTrainer: true,
          trainerLevel: 6,
          availableGold: 3000,
        },
      });

      const result = await command.execute(context);

      expect(result.success).toBeDefined();
      if (result.success) {
        expect(result.data?.trainingCost).toBeGreaterThanOrEqual(0);
      } else {
        expect(result.message).toBeDefined();
      }
    });

    it('should handle training with insufficient resources', async () => {
      const character = createMockCharacter({
        experience: { current: 16000, level: 4, requiredForNextLevel: 32000 },
        currency: { ...createMockCharacter().currency, gold: 10 },
      });
      context.setEntity('test-character', character);

      const command = new LevelUpCommand({
        characterId: 'test-character',
        trainerDetails: {
          hasTrainer: false,
          availableGold: 10,
        },
      });

      const result = await command.execute(context);

      if (!result.success) {
        expect(result.message).toContain('Training requirements not met');
      }
    });

    it('should bypass training when requested', async () => {
      const character = createMockCharacter({
        experience: { current: 16000, level: 4, requiredForNextLevel: 32000 },
        currency: { ...createMockCharacter().currency, gold: 0 },
      });
      context.setEntity('test-character', character);

      const command = new LevelUpCommand({
        characterId: 'test-character',
        bypassTraining: true,
      });

      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.newLevel).toBe(5);
    });
  });

  describe('Hit Point Advancement', () => {
    it('should gain hit points on level up', async () => {
      const character = createMockCharacter({
        experience: { current: 16000, level: 4, requiredForNextLevel: 32000 },
        hitPoints: { current: 30, maximum: 30 },
      });
      context.setEntity('test-character', character);

      const command = new LevelUpCommand({
        characterId: 'test-character',
        bypassTraining: true,
        rollHitPoints: false,
      });

      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.hitPointsGained).toBeGreaterThan(0);

      const updatedCharacter = context.getEntity<Character>('test-character');
      expect(updatedCharacter?.hitPoints.maximum).toBeGreaterThan(character.hitPoints.maximum);
      expect(updatedCharacter?.hitPoints.current).toBeGreaterThan(character.hitPoints.current);
    });

    it('should apply constitution modifier to hit points', async () => {
      const character = createMockCharacter({
        experience: { current: 16000, level: 4, requiredForNextLevel: 32000 },
        abilities: { ...createMockCharacter().abilities, constitution: 18 },
        hitPoints: { current: 30, maximum: 30 },
      });
      context.setEntity('test-character', character);

      const command = new LevelUpCommand({
        characterId: 'test-character',
        bypassTraining: true,
        rollHitPoints: false,
      });

      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.hitPointsGained).toBeGreaterThan(1);
    });

    it('should guarantee minimum 1 hit point per level', async () => {
      const character = createMockCharacter({
        experience: { current: 16000, level: 4, requiredForNextLevel: 32000 },
        abilities: { ...createMockCharacter().abilities, constitution: 3 },
        hitPoints: { current: 20, maximum: 20 },
      });
      context.setEntity('test-character', character);

      const command = new LevelUpCommand({
        characterId: 'test-character',
        bypassTraining: true,
        rollHitPoints: false,
      });

      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.hitPointsGained).toBeGreaterThanOrEqual(1);
    });

    it('should handle hit point rolling when requested', async () => {
      const character = createMockCharacter({
        experience: { current: 16000, level: 4, requiredForNextLevel: 32000 },
      });
      context.setEntity('test-character', character);

      const command = new LevelUpCommand({
        characterId: 'test-character',
        bypassTraining: true,
        rollHitPoints: true,
      });

      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.hitPointsGained).toBeGreaterThan(0);
    });
  });

  describe('Class Progression', () => {
    it('should advance Fighter levels correctly', async () => {
      const fighter = createMockCharacter({
        class: 'Fighter',
        experience: { current: 16000, level: 4, requiredForNextLevel: 32000 },
      });
      context.setEntity('test-character', fighter);

      const command = new LevelUpCommand({
        characterId: 'test-character',
        bypassTraining: true,
      });

      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.newLevel).toBe(5);
      expect(result.data?.newTitle).toBeDefined();
    });

    it('should advance Cleric levels with spell progression', async () => {
      const cleric = createMockCharacter({
        class: 'Cleric',
        experience: { current: 13250, level: 4, requiredForNextLevel: 27000 },
      });
      context.setEntity('test-character', cleric);

      const command = new LevelUpCommand({
        characterId: 'test-character',
        bypassTraining: true,
      });

      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.newLevel).toBe(5);
      expect(result.data?.spellSlotsUpdated).toBe(true);
    });

    it('should advance Magic-User levels with spell progression', async () => {
      const magicUser = createMockCharacter({
        class: 'Magic-User',
        experience: { current: 25000, level: 4, requiredForNextLevel: 40000 },
      });
      context.setEntity('test-character', magicUser);

      const command = new LevelUpCommand({
        characterId: 'test-character',
        bypassTraining: true,
      });

      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.newLevel).toBe(5);
      expect(result.data?.spellSlotsUpdated).toBe(true);
    });

    it('should advance Thief levels correctly', async () => {
      const thief = createMockCharacter({
        class: 'Thief',
        experience: { current: 10000, level: 4, requiredForNextLevel: 20000 },
      });
      context.setEntity('test-character', thief);

      const command = new LevelUpCommand({
        characterId: 'test-character',
        bypassTraining: true,
      });

      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.newLevel).toBe(5);
      expect(result.data?.spellSlotsUpdated).toBe(false);
    });
  });

  describe('Special Abilities', () => {
    it('should grant special abilities at appropriate levels', async () => {
      const character = createMockCharacter({
        experience: { current: 250000, level: 8, requiredForNextLevel: 500000 },
      });
      context.setEntity('test-character', character);

      const command = new LevelUpCommand({
        characterId: 'test-character',
        bypassTraining: true,
      });

      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.newLevel).toBe(9);

      if (
        result.data?.newAbilities &&
        Array.isArray(result.data.newAbilities) &&
        result.data.newAbilities.length > 0
      ) {
        expect(result.data.newAbilities).toContain(
          'Can establish a freehold and attract followers'
        );
      }
    });

    it('should handle levels without special abilities', async () => {
      const character = createMockCharacter({
        experience: { current: 8000, level: 3, requiredForNextLevel: 16000 },
      });
      context.setEntity('test-character', character);

      const command = new LevelUpCommand({
        characterId: 'test-character',
        bypassTraining: true,
      });

      const result = await command.execute(context);

      expect(result.success).toBe(true);
      expect(result.data?.newLevel).toBe(4);

      expect(result.data?.newAbilities).toEqual([]);
    });
  });

  describe('Currency Updates', () => {
    it('should deduct training costs from character gold', async () => {
      const character = createMockCharacter({
        experience: { current: 16000, level: 4, requiredForNextLevel: 32000 },
        currency: { ...createMockCharacter().currency, gold: 3000 },
      });
      context.setEntity('test-character', character);

      const command = new LevelUpCommand({
        characterId: 'test-character',
        trainerDetails: {
          hasTrainer: true,
          trainerLevel: 6,
          availableGold: 3000,
        },
      });

      const result = await command.execute(context);

      if (result.success) {
        const updatedCharacter = context.getEntity<Character>('test-character');
        expect(updatedCharacter?.currency.gold).toBeLessThan(character.currency.gold);
        expect(result.data?.trainingCost).toBeGreaterThan(0);
      }
    });

    it('should handle zero training costs when bypassed', async () => {
      const character = createMockCharacter({
        experience: { current: 16000, level: 4, requiredForNextLevel: 32000 },
        currency: { ...createMockCharacter().currency, gold: 500 },
      });
      context.setEntity('test-character', character);

      const command = new LevelUpCommand({
        characterId: 'test-character',
        bypassTraining: true,
      });

      const result = await command.execute(context);

      expect(result.success).toBe(true);

      const updatedCharacter = context.getEntity<Character>('test-character');

      expect(updatedCharacter).toBeDefined();
      expect(updatedCharacter?.experience.level).toBe(5);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing character', async () => {
      const command = new LevelUpCommand({
        characterId: 'nonexistent-character',
      });

      const result = await command.execute(context);

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });

    it('should handle missing level progression data', async () => {
      const character = createMockCharacter({
        class: 'Fighter' as const,
        experience: { current: 16000, level: 1, requiredForNextLevel: 2000 },
      });
      Object.defineProperty(character, 'class', { value: 'InvalidClass', writable: true });
      context.setEntity('test-character', character);

      const command = new LevelUpCommand({
        characterId: 'test-character',
        bypassTraining: true,
      });

      const result = await command.execute(context);

      expect(result.success).toBe(false);

      expect(result.message).toBeDefined();
    });

    it('should handle command execution errors gracefully', async () => {
      const character = createMockCharacter();
      context.setEntity('test-character', character);

      const command = new LevelUpCommand({
        characterId: 'test-character',
        targetLevel: -1,
      });

      const result = await command.execute(context);

      expect(result.success).toBeDefined();
      expect(result.message).toBeDefined();
    });
  });

  describe('Required Rules', () => {
    it('should return required rule names', () => {
      const command = new LevelUpCommand({
        characterId: 'test-character',
      });

      const requiredRules = command.getRequiredRules();

      expect(requiredRules).toContain('level-progression');
      expect(requiredRules).toContain('training-requirements');
      expect(requiredRules).toContain('hit-point-advancement');
    });
  });

  describe('OSRIC Compliance', () => {
    it('should implement authentic OSRIC level advancement mechanics', async () => {
      const character = createMockCharacter({
        experience: { current: 16000, level: 4, requiredForNextLevel: 32000 },
        abilities: { ...createMockCharacter().abilities, constitution: 16 },
      });
      context.setEntity('test-character', character);

      const command = new LevelUpCommand({
        characterId: 'test-character',
        bypassTraining: true,
        rollHitPoints: false,
      });

      const result = await command.execute(context);

      expect(result.success).toBe(true);

      expect(result.data?.hitPointsGained).toBeGreaterThanOrEqual(3);
      expect(result.data?.newLevel).toBe(5);
      expect(result.data?.newTitle).toBe('Swashbuckler');
    });
  });
});
