import { findSpellByName, spellLists } from '@rules/spells/spellList';
import type { AbilityScoreModifiers, Character, Monster, Spell } from '@rules/types';
import { describe, expect, it } from 'vitest';

describe('Spell List', () => {
  describe('findSpellByName', () => {
    it('should find a spell by name (case-insensitive)', () => {
      // Test for Magic-User spell
      const magicMissile = findSpellByName('magic missile');
      expect(magicMissile).toBeDefined();
      expect(magicMissile?.name).toBe('Magic Missile');
      expect(magicMissile?.class).toBe('Magic-User');
      expect(magicMissile?.level).toBe(1);

      // Test case insensitivity
      const shield = findSpellByName('SHIELD');
      expect(shield).toBeDefined();
      expect(shield?.name).toBe('Shield');

      // Test for Cleric spell
      const cureLight = findSpellByName('cure light wounds');
      expect(cureLight).toBeDefined();
      expect(cureLight?.class).toBe('Cleric');
    });

    it('should return undefined for non-existent spells', () => {
      const nonExistentSpell = findSpellByName('Fireball'); // Not implemented in our spell list
      expect(nonExistentSpell).toBeUndefined();
    });
  });

  describe('Spell Lists Structure', () => {
    it('should have spells organized by class and level', () => {
      expect(spellLists.Cleric).toBeDefined();
      expect(spellLists.Druid).toBeDefined();
      expect(spellLists.Illusionist).toBeDefined();
      expect(spellLists['Magic-User']).toBeDefined();

      // Check Magic-User spells at level 1
      expect(Array.isArray(spellLists['Magic-User'][1])).toBe(true);
      expect(spellLists['Magic-User'][1].length).toBeGreaterThan(0);

      // Verify a specific spell has all required properties
      const randomSpell = spellLists['Magic-User'][1][0];
      expect(randomSpell.name).toBeDefined();
      expect(randomSpell.level).toBeDefined();
      expect(randomSpell.class).toBeDefined();
      expect(randomSpell.range).toBeDefined();
      expect(randomSpell.duration).toBeDefined();
      expect(randomSpell.areaOfEffect).toBeDefined();
      expect(randomSpell.components).toBeDefined();
      expect(randomSpell.castingTime).toBeDefined();
      expect(randomSpell.savingThrow).toBeDefined();
      expect(randomSpell.description).toBeDefined();
      expect(typeof randomSpell.effect).toBe('function');
    });

    it('should have properly typed saving throws for all spells', () => {
      const validSavingThrows = [
        'Poison or Death',
        'Wands',
        'Paralysis, Polymorph, or Petrification',
        'Breath Weapons',
        'Spells, Rods, or Staves',
        'None',
      ];

      // Check all spells from all classes
      for (const [_className, levelSpells] of Object.entries(spellLists)) {
        for (const [_level, spells] of Object.entries(levelSpells)) {
          for (const spell of spells) {
            expect(validSavingThrows).toContain(spell.savingThrow);
          }
        }
      }
    });

    it('should render spell effects narratively', () => {
      // Create dummy character and target
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

      // Minimal character implementation with required properties
      const dummyCaster: Partial<Character> = {
        name: 'Test Caster',
        id: 'test-caster',
        abilityModifiers: mockAbilityModifiers,
      };

      // Minimal monster implementation with required properties
      const dummyTarget: Partial<Monster> = {
        name: 'Test Target',
        id: 'test-target',
      };

      // Test a spell effect
      const spell = findSpellByName('Magic Missile');
      const result = spell?.effect(dummyCaster as Character, [dummyTarget as Monster]);

      expect(result).toBeDefined();
      expect(result?.narrative).toContain('Test Caster casts Magic Missile');
    });
  });
});
