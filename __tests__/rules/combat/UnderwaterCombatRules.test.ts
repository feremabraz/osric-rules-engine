import {
  applyUnderwaterPenalties,
  canCastSpellUnderwater,
  handleUnderwaterSpell,
  isWeaponEffectiveUnderwater,
} from '@osric/rules/combat/UnderwaterCombatRules';
import type { Action } from '@osric/rules/combat/UnderwaterCombatRules';
import type { Character, Monster, Spell, Weapon } from '@osric/types/entities';
import { describe, expect, it } from 'vitest';

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
    position: 'underwater',
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

function createMockSpell(overrides: Partial<Spell> = {}): Spell {
  const defaultSpell: Spell = {
    name: 'Magic Missile',
    level: 1,
    class: 'Magic-User',
    components: ['Verbal', 'Somatic'],
    castingTime: '1',
    range: '60+10/level',
    duration: 'Instantaneous',
    savingThrow: 'None',
    description: 'A missile of magical energy darts forth',
    reversible: false,
    areaOfEffect: 'One creature',
    materialComponents: ['A bit of bat fur'],
    effect: () => ({
      damage: [4],
      healing: null,
      statusEffects: null,
      narrative: 'A magical missile strikes the target',
    }),
  };

  return { ...defaultSpell, ...overrides };
}

function createMockMonster(overrides: Partial<Monster> = {}): Monster {
  const defaultMonster: Monster = {
    id: 'sahuagin-1',
    name: 'Sahuagin',
    level: 2,
    hitPoints: { current: 12, maximum: 12 },
    armorClass: 5,
    thac0: 19,
    experience: { current: 0, requiredForNextLevel: 0, level: 2 },
    alignment: 'Lawful Evil',
    inventory: [],
    position: 'underwater',
    statusEffects: [],
    hitDice: '2+2',
    damagePerAttack: ['1d4+1', '1d4+1', '1d4+1'],
    morale: 14,
    treasure: 'D',
    specialAbilities: ['Underwater Breathing', 'Shark Summoning'],
    xpValue: 175,
    size: 'Medium',
    movementTypes: [
      { type: 'Walk', rate: 120 },
      { type: 'Swim', rate: 180 },
    ],
    habitat: ['Ocean', 'Underwater'],
    frequency: 'Uncommon',
    organization: 'Tribal',
    diet: 'Carnivore',
    ecology: 'Aquatic predator',
  };

  return { ...defaultMonster, ...overrides };
}

function createMockAction(
  weapon: Weapon,
  attacker: Character | Monster,
  overrides: Partial<Action> = {}
): Action {
  const defaultAction: Action = {
    type: 'attack',
    actor: attacker,
    item: weapon,
    target: 'enemy',
  };

  return { ...defaultAction, ...overrides };
}

describe('UnderwaterCombatRules', () => {
  describe('Weapon Effectiveness Underwater', () => {
    it('should identify effective underwater weapons', () => {
      const effectiveWeapons = [
        createMockWeapon({ name: 'Dagger' }),
        createMockWeapon({ name: 'Spear' }),
        createMockWeapon({ name: 'Trident' }),
        createMockWeapon({ name: 'Harpoon' }),
        createMockWeapon({ name: 'Net' }),
        createMockWeapon({ name: 'Sling' }),
        createMockWeapon({ name: 'Crossbow, Light' }),
        createMockWeapon({ name: 'Crossbow, Heavy' }),
      ];

      for (const weapon of effectiveWeapons) {
        expect(isWeaponEffectiveUnderwater(weapon)).toBe(true);
      }
    });

    it('should identify ineffective underwater weapons', () => {
      const ineffectiveWeapons = [
        createMockWeapon({ name: 'Sword, Long' }),
        createMockWeapon({ name: 'Axe, Battle' }),
        createMockWeapon({ name: 'Bow, Long' }),
        createMockWeapon({ name: 'Mace' }),
        createMockWeapon({ name: 'Hammer, War' }),
        createMockWeapon({ name: 'Flail' }),
      ];

      for (const weapon of ineffectiveWeapons) {
        expect(isWeaponEffectiveUnderwater(weapon)).toBe(false);
      }
    });

    it('should handle case-insensitive weapon name matching', () => {
      const caseVariations = [
        createMockWeapon({ name: 'DAGGER' }),
        createMockWeapon({ name: 'dagger' }),
        createMockWeapon({ name: 'Dagger +1' }),
        createMockWeapon({ name: 'Silver Dagger' }),
        createMockWeapon({ name: 'Magic Trident' }),
      ];

      for (const weapon of caseVariations) {
        expect(isWeaponEffectiveUnderwater(weapon)).toBe(true);
      }
    });

    it('should return false for non-weapon items', () => {
      const nonWeaponItem = {
        id: 'potion',
        name: 'Healing Potion',
        description: 'A potion of healing',
        weight: 0.1,
        value: 50,
        equipped: false,
        magicBonus: 0,
        charges: 1,
      };

      expect(isWeaponEffectiveUnderwater(nonWeaponItem)).toBe(false);
    });
  });

  describe('Underwater Attack Penalties', () => {
    it('should prevent attacks with ineffective weapons', () => {
      const ineffectiveWeapon = createMockWeapon({ name: 'Sword, Long' });
      const attacker = createMockCharacter();
      const action = createMockAction(ineffectiveWeapon, attacker);

      const result = applyUnderwaterPenalties(action, attacker);

      expect(result.success).toBe(false);
      expect(result.message).toContain('ineffective underwater');
      expect(result.damage).toBeNull();
    });

    it('should allow attacks with effective weapons but apply penalties', () => {
      const effectiveWeapon = createMockWeapon({
        name: 'Dagger',
        type: 'Melee',
      });
      const attacker = createMockCharacter();
      const action = createMockAction(effectiveWeapon, attacker);

      const result = applyUnderwaterPenalties(action, attacker);

      expect(result.success).toBe(true);
      expect(result.message).toContain('reduced effectiveness');
      expect(result.effects).toContain('underwater_attack_penalty:-2');
      expect(result.effects).toContain('underwater_damage_penalty:-2');
    });

    it('should handle ranged weapons with reload requirement', () => {
      const crossbow = createMockWeapon({
        name: 'Crossbow, Light',
        type: 'Ranged',
      });
      const attacker = createMockCharacter();
      const action = createMockAction(crossbow, attacker);

      const result = applyUnderwaterPenalties(action, attacker);

      expect(result.success).toBe(true);
      expect(result.message).toContain('must reload after this shot');
      expect(result.effects).toHaveLength(1);
      expect(result.effects?.[0]).toHaveProperty('type', 'reloadRequired');
      expect(result.effects?.[0]).toHaveProperty('duration', 1);
    });

    it('should handle actions without weapons', () => {
      const attacker = createMockCharacter();
      const actionWithoutWeapon: Action = {
        type: 'attack',
        actor: attacker,
        target: 'enemy',
        item: undefined,
      };

      const result = applyUnderwaterPenalties(actionWithoutWeapon, attacker);

      expect(result.success).toBe(true);
      expect(result.message).toBe('');
      expect(result.damage).toBeNull();
    });
  });

  describe('Spellcasting Underwater', () => {
    it('should allow spells with only verbal components', () => {
      const verbalOnlySpell = createMockSpell({
        name: 'Command',
        components: ['V'],
      });

      const canCast = canCastSpellUnderwater(verbalOnlySpell);
      expect(canCast).toBe(true);
    });

    it('should prevent spells with somatic components', () => {
      const somaticSpell = createMockSpell({
        name: 'Magic Missile',
        components: ['V', 'S'],
      });

      const canCast = canCastSpellUnderwater(somaticSpell);
      expect(canCast).toBe(false);
    });

    it('should prevent spells with material components', () => {
      const materialSpell = createMockSpell({
        name: 'Fireball',
        components: ['V', 'S', 'M'],
      });

      const canCast = canCastSpellUnderwater(materialSpell);
      expect(canCast).toBe(false);
    });

    it('should prevent fire-based spells', () => {
      const fireSpells = [
        createMockSpell({
          name: 'Fireball',
          description: 'A ball of fire explodes',
        }),
        createMockSpell({
          name: 'Burning Hands',
          description: 'Jets of fire spring from hands',
        }),
        createMockSpell({
          name: 'Wall of Fire',
          description: 'Creates a wall of fire',
        }),
      ];

      for (const spell of fireSpells) {
        const canCast = canCastSpellUnderwater(spell);
        expect(canCast).toBe(false);
      }
    });

    it('should prevent lightning and electricity spells', () => {
      const electricitySpells = [
        createMockSpell({
          name: 'Lightning Bolt',
          description: 'A bolt of lightning strikes',
        }),
        createMockSpell({
          name: 'Shocking Grasp',
          description: 'Electricity damages opponent',
        }),
        createMockSpell({
          name: 'Chain Lightning',
          description: 'Lightning jumps between targets',
        }),
      ];

      for (const spell of electricitySpells) {
        const canCast = canCastSpellUnderwater(spell);
        expect(canCast).toBe(false);
      }
    });

    it('should allow other spells with penalties', () => {
      const neutralSpell = createMockSpell({
        name: 'Detect Magic',
        components: ['V'],
        description: 'Detects magical auras',
      });

      const canCast = canCastSpellUnderwater(neutralSpell);
      expect(canCast).toBe(true);
    });

    it('should handle spells without components', () => {
      const noComponentSpell = createMockSpell({
        name: 'Divine Spell',
        components: undefined,
      });

      const canCast = canCastSpellUnderwater(noComponentSpell);
      expect(canCast).toBe(true);
    });

    it('should handle empty component arrays', () => {
      const emptyComponentSpell = createMockSpell({
        name: 'Special Spell',
        components: [],
      });

      const canCast = canCastSpellUnderwater(emptyComponentSpell);
      expect(canCast).toBe(true);
    });
  });

  describe('Underwater Spell Handling', () => {
    it('should handle successful spell casting', () => {
      const validSpell = createMockSpell({
        name: 'Detect Magic',
        components: ['V'],
      });
      const caster = createMockCharacter();

      const result = handleUnderwaterSpell(validSpell, caster);

      expect(result.success).toBe(true);
      expect(result.message).toContain('casts Detect Magic');
      expect(result.damage).toBeNull();
    });

    it('should handle lightning spell backfire', () => {
      const lightningSpell = createMockSpell({
        name: 'Lightning Bolt',
        level: 3,
        description: 'A bolt of lightning strikes',
      });
      const caster = createMockCharacter();

      const result = handleUnderwaterSpell(lightningSpell, caster);

      expect(result.success).toBe(false);
      expect(result.message).toContain('backfires');
      expect(result.damage).toEqual([6]);
      expect(result.effects).toHaveLength(1);
      expect(result.effects?.[0]).toHaveProperty('type', 'stun');
      expect(result.effects?.[0]).toHaveProperty('duration', 1);
    });

    it('should handle invalid spells that are not lightning', () => {
      const invalidSpell = createMockSpell({
        name: 'Fireball',
        components: ['V', 'S', 'M'],
        description: 'A ball of fire explodes',
      });
      const caster = createMockCharacter();

      const result = handleUnderwaterSpell(invalidSpell, caster);

      expect(result.success).toBe(false);
      expect(result.message).toContain('cannot cast');
      expect(result.message).toContain('material components');
      expect(result.damage).toBeNull();
    });

    it('should handle spell casting by monsters', () => {
      const spell = createMockSpell({
        name: 'Detect Magic',
        components: ['V'],
      });
      const monster = createMockMonster();

      const result = handleUnderwaterSpell(spell, monster);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Sahuagin casts');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty weapon names', () => {
      const emptyNameWeapon = createMockWeapon({ name: '' });

      expect(isWeaponEffectiveUnderwater(emptyNameWeapon)).toBe(false);
    });

    it('should handle weapons with special characters in names', () => {
      const specialCharWeapons = [
        createMockWeapon({ name: 'Dagger +1' }),
        createMockWeapon({ name: 'Dagger of Wounding' }),
        createMockWeapon({ name: 'Masterwork Trident' }),
        createMockWeapon({ name: 'Harpoon (Barbed)' }),
      ];

      for (const weapon of specialCharWeapons) {
        expect(isWeaponEffectiveUnderwater(weapon)).toBe(true);
      }
    });

    it('should handle spells with mixed case in names and descriptions', () => {
      const mixedCaseSpells = [
        createMockSpell({
          name: 'LIGHTNING BOLT',
          description: 'LIGHTNING STRIKES THE TARGET',
        }),
        createMockSpell({
          name: 'burning hands',
          description: 'fire springs from the caster hands',
        }),
        createMockSpell({
          name: 'Chain Lightning',
          description: 'Electricity jumps between TARGETS',
        }),
      ];

      for (const spell of mixedCaseSpells) {
        expect(canCastSpellUnderwater(spell)).toBe(false);
      }
    });

    it('should handle null or undefined spell components', () => {
      const spellWithNullComponents = createMockSpell({
        name: 'Special Spell',
        components: undefined,
      });

      expect(() => {
        canCastSpellUnderwater(spellWithNullComponents);
      }).not.toThrow();

      expect(canCastSpellUnderwater(spellWithNullComponents)).toBe(true);
    });

    it('should handle lightning spells with level 0', () => {
      const zeroLevelLightning = createMockSpell({
        name: 'Lightning Bolt',
        level: 0,
        description: 'A weak bolt of lightning',
      });
      const caster = createMockCharacter();

      const result = handleUnderwaterSpell(zeroLevelLightning, caster);

      expect(result.success).toBe(false);
      expect(result.damage).toEqual([0]);
    });

    it('should handle extremely high level lightning spells', () => {
      const highLevelLightning = createMockSpell({
        name: 'Epic Lightning Storm',
        level: 15,
        description: 'Massive lightning devastation',
      });
      const caster = createMockCharacter();

      const result = handleUnderwaterSpell(highLevelLightning, caster);

      expect(result.success).toBe(false);
      expect(result.damage).toEqual([30]);
    });

    it('should maintain consistency across multiple underwater checks', () => {
      const weapon = createMockWeapon({ name: 'Trident' });

      for (let i = 0; i < 5; i++) {
        expect(isWeaponEffectiveUnderwater(weapon)).toBe(true);
      }
    });
  });
});
