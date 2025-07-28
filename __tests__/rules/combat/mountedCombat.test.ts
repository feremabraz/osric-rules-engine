import {
  AerialAgilityLevel,
  type Mount,
  canMountedCharge,
  dismount,
  resolveMountedCharge,
} from '@rules/combat/mountedCombat';
import type { Action, Character, Monster, Weapon } from '@rules/types';
import { describe, expect, it, vi } from 'vitest';

describe('Mounted Combat', () => {
  // Helper function to create a mock weapon
  const createMockWeapon = (overrides: Partial<Weapon> = {}): Weapon => ({
    id: 'weapon1',
    name: 'Lance',
    description: 'A long wooden lance used for mounted combat',
    type: 'Melee',
    damage: '1d8',
    weight: 10,
    value: 10,
    equipped: false,
    magicBonus: null,
    charges: null,
    size: 'Medium',
    speed: 5,
    allowedClasses: ['Fighter', 'Paladin'],
    damageVsLarge: '1d8',
    range: [0, 0, 0],
    twoHanded: false,
    ...overrides,
  });

  const mockLance = createMockWeapon({
    id: 'weapon1',
    name: 'Lance',
  });

  const mockSword = createMockWeapon({
    id: 'weapon2',
    name: 'Longsword',
    weight: 3,
  });

  // Helper function to create a mock mount
  const createMockMount = (overrides: Partial<Mount> = {}): Mount => ({
    id: 'mount1',
    name: 'Warhorse',
    type: 'mount',
    movementRate: 60,
    armorClass: 12,
    hitPoints: 30,
    size: 'Large',
    flying: false,
    flyingAgility: null,
    encumbrance: {
      current: 0,
      max: 200,
    },
    isEncumbered: false,
    mountedBy: 'char1',
    ...overrides,
  });

  // Helper function to create a mock character
  const createMockCharacter = (overrides: Partial<Character> = {}): Character => ({
    id: 'char1',
    name: 'Test Rider',
    level: 5,
    hitPoints: { current: 30, maximum: 30 },
    armorClass: 16,
    thac0: 18,
    experience: { current: 0, requiredForNextLevel: 0, level: 1 },
    alignment: 'True Neutral',
    inventory: [],
    position: '0,0,0',
    statusEffects: [],
    race: 'Human',
    class: 'Fighter',
    abilities: {
      strength: 12,
      dexterity: 14,
      constitution: 12,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
    },
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
    encumbrance: 0.5,
    movementRate: 12,
    classes: { Fighter: 5 },
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
    ...overrides,
  });

  // Helper function to create a mock monster
  const createMockMonster = (overrides: Partial<Monster> = {}): Monster => ({
    id: 'monster1',
    name: 'Goblin',
    level: 1,
    hitPoints: { current: 7, maximum: 7 },
    armorClass: 15,
    thac0: 20,
    experience: { current: 0, requiredForNextLevel: 0, level: 1 },
    alignment: 'Neutral Evil',
    inventory: [],
    position: '0,0,0',
    statusEffects: [],
    hitDice: '1d8',
    damagePerAttack: ['1d6'],
    morale: 7,
    treasure: 'C',
    specialAbilities: [],
    xpValue: 10,
    size: 'Small',
    movementTypes: [{ type: 'Walk', rate: 6 }],
    habitat: ['Dungeon', 'Wilderness'],
    frequency: 'Common',
    organization: 'Gang (2-4), band (6-11), or tribe (20-40)',
    diet: 'Omnivore',
    ecology:
      'Goblins are small, black-hearted humanoids that lair in caves, abandoned mines, despoiled dungeons, and other dismal settings.',
    ...overrides,
  });

  describe('canMountedCharge', () => {
    it('should allow charge with valid conditions', () => {
      const character = createMockCharacter({ encumbrance: 0.5 });
      const mount = createMockMount({ isEncumbered: false });
      expect(canMountedCharge(character, mount)).toBe(true);
    });

    it('should prevent charge when mount is encumbered', () => {
      const character = createMockCharacter({ encumbrance: 0.5 });
      const mount = createMockMount({ isEncumbered: true });
      expect(canMountedCharge(character, mount)).toBe(false);
    });

    it('should prevent charge when character is heavily encumbered', () => {
      const character = createMockCharacter({ encumbrance: 0.95 }); // Over 90% encumbrance
      const mount = createMockMount({ isEncumbered: false });
      expect(canMountedCharge(character, mount)).toBe(false);
    });

    it('should prevent charge when not mounted', () => {
      const character = createMockCharacter({ encumbrance: 0.5 });
      const mount = createMockMount({ mountedBy: null });
      expect(canMountedCharge(character, mount)).toBe(false);
    });
  });

  describe('resolveMountedCharge', () => {
    it('should apply double damage with lance', () => {
      const character = createMockCharacter();
      const target = createMockMonster({ id: 'target1', name: 'Goblin' });
      const action: Action = {
        type: 'Attack',
        actor: character,
        target: target,
        item: mockLance,
      };

      const result = resolveMountedCharge(action);
      expect(result.success).toBe(true);
      expect(result.message).toContain('charges');
      expect(result.effects).toEqual([
        expect.objectContaining({
          type: 'damageMultiplier',
          value: 2,
          duration: 1,
        }),
      ]);
    });

    it('should not apply double damage with non-lance weapons', () => {
      const character = createMockCharacter();
      const target = createMockMonster({ id: 'target1', name: 'Goblin' });
      const action: Action = {
        type: 'Attack',
        actor: character,
        target: target,
        item: mockSword,
      };

      const result = resolveMountedCharge(action);
      expect(result.success).toBe(true);
      expect(result.effects).toEqual([
        expect.objectContaining({
          type: 'damageMultiplier',
          value: 1,
        }),
      ]);
    });
  });

  describe('dismount', () => {
    it('should allow dismounting when mounted', () => {
      const character = createMockCharacter({ id: 'char1' });
      const mount = createMockMount({ mountedBy: 'char1' });

      const result = dismount(character, mount);
      expect(result.success).toBe(true);
      expect(mount.mountedBy).toBeNull();
    });

    it('should prevent dismounting when not mounted', () => {
      const character = createMockCharacter({ id: 'char1' });
      const mount = createMockMount({ mountedBy: 'char2' }); // Different rider

      const result = dismount(character, mount);
      expect(result.success).toBe(false);
      expect(mount.mountedBy).toBe('char2'); // Should remain unchanged
    });
  });
});
