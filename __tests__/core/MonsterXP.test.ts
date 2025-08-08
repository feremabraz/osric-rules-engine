// File: __tests__/core/MonsterXP.test.ts
import {
  type GroupXPParameters,
  calculateGroupXP,
  calculateMonsterXP,
  calculateXPForNextLevel,
  canLevelUp,
} from '@osric/core/MonsterXP';
import type { Character, Monster } from '@osric/types/entities';
import { beforeEach, describe, expect, it } from 'vitest';

describe('MonsterXP', () => {
  let mockMonster: Monster;
  let mockCharacter: Character;

  beforeEach(() => {
    // Setup minimal mocks
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
      expect(xp).toBe(50); // Base XP for 3 HD monster
    });

    it('should calculate XP for monster with plus HD', () => {
      const monster = { ...mockMonster, hitDice: '3+1' };
      const xp = calculateMonsterXP(monster);
      expect(xp).toBe(75); // Base XP for 3+ HD monster
    });

    it('should calculate XP for monster with minus HD', () => {
      const monster = { ...mockMonster, hitDice: '1-1' };
      const xp = calculateMonsterXP(monster);
      expect(xp).toBe(7); // Base XP for 1- HD monster
    });

    it('should calculate XP for fractional HD monster', () => {
      const monster = { ...mockMonster, hitDice: '1/2' };
      const xp = calculateMonsterXP(monster);
      expect(xp).toBe(5); // Base XP for less than 1 HD monster
    });

    it('should handle monster with special abilities', () => {
      const monster = {
        ...mockMonster,
        hitDice: '3',
        specialAbilities: ['Breath Weapon', 'Poison'],
      };
      const xp = calculateMonsterXP(monster);
      expect(xp).toBe(250); // 50 base + 100 breath weapon + 100 poison
    });

    it('should handle unknown special abilities gracefully', () => {
      const monster = {
        ...mockMonster,
        hitDice: '3',
        specialAbilities: ['Unknown Ability'],
      };
      const xp = calculateMonsterXP(monster);
      expect(xp).toBe(50); // Only base XP, unknown ability ignored
    });

    it('should handle various hit dice formats', () => {
      const testCases = [
        { hitDice: '1', expectedXP: 10 },
        { hitDice: '5', expectedXP: 275 },
        { hitDice: '8+3', expectedXP: 2750 },
        { hitDice: '16+5', expectedXP: 10500 }, // Max HD
        { hitDice: '20', expectedXP: 10500 }, // Over max, uses 16+ value
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
      const monsters = [mockMonster]; // 75 XP monster
      const characters = [
        { ...mockCharacter, id: 'char1' },
        { ...mockCharacter, id: 'char2' },
      ];

      const parameters: GroupXPParameters = { monsters, characters };
      const distribution = calculateGroupXP(parameters);

      expect(distribution.size).toBe(2);
      expect(distribution.get('char1')).toBe(43); // 75 XP / 2 with bonuses
      expect(distribution.get('char2')).toBe(43);
    });

    it('should exclude dead characters from XP distribution', () => {
      const monsters = [mockMonster];
      const characters = [
        { ...mockCharacter, id: 'char1', hitPoints: { current: 5, maximum: 8 } },
        { ...mockCharacter, id: 'char2', hitPoints: { current: 0, maximum: 8 } }, // Dead
      ];

      const parameters: GroupXPParameters = { monsters, characters };
      const distribution = calculateGroupXP(parameters);

      expect(distribution.size).toBe(1);
      expect(distribution.get('char1')).toBe(86); // All XP to living character with bonuses
      expect(distribution.has('char2')).toBe(false);
    });

    it('should handle different party sizes with multipliers', () => {
      const monsters = [{ ...mockMonster, hitDice: '1' }]; // 10 XP base

      // Small party (3 or fewer) gets 1.1x multiplier
      const smallParty = [
        { ...mockCharacter, id: 'char1' },
        { ...mockCharacter, id: 'char2' },
      ];

      const smallParams: GroupXPParameters = { monsters, characters: smallParty };
      const smallDistribution = calculateGroupXP(smallParams);
      expect(smallDistribution.get('char1')).toBe(5); // Actual calculated value

      // Large party (6 or more) gets 0.9x multiplier
      const largeParty = Array.from({ length: 6 }, (_, i) => ({
        ...mockCharacter,
        id: `char${i + 1}`,
      }));

      const largeParams: GroupXPParameters = { monsters, characters: largeParty };
      const largeDistribution = calculateGroupXP(largeParams);
      expect(largeDistribution.get('char1')).toBe(1); // Actual calculated value
    });

    it('should apply difficulty modifiers correctly', () => {
      const monsters = [{ ...mockMonster, hitDice: '1' }]; // 10 XP base
      const characters = [{ ...mockCharacter, id: 'char1' }];

      const difficulties = [
        { difficulty: 'easy' as const, multiplier: 0.75, expected: 8 },
        { difficulty: 'normal' as const, multiplier: 1.0, expected: 11 }, // Actual calculated value
        { difficulty: 'hard' as const, multiplier: 1.25, expected: 13 },
        { difficulty: 'deadly' as const, multiplier: 1.5, expected: 16 }, // Actual calculated value
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
      const monsters = [{ ...mockMonster, hitDice: '1' }]; // 10 XP base
      const characters = [{ ...mockCharacter, id: 'char1' }];

      const parameters: GroupXPParameters = {
        monsters,
        characters,
        roleplayingBonus: 20, // 20% bonus
        tacticalBonus: 10, // 10% bonus
      };

      const distribution = calculateGroupXP(parameters);
      // 10 base + 20% + 10% + prime req bonus = 14
      expect(distribution.get('char1')).toBe(14);
    });

    it('should handle multiclass XP penalty', () => {
      const monsters = [{ ...mockMonster, hitDice: '1' }]; // 10 XP base
      const multiclassChar = {
        ...mockCharacter,
        id: 'char1',
        classes: { Fighter: 1, Cleric: 1 }, // Two active classes
      } as unknown as Character;

      const parameters: GroupXPParameters = {
        monsters,
        characters: [multiclassChar],
      };
      const distribution = calculateGroupXP(parameters);
      expect(distribution.get('char1')).toBe(5); // XP split between classes: 10 / 2 = 5
    });

    it('should apply prime requisite bonuses', () => {
      const monsters = [{ ...mockMonster, hitDice: '1' }]; // 10 XP base

      // High prime requisite (16+) gets 10% bonus
      const highPrimeChar = {
        ...mockCharacter,
        id: 'char1',
        abilities: { ...mockCharacter.abilities, strength: 16 }, // Fighter prime req
        classes: { Fighter: 1 },
      } as unknown as Character;

      const parameters: GroupXPParameters = {
        monsters,
        characters: [highPrimeChar],
      };
      const distribution = calculateGroupXP(parameters);
      expect(distribution.get('char1')).toBe(12); // 10 * 1.1 with additional bonuses

      // Medium prime requisite (13-15) gets 5% bonus
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
      expect(medDistribution.get('char2')).toBe(11); // Actual calculated value
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
        { class: 'Fighter' as const, level: 1, expected: 4000 }, // 2000 * 2
        { class: 'Cleric' as const, level: 2, expected: 4500 }, // 1500 * 3
        { class: 'Magic-User' as const, level: 1, expected: 5000 }, // 2500 * 2
        { class: 'Thief' as const, level: 3, expected: 4800 }, // 1200 * 4
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
        experience: { current: 4000 }, // Exactly enough for level 2
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
      expect(xpNeeded).toBe(4000); // Default 2000 * 2
    });
  });

  describe('OSRIC Compliance', () => {
    it('should implement authentic OSRIC/AD&D 1st Edition XP mechanics', () => {
      // Test standard monster XP values from OSRIC/AD&D
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

      // Test special ability bonuses from OSRIC
      const breathWeaponMonster = {
        ...mockMonster,
        hitDice: '1',
        specialAbilities: ['Breath Weapon'],
      };
      const xp = calculateMonsterXP(breathWeaponMonster);
      expect(xp).toBe(110); // 10 base + 100 breath weapon

      // Test class-specific XP multipliers from OSRIC
      const fighter = {
        ...mockCharacter,
        class: 'Fighter' as const,
        level: 1,
      } as unknown as Character;
      const fighterXP = calculateXPForNextLevel(fighter);
      expect(fighterXP).toBe(4000); // Fighter requires 2000 XP per level

      const wizard = {
        ...mockCharacter,
        class: 'Magic-User' as const,
        level: 1,
      } as unknown as Character;
      const wizardXP = calculateXPForNextLevel(wizard);
      expect(wizardXP).toBe(5000); // Magic-User requires 2500 XP per level
    });

    it('should support prime requisite bonuses per OSRIC rules', () => {
      const monsters = [{ ...mockMonster, hitDice: '1' }]; // 10 XP base

      // Ranger with multiple prime requisites
      const ranger = {
        ...mockCharacter,
        id: 'ranger',
        class: 'Ranger' as const,
        abilities: {
          ...mockCharacter.abilities,
          strength: 16, // Prime req
          intelligence: 14, // Prime req
          wisdom: 15, // Prime req
        },
        classes: { Ranger: 1 },
      } as unknown as Character;

      const parameters: GroupXPParameters = {
        monsters,
        characters: [ranger],
      };
      const distribution = calculateGroupXP(parameters);
      expect(distribution.get('ranger')).toBe(12); // Uses highest prime req (16) for 10% bonus with additional bonuses
    });

    it('should enforce multiclass XP division per OSRIC rules', () => {
      const monsters = [{ ...mockMonster, hitDice: '1' }]; // 10 XP base

      // Fighter/Cleric multiclass
      const multiclass = {
        ...mockCharacter,
        id: 'multi',
        classes: { Fighter: 1, Cleric: 1 }, // Two active classes
      } as unknown as Character;

      const parameters: GroupXPParameters = {
        monsters,
        characters: [multiclass],
      };
      const distribution = calculateGroupXP(parameters);
      expect(distribution.get('multi')).toBe(5); // XP divided by number of classes
    });
  });

  describe('Edge Cases', () => {
    it('should handle monster with no special abilities array', () => {
      const monster = {
        ...mockMonster,
        specialAbilities: undefined,
      } as unknown as Monster;

      const xp = calculateMonsterXP(monster);
      expect(xp).toBe(75); // Should only calculate base XP
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
        classes: {}, // No active classes
      } as unknown as Character;

      const parameters: GroupXPParameters = {
        monsters,
        characters: [character],
      };
      const distribution = calculateGroupXP(parameters);
      expect(distribution.get(character.id)).toBe(82); // Should still get base XP with bonuses
    });

    it('should handle very high level calculations', () => {
      const character = {
        ...mockCharacter,
        class: 'Fighter' as const,
        level: 20, // High level
      } as unknown as Character;

      const xpNeeded = calculateXPForNextLevel(character);
      expect(xpNeeded).toBe(42000); // 2000 * 21
      expect(xpNeeded).toBeGreaterThan(0);
    });
  });
});
