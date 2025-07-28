import {
  addSecondarySkill,
  calculateLevel,
  canChooseClass,
  hasReachedLevelLimit,
  validateMultiClass,
} from '@rules/character/characterClass';
import { type SecondarySkill, SkillLevel } from '@rules/character/secondarySkills';
import type { AbilityScores, Character, CharacterClass } from '@rules/types';
import { describe, expect, it } from 'vitest';

describe('Character Class Framework', () => {
  const validFighterScores: AbilityScores = {
    strength: 12,
    dexterity: 12,
    constitution: 12,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
  };

  const invalidFighterScores: AbilityScores = {
    strength: 8, // Below minimum
    dexterity: 12,
    constitution: 12,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
  };

  const validMultiClassScores: AbilityScores = {
    strength: 13,
    dexterity: 15,
    constitution: 12,
    intelligence: 15,
    wisdom: 10,
    charisma: 10,
  };

  const mockCharacter: Character = {
    id: 'test-id',
    name: 'Test Character',
    level: 1,
    hitPoints: { current: 10, maximum: 10 },
    armorClass: 10,
    thac0: 20,
    experience: { current: 0, requiredForNextLevel: 2000, level: 1 },
    alignment: 'True Neutral',
    inventory: [],
    position: 'standing',
    statusEffects: [],
    race: 'Human',
    class: 'Fighter',
    abilities: validFighterScores,
    abilityModifiers: {
      strengthHitAdj: 0,
      strengthDamageAdj: 0,
      strengthEncumbrance: 0,
      strengthOpenDoors: 0,
      strengthBendBars: 0,
      dexterityReaction: 0,
      dexterityMissile: 0,
      dexterityDefense: 0,
      dexterityPickPockets: 0,
      dexterityOpenLocks: 0,
      dexterityFindTraps: 0,
      dexterityMoveSilently: 0,
      dexterityHideInShadows: 0,
      constitutionHitPoints: 0,
      constitutionSystemShock: 0,
      constitutionResurrectionSurvival: 0,
      constitutionPoisonSave: 0,
      intelligenceLanguages: 0,
      intelligenceLearnSpells: 0,
      intelligenceMaxSpellLevel: 0,
      intelligenceIllusionImmunity: false,
      wisdomMentalSave: 0,
      wisdomBonusSpells: null,
      wisdomSpellFailure: 0,
      charismaReactionAdj: 0,
      charismaLoyaltyBase: 0,
      charismaMaxHenchmen: 0,
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
    movementRate: 120,
    classes: { Fighter: 1 },
    primaryClass: 'Fighter',
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
  };

  describe('canChooseClass', () => {
    it('should allow valid race/class combinations with sufficient ability scores', () => {
      const result = canChooseClass(validFighterScores, 'Human', 'Fighter');
      expect(result.allowed).toBe(true);
    });

    it('should reject race/class combinations with insufficient ability scores', () => {
      const result = canChooseClass(invalidFighterScores, 'Human', 'Fighter');
      expect(result.allowed).toBe(false);
    });

    it('should reject invalid race/class combinations', () => {
      const result = canChooseClass(validFighterScores, 'Halfling', 'Paladin');
      expect(result.allowed).toBe(false);
    });
  });

  describe('validateMultiClass', () => {
    it('should reject multi-classing for humans', () => {
      const result = validateMultiClass('Human', ['Fighter', 'Thief'], validMultiClassScores);
      expect(result.valid).toBe(false);
    });

    it('should allow valid multi-class combinations for non-humans', () => {
      const result = validateMultiClass('Elf', ['Fighter', 'Magic-User'], validMultiClassScores);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid multi-class combinations', () => {
      const result = validateMultiClass('Dwarf', ['Fighter', 'Magic-User'], validMultiClassScores);
      expect(result.valid).toBe(false);
    });
  });

  describe('addSecondarySkill', () => {
    it('should add a secondary skill to a character', () => {
      const newSkill: SecondarySkill = 'Animal Handling';
      const updatedCharacter = addSecondarySkill(mockCharacter, newSkill, SkillLevel.Apprentice);

      expect(updatedCharacter.secondarySkills).toHaveLength(1);
      expect(updatedCharacter.secondarySkills[0].skill).toBe(newSkill);
      expect(updatedCharacter.secondarySkills[0].level).toBe(SkillLevel.Apprentice);
    });
  });

  describe('calculateLevel', () => {
    it('should return correct level for single-classed characters', () => {
      const level = calculateLevel(mockCharacter);
      expect(level).toBe(1);
    });

    it('should calculate average level for multi-classed characters', () => {
      const multiClassCharacter: Character = {
        ...mockCharacter,
        race: 'Elf',
        classes: { Fighter: 3, 'Magic-User': 2 },
      };

      const level = calculateLevel(multiClassCharacter);
      expect(level).toBe(2); // (3 + 2) / 2 = 2.5, floor = 2
    });
  });

  describe('hasReachedLevelLimit', () => {
    it('should return false for humans with unlimited advancement', () => {
      const result = hasReachedLevelLimit(mockCharacter, 'Fighter');
      expect(result).toBe(false);
    });

    it('should correctly identify when a race has reached level limit', () => {
      const halflingCharacter: Character = {
        ...mockCharacter,
        race: 'Halfling',
        classes: { Fighter: 4 },
      };

      const result = hasReachedLevelLimit(halflingCharacter, 'Fighter');
      expect(result).toBe(true); // Halflings are limited to level 4 as fighters
    });

    it('should return false when below level limit', () => {
      const halflingCharacter: Character = {
        ...mockCharacter,
        race: 'Halfling',
        classes: { Fighter: 3 },
      };

      const result = hasReachedLevelLimit(halflingCharacter, 'Fighter');
      expect(result).toBe(false); // Halflings are limited to level 4 as fighters
    });
  });
});
