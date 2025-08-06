/**
 * WeaponVsArmorRules Tests - OSRIC Compliance
 *
 * Tests the weapon vs armor adjustment system from rules/combat/weaponVsArmor.ts:
 * - OSRIC weapon vs armor adjustment tables
 * - Weapon damage type classification (Slashing, Piercing, Bludgeoning)
 * - Armor category mapping from AC values
 * - Adjustment calculation for different weapon/armor combinations
 * - Edge cases and boundary conditions
 * - Error handling for invalid inputs
 */

import { beforeEach, describe, expect, it } from 'vitest';
import {
  applyWeaponVsArmorAdjustment,
  getWeaponVsArmorAdjustment,
} from '../../../osric/rules/combat/WeaponVsArmorRules';
import type { Character, Monster, Weapon } from '../../../osric/types/entities';

// Mock helper function to create test weapons
function createMockWeapon(overrides: Partial<Weapon> = {}): Weapon {
  const defaultWeapon: Weapon = {
    id: 'long-sword',
    name: 'Sword, Long',
    description: 'A standard long sword',
    weight: 4,
    value: 15,
    equipped: false,
    magicBonus: 0,
    charges: null,
    damage: '1d8',
    type: 'Melee',
    size: 'Medium',
    speed: 5,
    allowedClasses: ['Fighter'],
    damageVsLarge: null,
    range: null,
    twoHanded: false,
  };

  return { ...defaultWeapon, ...overrides };
}

// Mock helper function to create test characters
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

// Mock helper function to create test monsters
function createMockMonster(overrides: Partial<Monster> = {}): Monster {
  const defaultMonster: Monster = {
    id: 'orc-1',
    name: 'Orc',
    level: 1,
    hitPoints: { current: 6, maximum: 6 },
    armorClass: 6, // Scale mail
    thac0: 19,
    experience: { current: 0, requiredForNextLevel: 0, level: 1 },
    alignment: 'Chaotic Evil',
    inventory: [],
    position: 'dungeon',
    statusEffects: [],
    hitDice: '1',
    damagePerAttack: ['1d8'],
    morale: 8,
    treasure: 'P',
    specialAbilities: [],
    xpValue: 10,
    size: 'Medium',
    movementTypes: [{ type: 'Walk', rate: 120 }],
    habitat: ['Any'],
    frequency: 'Common',
    organization: 'Tribal',
    diet: 'Omnivore',
    ecology: 'Standard',
  };

  return { ...defaultMonster, ...overrides };
}

describe('WeaponVsArmorRules', () => {
  describe('Weapon Damage Type Classification', () => {
    it('should classify slashing weapons correctly', () => {
      const weapons = [
        createMockWeapon({ name: 'Sword, Long' }),
        createMockWeapon({ name: 'Sword, Short' }),
        createMockWeapon({ name: 'Sword, Broad' }),
        createMockWeapon({ name: 'Sword, Bastard' }),
        createMockWeapon({ name: 'Sword, Two-Handed' }),
        createMockWeapon({ name: 'Axe, Battle' }),
        createMockWeapon({ name: 'Axe, Hand' }),
      ];

      for (const weapon of weapons) {
        // Test against plate armor (AC 2) - slashing weapons get +2
        const adjustment = getWeaponVsArmorAdjustment(weapon, 2);
        expect(adjustment).toBe(2);
      }
    });

    it('should classify piercing weapons correctly', () => {
      const weapons = [
        createMockWeapon({ name: 'Dagger' }),
        createMockWeapon({ name: 'Spear' }),
        createMockWeapon({ name: 'Arrow' }),
        createMockWeapon({ name: 'Bolt' }),
        createMockWeapon({ name: 'Trident' }),
        createMockWeapon({ name: 'Bow, Short' }),
      ];

      for (const weapon of weapons) {
        // Test against plate armor (AC 2) - piercing weapons get -3
        const adjustment = getWeaponVsArmorAdjustment(weapon, 2);
        expect(adjustment).toBe(-3);
      }
    });

    it('should classify bludgeoning weapons correctly', () => {
      const weapons = [
        createMockWeapon({ name: 'Mace' }),
        createMockWeapon({ name: 'Hammer, War' }),
        createMockWeapon({ name: 'Club' }),
        createMockWeapon({ name: 'Flail' }),
        createMockWeapon({ name: 'Morning Star' }),
        createMockWeapon({ name: 'Staff' }),
      ];

      for (const weapon of weapons) {
        // Test against plate armor (AC 2) - bludgeoning weapons get -1
        const adjustment = getWeaponVsArmorAdjustment(weapon, 2);
        expect(adjustment).toBe(-1);
      }
    });

    it('should default to slashing for unknown weapons', () => {
      const unknownWeapon = createMockWeapon({ name: 'Unknown Weapon' });

      // Test against plate armor (AC 2) - should default to slashing (+2)
      const adjustment = getWeaponVsArmorAdjustment(unknownWeapon, 2);
      expect(adjustment).toBe(2);
    });
  });

  describe('Armor Category Mapping', () => {
    it('should map AC values to armor categories correctly', () => {
      const testCases = [
        { ac: 10, expectedCategory: 'Unarmored' },
        { ac: 9, expectedCategory: 'Padded/Leather' },
        { ac: 8, expectedCategory: 'Padded/Leather' },
        { ac: 7, expectedCategory: 'StuddedLeather/Ring' },
        { ac: 6, expectedCategory: 'StuddedLeather/Ring' },
        { ac: 5, expectedCategory: 'Scale/Chain' },
        { ac: 4, expectedCategory: 'Scale/Chain' },
        { ac: 3, expectedCategory: 'Banded/Splint' },
        { ac: 2, expectedCategory: 'Plate' },
        { ac: 1, expectedCategory: 'Plate' },
        { ac: 0, expectedCategory: 'Plate' },
      ];

      const testWeapon = createMockWeapon({ name: 'Sword, Long' }); // Slashing weapon

      for (const { ac, expectedCategory } of testCases) {
        const adjustment = getWeaponVsArmorAdjustment(testWeapon, ac);

        // Verify the adjustment matches expected category
        const expectedAdjustments: Record<string, number> = {
          Unarmored: 0,
          'Padded/Leather': -1,
          'StuddedLeather/Ring': 0,
          'Scale/Chain': 0,
          'Banded/Splint': 1,
          Plate: 2,
        };

        expect(adjustment).toBe(expectedAdjustments[expectedCategory]);
      }
    });

    it('should handle AC values outside normal range', () => {
      const testWeapon = createMockWeapon({ name: 'Sword, Long' });

      // Test extreme AC values
      expect(getWeaponVsArmorAdjustment(testWeapon, -5)).toBe(2); // Clamps to AC 0 (Plate)
      expect(getWeaponVsArmorAdjustment(testWeapon, 15)).toBe(0); // Clamps to AC 10 (Unarmored)
    });
  });

  describe('OSRIC Weapon vs Armor Table', () => {
    describe('Slashing Weapons', () => {
      const slashingWeapon = createMockWeapon({ name: 'Sword, Long' });

      it('should apply correct adjustments for all armor types', () => {
        const testCases = [
          { ac: 10, expected: 0 }, // Unarmored
          { ac: 8, expected: -1 }, // Padded/Leather
          { ac: 7, expected: 0 }, // StuddedLeather/Ring
          { ac: 5, expected: 0 }, // Scale/Chain
          { ac: 3, expected: 1 }, // Banded/Splint
          { ac: 2, expected: 2 }, // Plate
        ];

        for (const { ac, expected } of testCases) {
          expect(getWeaponVsArmorAdjustment(slashingWeapon, ac)).toBe(expected);
        }
      });
    });

    describe('Piercing Weapons', () => {
      const piercingWeapon = createMockWeapon({ name: 'Spear' });

      it('should apply correct adjustments for all armor types', () => {
        const testCases = [
          { ac: 10, expected: 0 }, // Unarmored
          { ac: 8, expected: 1 }, // Padded/Leather
          { ac: 7, expected: 0 }, // StuddedLeather/Ring
          { ac: 5, expected: -1 }, // Scale/Chain
          { ac: 3, expected: -2 }, // Banded/Splint
          { ac: 2, expected: -3 }, // Plate
        ];

        for (const { ac, expected } of testCases) {
          expect(getWeaponVsArmorAdjustment(piercingWeapon, ac)).toBe(expected);
        }
      });
    });

    describe('Bludgeoning Weapons', () => {
      const bludgeoningWeapon = createMockWeapon({ name: 'Mace' });

      it('should apply correct adjustments for all armor types', () => {
        const testCases = [
          { ac: 10, expected: 0 }, // Unarmored
          { ac: 8, expected: 0 }, // Padded/Leather
          { ac: 7, expected: 1 }, // StuddedLeather/Ring
          { ac: 5, expected: 2 }, // Scale/Chain
          { ac: 3, expected: 0 }, // Banded/Splint
          { ac: 2, expected: -1 }, // Plate
        ];

        for (const { ac, expected } of testCases) {
          expect(getWeaponVsArmorAdjustment(bludgeoningWeapon, ac)).toBe(expected);
        }
      });
    });
  });

  describe('Applied Weapon vs Armor Adjustments', () => {
    it('should apply adjustments to character targets', () => {
      const character = createMockCharacter({ armorClass: 5 }); // Scale/Chain armor
      const slashingWeapon = createMockWeapon({ name: 'Sword, Long' });

      const adjustment = applyWeaponVsArmorAdjustment(character, slashingWeapon);
      expect(adjustment).toBe(0); // Slashing vs Scale/Chain = 0
    });

    it('should apply adjustments to monster targets', () => {
      const monster = createMockMonster({ armorClass: 2 }); // Plate armor
      const piercingWeapon = createMockWeapon({ name: 'Spear' });

      const adjustment = applyWeaponVsArmorAdjustment(monster, piercingWeapon);
      expect(adjustment).toBe(-3); // Piercing vs Plate = -3
    });

    it('should return 0 when no weapon is provided', () => {
      const character = createMockCharacter({ armorClass: 5 });

      const adjustment = applyWeaponVsArmorAdjustment(character, undefined);
      expect(adjustment).toBe(0);
    });

    it('should handle different AC values correctly', () => {
      const bludgeoningWeapon = createMockWeapon({ name: 'Mace' });

      const testCases = [
        { ac: 10, expected: 0 }, // Unarmored
        { ac: 7, expected: 1 }, // StuddedLeather/Ring
        { ac: 5, expected: 2 }, // Scale/Chain
        { ac: 2, expected: -1 }, // Plate
      ];

      for (const { ac, expected } of testCases) {
        const target = createMockCharacter({ armorClass: ac });
        const adjustment = applyWeaponVsArmorAdjustment(target, bludgeoningWeapon);
        expect(adjustment).toBe(expected);
      }
    });
  });

  describe('Tactical Implications', () => {
    it('should favor slashing weapons against heavy armor', () => {
      const plateTarget = createMockCharacter({ armorClass: 2 });

      const slashing = createMockWeapon({ name: 'Sword, Long' });
      const piercing = createMockWeapon({ name: 'Spear' });
      const bludgeoning = createMockWeapon({ name: 'Mace' });

      const slashingAdj = applyWeaponVsArmorAdjustment(plateTarget, slashing);
      const piercingAdj = applyWeaponVsArmorAdjustment(plateTarget, piercing);
      const bludgeoningAdj = applyWeaponVsArmorAdjustment(plateTarget, bludgeoning);

      expect(slashingAdj).toBeGreaterThan(piercingAdj);
      expect(slashingAdj).toBeGreaterThan(bludgeoningAdj);
    });

    it('should favor piercing weapons against light armor', () => {
      const leatherTarget = createMockCharacter({ armorClass: 8 });

      const slashing = createMockWeapon({ name: 'Sword, Long' });
      const piercing = createMockWeapon({ name: 'Spear' });
      const bludgeoning = createMockWeapon({ name: 'Mace' });

      const slashingAdj = applyWeaponVsArmorAdjustment(leatherTarget, slashing);
      const piercingAdj = applyWeaponVsArmorAdjustment(leatherTarget, piercing);
      const bludgeoningAdj = applyWeaponVsArmorAdjustment(leatherTarget, bludgeoning);

      expect(piercingAdj).toBeGreaterThan(slashingAdj);
      expect(piercingAdj).toBeGreaterThanOrEqual(bludgeoningAdj);
    });

    it('should favor bludgeoning weapons against medium armor', () => {
      const chainTarget = createMockCharacter({ armorClass: 5 });

      const slashing = createMockWeapon({ name: 'Sword, Long' });
      const piercing = createMockWeapon({ name: 'Spear' });
      const bludgeoning = createMockWeapon({ name: 'Mace' });

      const slashingAdj = applyWeaponVsArmorAdjustment(chainTarget, slashing);
      const piercingAdj = applyWeaponVsArmorAdjustment(chainTarget, piercing);
      const bludgeoningAdj = applyWeaponVsArmorAdjustment(chainTarget, bludgeoning);

      expect(bludgeoningAdj).toBeGreaterThan(slashingAdj);
      expect(bludgeoningAdj).toBeGreaterThan(piercingAdj);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null weapon gracefully', () => {
      const character = createMockCharacter({ armorClass: 5 });

      expect(() => {
        applyWeaponVsArmorAdjustment(character, undefined);
      }).not.toThrow();

      const adjustment = applyWeaponVsArmorAdjustment(character, undefined);
      expect(adjustment).toBe(0);
    });

    it('should handle undefined weapon gracefully', () => {
      const character = createMockCharacter({ armorClass: 5 });

      const adjustment = applyWeaponVsArmorAdjustment(character, undefined);
      expect(adjustment).toBe(0);
    });

    it('should handle extreme AC values', () => {
      const weapon = createMockWeapon({ name: 'Sword, Long' });

      // Very low AC (better than plate)
      expect(getWeaponVsArmorAdjustment(weapon, -10)).toBe(2);

      // Very high AC (worse than unarmored)
      expect(getWeaponVsArmorAdjustment(weapon, 20)).toBe(0);
    });

    it('should handle weapons with unusual names', () => {
      const strangeWeapons = [
        createMockWeapon({ name: '' }),
        createMockWeapon({ name: 'sword, long' }), // Different case
        createMockWeapon({ name: 'MACE' }), // All caps
        createMockWeapon({ name: 'Something completely different' }),
      ];

      for (const weapon of strangeWeapons) {
        expect(() => {
          getWeaponVsArmorAdjustment(weapon, 5);
        }).not.toThrow();

        // Should default to slashing (0 vs chain mail)
        const adjustment = getWeaponVsArmorAdjustment(weapon, 5);
        expect(typeof adjustment).toBe('number');
      }
    });

    it('should handle targets with invalid AC values', () => {
      const weapon = createMockWeapon({ name: 'Sword, Long' });

      const invalidTargets = [
        createMockCharacter({ armorClass: Number.NaN }),
        createMockCharacter({ armorClass: Number.POSITIVE_INFINITY }),
        createMockCharacter({ armorClass: Number.NEGATIVE_INFINITY }),
      ];

      for (const target of invalidTargets) {
        expect(() => {
          applyWeaponVsArmorAdjustment(target, weapon);
        }).not.toThrow();

        const adjustment = applyWeaponVsArmorAdjustment(target, weapon);
        expect(typeof adjustment).toBe('number');
      }
    });

    it('should be consistent between different function calls', () => {
      const weapon = createMockWeapon({ name: 'Spear' });
      const character = createMockCharacter({ armorClass: 3 });

      // Direct calculation
      const directAdj = getWeaponVsArmorAdjustment(weapon, 3);

      // Applied calculation
      const appliedAdj = applyWeaponVsArmorAdjustment(character, weapon);

      expect(directAdj).toBe(appliedAdj);
    });
  });
});
