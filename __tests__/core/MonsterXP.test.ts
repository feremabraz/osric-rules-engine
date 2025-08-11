import {
  type GroupXPParameters,
  calculateGroupXP,
  calculateMonsterXP,
  calculateXPForNextLevel,
  canLevelUp,
} from '@osric/core/MonsterXP';
import type { Character } from '@osric/types/character';
import type { Monster } from '@osric/types/monster';
import { beforeEach, describe, expect, it } from 'vitest';

describe('MonsterXP', () => {
  let mockMonster: Monster;
  let mockCharacter: Character;

  beforeEach(() => {
    mockMonster = {
      id: 'test-monster',
      name: 'Test Monster',
      hitDice: '3+1',
      hitPoints: { current: 15, maximum: 15 },
      specialAbilities: [],
    } as unknown as Monster;

    mockCharacter = {
      id: 'test-character',
      name: 'Test Character',
      class: 'Fighter',
      level: 1,
      hitPoints: { current: 8, maximum: 8 },
      abilities: {
        strength: 15,
        dexterity: 12,
        constitution: 14,
        intelligence: 10,
        wisdom: 11,
        charisma: 13,
      },
      classes: { Fighter: 1 },
      experience: { current: 0 },
    } as unknown as Character;
  });

  describe('Monster XP Calculation', () => {
    it('should calculate XP for basic monster with no special abilities', () => {
      const monster = { ...mockMonster, hitDice: '3', specialAbilities: [] };
      const xp = calculateMonsterXP(monster);
      expect(xp).toBe(50);
    });

    it('should calculate XP for monster with plus HD', () => {
      const monster = { ...mockMonster, hitDice: '3+1' };
      const xp = calculateMonsterXP(monster);
      expect(xp).toBe(75);
    });

    it('should calculate XP for monster with minus HD', () => {
      const monster = { ...mockMonster, hitDice: '1-1' };
      const xp = calculateMonsterXP(monster);
      expect(xp).toBe(7);
    });

    it('should calculate XP for fractional HD monster', () => {
      const monster = { ...mockMonster, hitDice: '1/2' };
      const xp = calculateMonsterXP(monster);
      expect(xp).toBe(5);
    });

    it('should handle monster with special abilities', () => {
      const monster = {
        ...mockMonster,
        hitDice: '3',
        specialAbilities: ['Breath Weapon', 'Poison'],
      };
      const xp = calculateMonsterXP(monster);
      expect(xp).toBe(250);
    });

    it('should handle unknown special abilities gracefully', () => {
      const monster = {
        ...mockMonster,
        hitDice: '3',
        specialAbilities: ['Unknown Ability'],
      };
      const xp = calculateMonsterXP(monster);
      expect(xp).toBe(50);
    });

    it('should handle various hit dice formats', () => {
      const testCases = [
        { hitDice: '1', expectedXP: 10 },
        { hitDice: '5', expectedXP: 275 },
        { hitDice: '8+3', expectedXP: 2750 },
        { hitDice: '16+5', expectedXP: 10500 },
        { hitDice: '20', expectedXP: 10500 },
      ];

      for (const testCase of testCases) {
        const monster = { ...mockMonster, hitDice: testCase.hitDice };
        const xp = calculateMonsterXP(monster);
        expect(xp).toBe(testCase.expectedXP);
      }
    });

    it('should ensure minimum XP of 1', () => {
      const monster = { ...mockMonster, hitDice: '0' };
      const xp = calculateMonsterXP(monster);
      expect(xp).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Group XP Distribution', () => {
    it('should distribute XP equally among active party members', () => {
      const monsters = [mockMonster];
      const characters = [
        { ...mockCharacter, id: 'char1' },
        { ...mockCharacter, id: 'char2' },
      ];

      const parameters: GroupXPParameters = { monsters, characters };
      const distribution = calculateGroupXP(parameters);

      expect(distribution.size).toBe(2);
      expect(distribution.get('char1')).toBe(43);
      expect(distribution.get('char2')).toBe(43);
    });

    it('should exclude dead characters from XP distribution', () => {
      const monsters = [mockMonster];
      const characters = [
        { ...mockCharacter, id: 'char1', hitPoints: { current: 5, maximum: 8 } },
        { ...mockCharacter, id: 'char2', hitPoints: { current: 0, maximum: 8 } },
      ];

      const parameters: GroupXPParameters = { monsters, characters };
      const distribution = calculateGroupXP(parameters);

      expect(distribution.size).toBe(1);
      expect(distribution.get('char1')).toBe(86);
      expect(distribution.has('char2')).toBe(false);
    });

    it('should handle different party sizes with multipliers', () => {
      const monsters = [{ ...mockMonster, hitDice: '1' }];

      const smallParty = [
        { ...mockCharacter, id: 'char1' },
        { ...mockCharacter, id: 'char2' },
      ];

      const smallParams: GroupXPParameters = { monsters, characters: smallParty };
      const smallDistribution = calculateGroupXP(smallParams);
      expect(smallDistribution.get('char1')).toBe(5);

      const largeParty = Array.from({ length: 6 }, (_, i) => ({
        ...mockCharacter,
        id: `char${i + 1}`,
      }));

      const largeParams: GroupXPParameters = { monsters, characters: largeParty };
      const largeDistribution = calculateGroupXP(largeParams);
      expect(largeDistribution.get('char1')).toBe(1);
    });

    it('should apply difficulty modifiers correctly', () => {
      const monsters = [{ ...mockMonster, hitDice: '1' }];
      const characters = [{ ...mockCharacter, id: 'char1' }];

      const difficulties = [
        { difficulty: 'easy' as const, multiplier: 0.75, expected: 8 },
        { difficulty: 'normal' as const, multiplier: 1.0, expected: 11 },
        { difficulty: 'hard' as const, multiplier: 1.25, expected: 13 },
        { difficulty: 'deadly' as const, multiplier: 1.5, expected: 16 },
      ];

      for (const test of difficulties) {
        const parameters: GroupXPParameters = {
          monsters,
          characters,
          encounterDifficulty: test.difficulty,
        };
        const distribution = calculateGroupXP(parameters);
        expect(distribution.get('char1')).toBe(test.expected);
      }
    });

    it('should apply roleplaying and tactical bonuses', () => {
      const monsters = [{ ...mockMonster, hitDice: '1' }];
      const characters = [{ ...mockCharacter, id: 'char1' }];

      const parameters: GroupXPParameters = {
        monsters,
        characters,
        roleplayingBonus: 20,
        tacticalBonus: 10,
      };

      const distribution = calculateGroupXP(parameters);

      expect(distribution.get('char1')).toBe(14);
    });

    it('should handle multiclass XP penalty', () => {
      const monsters = [{ ...mockMonster, hitDice: '1' }];
      const multiclassChar = {
        ...mockCharacter,
        id: 'char1',
        classes: { Fighter: 1, Cleric: 1 },
      } as unknown as Character;

      const parameters: GroupXPParameters = {
        monsters,
        characters: [multiclassChar],
      };
      const distribution = calculateGroupXP(parameters);
      expect(distribution.get('char1')).toBe(5);
    });

    it('should apply prime requisite bonuses', () => {
      const monsters = [{ ...mockMonster, hitDice: '1' }];

      const highPrimeChar = {
        ...mockCharacter,
        id: 'char1',
        abilities: { ...mockCharacter.abilities, strength: 16 },
        classes: { Fighter: 1 },
      } as unknown as Character;

      const parameters: GroupXPParameters = {
        monsters,
        characters: [highPrimeChar],
      };
      const distribution = calculateGroupXP(parameters);
      expect(distribution.get('char1')).toBe(12);

      const medPrimeChar = {
        ...mockCharacter,
        id: 'char2',
        abilities: { ...mockCharacter.abilities, strength: 13 },
        classes: { Fighter: 1 },
      } as unknown as Character;

      const medParams: GroupXPParameters = {
        monsters,
        characters: [medPrimeChar],
      };
      const medDistribution = calculateGroupXP(medParams);
      expect(medDistribution.get('char2')).toBe(11);
    });

    it('should return empty map for no active characters', () => {
      const monsters = [mockMonster];
      const characters = [{ ...mockCharacter, id: 'char1', hitPoints: { current: 0, maximum: 8 } }];

      const parameters: GroupXPParameters = { monsters, characters };
      const distribution = calculateGroupXP(parameters);

      expect(distribution.size).toBe(0);
    });
  });

  describe('Character Advancement', () => {
    it('should calculate XP needed for next level correctly', () => {
      const testCases = [
        { class: 'Fighter' as const, level: 1, expected: 4000 },
        { class: 'Cleric' as const, level: 2, expected: 4500 },
        { class: 'Magic-User' as const, level: 1, expected: 5000 },
        { class: 'Thief' as const, level: 3, expected: 4800 },
      ];

      for (const testCase of testCases) {
        const character = {
          ...mockCharacter,
          class: testCase.class,
          level: testCase.level,
        } as unknown as Character;
        const xpNeeded = calculateXPForNextLevel(character);
        expect(xpNeeded).toBe(testCase.expected);
      }
    });

    it('should determine if character can level up', () => {
      const character = {
        ...mockCharacter,
        class: 'Fighter' as const,
        level: 1,
        experience: { current: 4000 },
      } as unknown as Character;

      expect(canLevelUp(character)).toBe(true);

      character.experience.current = 3999;
      expect(canLevelUp(character)).toBe(false);
    });

    it('should handle unknown class with default multiplier', () => {
      const character = {
        ...mockCharacter,
        class: 'Unknown Class',
        level: 1,
      } as unknown as Character;

      const xpNeeded = calculateXPForNextLevel(character);
      expect(xpNeeded).toBe(4000);
    });
  });

  describe('OSRIC Compliance', () => {
    it('should implement authentic OSRIC/AD&D 1st Edition XP mechanics', () => {
      const standardMonsters = [
        { hitDice: '1', expectedXP: 10 },
        { hitDice: '3', expectedXP: 50 },
        { hitDice: '5+2', expectedXP: 425 },
        { hitDice: '8+8', expectedXP: 2750 },
      ];

      for (const test of standardMonsters) {
        const monster = { ...mockMonster, hitDice: test.hitDice };
        const xp = calculateMonsterXP(monster);
        expect(xp).toBe(test.expectedXP);
      }

      const breathWeaponMonster = {
        ...mockMonster,
        hitDice: '1',
        specialAbilities: ['Breath Weapon'],
      };
      const xp = calculateMonsterXP(breathWeaponMonster);
      expect(xp).toBe(110);

      const fighter = {
        ...mockCharacter,
        class: 'Fighter' as const,
        level: 1,
      } as unknown as Character;
      const fighterXP = calculateXPForNextLevel(fighter);
      expect(fighterXP).toBe(4000);

      const wizard = {
        ...mockCharacter,
        class: 'Magic-User' as const,
        level: 1,
      } as unknown as Character;
      const wizardXP = calculateXPForNextLevel(wizard);
      expect(wizardXP).toBe(5000);
    });

    it('should support prime requisite bonuses per OSRIC rules', () => {
      const monsters = [{ ...mockMonster, hitDice: '1' }];

      const ranger = {
        ...mockCharacter,
        id: 'ranger',
        class: 'Ranger' as const,
        abilities: {
          ...mockCharacter.abilities,
          strength: 16,
          intelligence: 14,
          wisdom: 15,
        },
        classes: { Ranger: 1 },
      } as unknown as Character;

      const parameters: GroupXPParameters = {
        monsters,
        characters: [ranger],
      };
      const distribution = calculateGroupXP(parameters);
      expect(distribution.get('ranger')).toBe(12);
    });

    it('should enforce multiclass XP division per OSRIC rules', () => {
      const monsters = [{ ...mockMonster, hitDice: '1' }];

      const multiclass = {
        ...mockCharacter,
        id: 'multi',
        classes: { Fighter: 1, Cleric: 1 },
      } as unknown as Character;

      const parameters: GroupXPParameters = {
        monsters,
        characters: [multiclass],
      };
      const distribution = calculateGroupXP(parameters);
      expect(distribution.get('multi')).toBe(5);
    });
  });

  describe('Edge Cases', () => {
    it('should handle monster with no special abilities array', () => {
      const monster = {
        ...mockMonster,
        specialAbilities: undefined,
      } as unknown as Monster;

      const xp = calculateMonsterXP(monster);
      expect(xp).toBe(75);
    });

    it('should handle empty monsters array', () => {
      const parameters: GroupXPParameters = {
        monsters: [],
        characters: [mockCharacter],
      };
      const distribution = calculateGroupXP(parameters);
      expect(distribution.get(mockCharacter.id)).toBe(0);
    });

    it('should handle character with no active classes', () => {
      const monsters = [mockMonster];
      const character = {
        ...mockCharacter,
        classes: {},
      } as unknown as Character;

      const parameters: GroupXPParameters = {
        monsters,
        characters: [character],
      };
      const distribution = calculateGroupXP(parameters);
      expect(distribution.get(character.id)).toBe(82);
    });

    it('should handle very high level calculations', () => {
      const character = {
        ...mockCharacter,
        class: 'Fighter' as const,
        level: 20,
      } as unknown as Character;

      const xpNeeded = calculateXPForNextLevel(character);
      expect(xpNeeded).toBe(42000);
      expect(xpNeeded).toBeGreaterThan(0);
    });
  });
});
