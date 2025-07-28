import { findSpellByName } from '@rules/spells/spellList';
import {
  calculateSpellSavingThrow,
  canCastSpell,
  castSpell,
  getSpellDuration,
  getSpellRange,
} from '@rules/spells/spellResolver';
import type {
  AbilityScoreModifiers,
  Character,
  CharacterClass,
  Monster,
  MovementTypeValue,
  SavingThrowType,
  Spell,
} from '@rules/types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dependencies
vi.mock('../../../rules/dice', () => ({
  rollDice: vi.fn().mockReturnValue({ roll: 1, sides: 20, modifier: 0, result: 15 }),
}));

vi.mock('../../../rules/spells/spellMemorization', () => ({
  forgetSpell: vi.fn().mockReturnValue({ success: true, message: 'Spell forgotten' }),
}));

describe('Spell Resolver', () => {
  // Test character and monster setup
  let caster: Character;
  let monster: Monster;

  // Mock spells
  const magicMissile = findSpellByName('Magic Missile') as Spell;
  const cureLightWounds = findSpellByName('Cure Light Wounds') as Spell;

  // Mock ability modifiers
  const mockAbilityModifiers: AbilityScoreModifiers = {
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
  };

  beforeEach(() => {
    // Setup a mock caster
    caster = {
      id: 'test-caster',
      name: 'Test Caster',
      race: 'Human',
      class: 'Magic-User',
      level: 5,
      abilities: {
        strength: 10,
        dexterity: 10,
        constitution: 10,
        intelligence: 16,
        wisdom: 10,
        charisma: 10,
      },
      abilityModifiers: mockAbilityModifiers,
      hitPoints: { current: 15, maximum: 15 },
      armorClass: 9,
      thac0: 19,
      savingThrows: {
        'Poison or Death': 13,
        Wands: 11,
        'Paralysis, Polymorph, or Petrification': 12,
        'Breath Weapons': 15,
        'Spells, Rods, or Staves': 12,
      },
      experience: { current: 15000, requiredForNextLevel: 30000, level: 5 },
      alignment: 'Neutral Good',
      inventory: [],
      position: 'standing',
      statusEffects: [],
      memorizedSpells: {
        1: [magicMissile],
      },
      spellbook: [magicMissile],
      spells: [],
      currency: { platinum: 0, gold: 50, electrum: 0, silver: 0, copper: 0 },
      encumbrance: 0,
      movementRate: 12,
      classes: {},
      primaryClass: null,
      spellSlots: { 1: 4, 2: 2, 3: 1 },
      thiefSkills: null,
      turnUndead: null,
      languages: ['Common'],
      age: 30,
      ageCategory: 'Adult',
      henchmen: [],
      racialAbilities: [],
      classAbilities: [],
      proficiencies: [],
      secondarySkills: [],
    };

    // Setup a mock monster
    monster = {
      id: 'test-goblin',
      name: 'Test Goblin',
      level: 1,
      hitPoints: { current: 6, maximum: 6 },
      armorClass: 6,
      thac0: 19,
      experience: { current: 0, requiredForNextLevel: 0, level: 1 },
      alignment: 'Chaotic Evil',
      inventory: [],
      position: 'standing',
      statusEffects: [],
      hitDice: '1d8',
      damagePerAttack: ['1d6'],
      morale: 7,
      treasure: 'J',
      specialAbilities: [],
      xpValue: 15,
      size: 'Small',
      movementTypes: [{ type: 'Walk' as MovementTypeValue, rate: 6 }],
      habitat: ['Forest', 'Hills', 'Caves'],
      frequency: 'Common',
      organization: 'Tribe',
      diet: 'Omnivore',
      ecology: 'Primitive humanoid',
      // Add type assertion to handle custom property
      savingThrows: {
        'Poison or Death': 13,
        Wands: 14,
        'Paralysis, Polymorph, or Petrification': 13,
        'Breath Weapons': 16,
        'Spells, Rods, or Staves': 15,
      } as Record<SavingThrowType, number>,
    } as Monster & { savingThrows: Record<SavingThrowType, number> };
  });

  describe('canCastSpell', () => {
    it('should return true if character can cast the spell', () => {
      const result = canCastSpell(caster, magicMissile, {});
      expect(result.success).toBe(true);
    });

    it('should return false if character is not the right class', () => {
      // Change caster class
      const wrongClassCaster = { ...caster, class: 'Fighter' as CharacterClass };
      const result = canCastSpell(wrongClassCaster, magicMissile, {});
      expect(result.success).toBe(false);
      expect(result.message).toContain('incompatible class');
    });

    it('should return false if spell is not memorized', () => {
      // Remove memorized spell
      const noMemCaster = { ...caster, memorizedSpells: {} };
      const result = canCastSpell(noMemCaster, magicMissile, {});
      expect(result.success).toBe(false);
      expect(result.message).toContain('not memorized');
    });

    it('should ignore memorization if option is set', () => {
      // Even without memorized spells, should pass with option
      const noMemCaster = { ...caster, memorizedSpells: {} };
      const result = canCastSpell(noMemCaster, magicMissile, { ignoreMemorization: true });
      expect(result.success).toBe(true);
    });
  });

  describe('castSpell', () => {
    it('should successfully cast a memorized spell', () => {
      const result = castSpell(caster, 'Magic Missile', [monster]);

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
      expect(result.spell).toBe(magicMissile);
      expect(result.spellResult).toBeDefined();
    });

    it('should fail if spell is not found', () => {
      const result = castSpell(caster, 'NonExistentSpell', [monster]);

      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });

    it('should fail if caster cannot cast the spell', () => {
      // Cleric trying to cast a Magic-User spell
      const wrongCaster = { ...caster, class: 'Cleric' as CharacterClass };
      const result = castSpell(wrongCaster, 'Magic Missile', [monster]);

      expect(result.success).toBe(false);
      expect(result.message).toContain('incompatible class');
    });
  });

  describe('calculateSpellSavingThrow', () => {
    it('should return null for spells with no saving throw', () => {
      // Magic Missile has no saving throw
      const saveTarget = calculateSpellSavingThrow(caster, magicMissile);

      expect(saveTarget).toBeNull();
    });

    it('should calculate saving throw based on caster level', () => {
      // Create a spell that allows a save
      const webSpell = findSpellByName('Web') as Spell;
      const saveTarget = calculateSpellSavingThrow(caster, webSpell);

      // 20 - caster level (5) = 15
      expect(saveTarget).toBe(15);
    });
  });

  describe('getSpellRange', () => {
    it('should handle fixed ranges', () => {
      // Spell with a fixed range like "18 meters"
      const fixedRangeSpell: Spell = {
        ...magicMissile,
        range: '18 meters',
      };

      const range = getSpellRange(fixedRangeSpell, caster.level);
      expect(range).toBe(18);
    });

    it('should handle ranges that scale with level', () => {
      // Magic Missile has "18 meters + 1.5 meters per level"
      const range = getSpellRange(magicMissile, caster.level);

      // 18 + (1.5 * 5) = 25.5
      expect(range).toBe(25.5);
    });

    it('should handle "Touch" and "Self" ranges', () => {
      // Cure Light Wounds has "Touch" range
      const touchRange = getSpellRange(cureLightWounds, caster.level);
      expect(touchRange).toBe(0);

      // Create a spell with "Self" range
      const selfRangeSpell: Spell = {
        ...magicMissile,
        range: 'Self',
      };

      const selfRange = getSpellRange(selfRangeSpell, caster.level);
      expect(selfRange).toBe(0);
    });
  });

  describe('getSpellDuration', () => {
    it('should handle "Instantaneous" and "Permanent" durations', () => {
      // Magic Missile is instantaneous
      const instantDuration = getSpellDuration(magicMissile, caster.level);
      expect(instantDuration).toBe(0);

      // Create a permanent spell
      const permanentSpell: Spell = {
        ...magicMissile,
        duration: 'Permanent',
      };

      const permDuration = getSpellDuration(permanentSpell, caster.level);
      expect(permDuration).toBe(-1);
    });

    it('should handle fixed durations', () => {
      // Create a spell with a fixed duration
      const fixedDurationSpell: Spell = {
        ...magicMissile,
        duration: '3 rounds',
      };

      const duration = getSpellDuration(fixedDurationSpell, caster.level);
      expect(duration).toBe(3);
    });

    it('should handle durations that scale with level', () => {
      // Create a spell with a scaling duration
      const scalingDurationSpell: Spell = {
        ...magicMissile,
        duration: '5 rounds per level',
      };

      const duration = getSpellDuration(scalingDurationSpell, caster.level);

      // 5 * 5 = 25
      expect(duration).toBe(25);
    });

    it('should convert turns to rounds', () => {
      // Create a spell with turn-based duration
      const turnDurationSpell: Spell = {
        ...magicMissile,
        duration: '2 turns',
      };

      const duration = getSpellDuration(turnDurationSpell, caster.level);

      // 2 turns = 20 rounds (1 turn = 10 rounds in OSRIC)
      expect(duration).toBe(20);
    });
  });
});
