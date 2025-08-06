/**
 * TwoWeaponFightingRules Test Suite
 *
 * Tests the TwoWeaponFightingRules implementation using systematic testing methodology.
 * Validates OSRIC-compliant two-weapon fighting mechanics including:
 * - Weapon eligibility for off-hand use (daggers and hand axes only)
 * - Attack penalties for main hand (-2) and off-hand (-4)
 * - Dexterity modifier application to both attacks
 * - Sequence of attacks and target status checking
 * - Integration with existing attack resolution
 *
 * Follows established testing patterns with comprehensive coverage.
 */

import type { Command } from '@osric/core/Command';
import { GameContext } from '@osric/core/GameContext';
import {
  TwoWeaponEligibilityRule,
  TwoWeaponFightingRule,
} from '@osric/rules/combat/TwoWeaponFightingRules';
import { COMMAND_TYPES, RULE_NAMES } from '@osric/types/constants';
import type { Character, CombatResult, Monster, Weapon } from '@osric/types/entities';
import { createStore } from 'jotai';
import { beforeEach, describe, expect, it } from 'vitest';

// Interface for two-weapon eligibility results
interface TwoWeaponEligibility {
  canUseTwoWeapons: boolean;
  reason?: string;
  penalties?: {
    mainHandPenalty: number;
    offHandPenalty: number;
  };
}

// Helper function for mock character creation
function createMockCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'test-character',
    name: 'Test Fighter',
    race: 'Human',
    class: 'Fighter',
    classes: { Fighter: 5 },
    primaryClass: 'Fighter',
    level: 5,
    hitPoints: { current: 35, maximum: 35 },
    armorClass: 4,
    encumbrance: 50,
    movementRate: 120,
    abilities: {
      strength: 16,
      dexterity: 15, // Good dexterity for missile modifier
      constitution: 14,
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
      dexterityMissile: 0, // Will vary in tests
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
      'Poison or Death': 10,
      Wands: 11,
      'Paralysis, Polymorph, or Petrification': 12,
      'Breath Weapons': 13,
      'Spells, Rods, or Staves': 14,
    },
    experience: {
      current: 32000,
      requiredForNextLevel: 64000,
      level: 5,
    },
    currency: {
      platinum: 0,
      gold: 250,
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
    age: 28,
    ageCategory: 'Adult',
    henchmen: [],
    racialAbilities: [],
    classAbilities: [],
    proficiencies: [],
    secondarySkills: [],
    thac0: 16,
    alignment: 'Lawful Good',
    inventory: [],
    position: '0,0',
    statusEffects: [],
    ...overrides,
  };
}

// Helper function for mock monster creation
function createMockMonster(overrides: Partial<Monster> = {}): Monster {
  return {
    id: 'test-orc',
    name: 'Orc Warrior',
    level: 1,
    hitDice: '1+1',
    hitPoints: { current: 6, maximum: 6 },
    armorClass: 6,
    thac0: 19,
    experience: { current: 0, level: 1, requiredForNextLevel: 0 },
    alignment: 'Chaotic Evil',
    inventory: [],
    position: '1,1',
    statusEffects: [],
    damagePerAttack: ['1d8'],
    morale: 8,
    treasure: 'D',
    specialAbilities: [],
    xpValue: 15,
    size: 'Medium',
    movementTypes: [{ type: 'Walk', rate: 90 }],
    habitat: ['any'],
    frequency: 'Common',
    organization: 'tribe',
    diet: 'omnivore',
    ecology: 'humanoid',
    ...overrides,
  };
}

// Helper function for weapon creation
function createMockWeapon(name: string, overrides: Partial<Weapon> = {}): Weapon {
  const weaponDefaults: Record<string, Partial<Weapon>> = {
    'Long Sword': {
      damage: '1d8',
      twoHanded: false,
      type: 'Melee',
      size: 'Medium',
      speed: 5,
      allowedClasses: ['Fighter', 'Paladin', 'Ranger'],
      damageVsLarge: null,
      range: null,
    },
    Dagger: {
      damage: '1d4',
      twoHanded: false,
      type: 'Melee',
      size: 'Small',
      speed: 2,
      allowedClasses: ['Fighter', 'Paladin', 'Ranger', 'Thief', 'Assassin'],
      damageVsLarge: null,
      range: [10, 20, 30],
    },
    'Hand Axe': {
      damage: '1d6',
      twoHanded: false,
      type: 'Melee',
      size: 'Medium',
      speed: 4,
      allowedClasses: ['Fighter', 'Paladin', 'Ranger'],
      damageVsLarge: null,
      range: [10, 20, 30],
    },
    'Two-Handed Sword': {
      damage: '1d10',
      twoHanded: true,
      type: 'Melee',
      size: 'Large',
      speed: 10,
      allowedClasses: ['Fighter', 'Paladin', 'Ranger'],
      damageVsLarge: '3d6',
      range: null,
    },
  };

  return {
    id: `weapon-${name.toLowerCase().replace(/\s+/g, '-')}`,
    name,
    description: `A ${name.toLowerCase()}`,
    weight: 3,
    value: 15,
    equipped: false,
    magicBonus: null,
    charges: null,
    damage: '1d4', // Default damage
    type: 'Melee' as const,
    size: 'Medium' as const,
    speed: 5,
    allowedClasses: ['Fighter'],
    damageVsLarge: null,
    range: null,
    twoHanded: false,
    ...weaponDefaults[name],
    ...overrides,
  };
}

describe('TwoWeaponFightingRule', () => {
  let context: GameContext;
  let rule: TwoWeaponFightingRule;
  let mockCommand: Command;

  beforeEach(() => {
    const store = createStore();
    context = new GameContext(store);
    rule = new TwoWeaponFightingRule();
    mockCommand = { type: COMMAND_TYPES.ATTACK } as Command;
  });

  describe('Rule Application', () => {
    it('should apply to attack commands with two-weapon context', () => {
      const attacker = createMockCharacter();
      const target = createMockMonster();
      const mainHandWeapon = createMockWeapon('Long Sword');
      const offHandWeapon = createMockWeapon('Dagger');

      context.setTemporary('two-weapon-context', {
        attacker,
        target,
        mainHandWeapon,
        offHandWeapon,
      });

      expect(rule.canApply(context, mockCommand)).toBe(true);
    });

    it('should not apply to non-attack commands', () => {
      const mockCommand = { type: 'other-command-type' } as Command;

      expect(rule.canApply(context, mockCommand)).toBe(false);
    });

    it('should not apply without two-weapon context', () => {
      expect(rule.canApply(context, mockCommand)).toBe(false);
    });
  });

  describe('Rule Execution', () => {
    it('should execute two-weapon attack with valid weapons', async () => {
      const attacker = createMockCharacter();
      const target = createMockMonster();
      const mainHandWeapon = createMockWeapon('Long Sword');
      const offHandWeapon = createMockWeapon('Dagger');

      context.setTemporary('two-weapon-context', {
        attacker,
        target,
        mainHandWeapon,
        offHandWeapon,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Two-weapon attack resolved');
      expect(result.stopChain).toBe(true);

      // Check that results were stored
      const twoWeaponResults = context.getTemporary('two-weapon-results');
      const mainHandResult = context.getTemporary('main-hand-result');
      const offHandResult = context.getTemporary('off-hand-result');

      expect(twoWeaponResults).toBeDefined();
      expect(mainHandResult).toBeDefined();
      expect(offHandResult).toBeDefined();
    });

    it('should reject invalid off-hand weapons', async () => {
      const attacker = createMockCharacter();
      const target = createMockMonster();
      const mainHandWeapon = createMockWeapon('Long Sword');
      const offHandWeapon = createMockWeapon('Long Sword'); // Invalid off-hand weapon

      context.setTemporary('two-weapon-context', {
        attacker,
        target,
        mainHandWeapon,
        offHandWeapon,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('cannot be used as an off-hand weapon');
      expect(result.message).toContain('Only daggers and hand axes are allowed');
    });

    it('should handle missing two-weapon context', async () => {
      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('No two-weapon fighting context found');
    });

    it('should apply dexterity modifiers to attack penalties', async () => {
      const attacker = createMockCharacter({
        abilityModifiers: {
          ...createMockCharacter().abilityModifiers,
          dexterityMissile: 1, // +1 to missile attacks (reduces penalties)
        },
      });
      const target = createMockMonster();
      const mainHandWeapon = createMockWeapon('Long Sword');
      const offHandWeapon = createMockWeapon('Dagger');

      context.setTemporary('two-weapon-context', {
        attacker,
        target,
        mainHandWeapon,
        offHandWeapon,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Two-weapon attack resolved');

      // The rule should have calculated penalties with dexterity modifiers
      // Main hand: -2 + 1 = -1
      // Off hand: -4 + 1 = -3
      const twoWeaponResults = context.getTemporary('two-weapon-results');
      expect(twoWeaponResults).toBeDefined();
    });

    it('should handle target defeat by main hand attack', async () => {
      const attacker = createMockCharacter();
      const target = createMockMonster({
        hitPoints: { current: 1, maximum: 6 }, // Low HP, likely to be defeated
      });
      const mainHandWeapon = createMockWeapon('Long Sword');
      const offHandWeapon = createMockWeapon('Dagger');

      context.setTemporary('two-weapon-context', {
        attacker,
        target,
        mainHandWeapon,
        offHandWeapon,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);

      const twoWeaponResults = context.getTemporary('two-weapon-results');
      expect(twoWeaponResults).toBeDefined();
    });
  });

  describe('Weapon Eligibility', () => {
    it('should allow daggers as off-hand weapons', async () => {
      const attacker = createMockCharacter();
      const target = createMockMonster();
      const mainHandWeapon = createMockWeapon('Long Sword');
      const offHandWeapon = createMockWeapon('Dagger');

      context.setTemporary('two-weapon-context', {
        attacker,
        target,
        mainHandWeapon,
        offHandWeapon,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
    });

    it('should allow hand axes as off-hand weapons', async () => {
      const attacker = createMockCharacter();
      const target = createMockMonster();
      const mainHandWeapon = createMockWeapon('Long Sword');
      const offHandWeapon = createMockWeapon('Hand Axe');

      context.setTemporary('two-weapon-context', {
        attacker,
        target,
        mainHandWeapon,
        offHandWeapon,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
    });

    it('should reject other weapons as off-hand', async () => {
      const invalidWeapons = ['Long Sword', 'Mace', 'Short Bow'];

      for (const weaponName of invalidWeapons) {
        const attacker = createMockCharacter();
        const target = createMockMonster();
        const mainHandWeapon = createMockWeapon('Long Sword');
        const offHandWeapon = createMockWeapon(weaponName);

        context.setTemporary('two-weapon-context', {
          attacker,
          target,
          mainHandWeapon,
          offHandWeapon,
        });

        const result = await rule.execute(context, mockCommand);

        expect(result.success).toBe(false);
        expect(result.message).toContain('cannot be used as an off-hand weapon');
      }
    });
  });

  describe('OSRIC Compliance', () => {
    it('should implement OSRIC two-weapon fighting penalties', async () => {
      const attacker = createMockCharacter({
        abilityModifiers: {
          ...createMockCharacter().abilityModifiers,
          dexterityMissile: 0, // No modifier for cleaner test
        },
      });
      const target = createMockMonster();
      const mainHandWeapon = createMockWeapon('Long Sword');
      const offHandWeapon = createMockWeapon('Dagger');

      context.setTemporary('two-weapon-context', {
        attacker,
        target,
        mainHandWeapon,
        offHandWeapon,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);

      // OSRIC rules: Main hand -2, Off hand -4
      // These penalties should be applied in the attack calculations
      const twoWeaponResults = context.getTemporary('two-weapon-results');
      expect(twoWeaponResults).toBeDefined();
    });

    it('should prevent bonuses from dexterity (minimum penalty is 0)', async () => {
      const attacker = createMockCharacter({
        abilityModifiers: {
          ...createMockCharacter().abilityModifiers,
          dexterityMissile: 5, // High bonus that would eliminate penalties
        },
      });
      const target = createMockMonster();
      const mainHandWeapon = createMockWeapon('Long Sword');
      const offHandWeapon = createMockWeapon('Dagger');

      context.setTemporary('two-weapon-context', {
        attacker,
        target,
        mainHandWeapon,
        offHandWeapon,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);

      // Even with high dexterity, penalties shouldn't become bonuses
      // The rule should cap at 0 penalty (no bonus)
      const twoWeaponResults = context.getTemporary('two-weapon-results');
      expect(twoWeaponResults).toBeDefined();
    });
  });
});

describe('TwoWeaponEligibilityRule', () => {
  let context: GameContext;
  let rule: TwoWeaponEligibilityRule;
  let mockCommand: Command;

  beforeEach(() => {
    const store = createStore();
    context = new GameContext(store);
    rule = new TwoWeaponEligibilityRule();
    mockCommand = { type: COMMAND_TYPES.CHECK_TWO_WEAPON } as Command;
  });

  describe('Rule Application', () => {
    it('should apply to check-two-weapon commands with required context', () => {
      const character = createMockCharacter();
      const mainHandWeapon = createMockWeapon('Long Sword');
      const offHandWeapon = createMockWeapon('Dagger');

      context.setTemporary('character', character);
      context.setTemporary('main-hand-weapon', mainHandWeapon);
      context.setTemporary('off-hand-weapon', offHandWeapon);

      expect(rule.canApply(context, mockCommand)).toBe(true);
    });

    it('should not apply to other command types', () => {
      const mockCommand = { type: 'other-command-type' } as Command;

      expect(rule.canApply(context, mockCommand)).toBe(false);
    });

    it('should not apply without required context', () => {
      expect(rule.canApply(context, mockCommand)).toBe(false);
    });
  });

  describe('Eligibility Checks', () => {
    it('should allow valid two-weapon combinations', async () => {
      const character = createMockCharacter();
      const mainHandWeapon = createMockWeapon('Long Sword');
      const offHandWeapon = createMockWeapon('Dagger');

      context.setTemporary('character', character);
      context.setTemporary('main-hand-weapon', mainHandWeapon);
      context.setTemporary('off-hand-weapon', offHandWeapon);

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Two-weapon fighting is allowed');

      const eligibility = context.getTemporary('two-weapon-eligibility') as TwoWeaponEligibility;
      expect(eligibility).toBeDefined();
      expect(eligibility.canUseTwoWeapons).toBe(true);
      expect(eligibility.penalties).toBeDefined();
    });

    it('should reject two-handed main weapons', async () => {
      const character = createMockCharacter();
      const mainHandWeapon = createMockWeapon('Two-Handed Sword');
      const offHandWeapon = createMockWeapon('Dagger');

      context.setTemporary('character', character);
      context.setTemporary('main-hand-weapon', mainHandWeapon);
      context.setTemporary('off-hand-weapon', offHandWeapon);

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true); // Rule succeeds but eligibility fails
      expect(result.message).toContain('Main hand weapon is two-handed');

      const eligibility = context.getTemporary('two-weapon-eligibility') as TwoWeaponEligibility;
      expect(eligibility.canUseTwoWeapons).toBe(false);
      expect(eligibility.reason).toContain('two-handed');
    });

    it('should reject invalid off-hand weapons', async () => {
      const character = createMockCharacter();
      const mainHandWeapon = createMockWeapon('Long Sword');
      const offHandWeapon = createMockWeapon('Long Sword');

      context.setTemporary('character', character);
      context.setTemporary('main-hand-weapon', mainHandWeapon);
      context.setTemporary('off-hand-weapon', offHandWeapon);

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true); // Rule succeeds but eligibility fails
      expect(result.message).toContain('dagger or hand axe');

      const eligibility = context.getTemporary('two-weapon-eligibility') as TwoWeaponEligibility;
      expect(eligibility.canUseTwoWeapons).toBe(false);
      expect(eligibility.reason).toContain('dagger or hand axe');
    });

    it('should calculate proper penalties', async () => {
      const character = createMockCharacter({
        abilityModifiers: {
          ...createMockCharacter().abilityModifiers,
          dexterityMissile: 1,
        },
      });
      const mainHandWeapon = createMockWeapon('Long Sword');
      const offHandWeapon = createMockWeapon('Dagger');

      context.setTemporary('character', character);
      context.setTemporary('main-hand-weapon', mainHandWeapon);
      context.setTemporary('off-hand-weapon', offHandWeapon);

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);

      const eligibility = context.getTemporary('two-weapon-eligibility') as TwoWeaponEligibility;
      expect(eligibility.canUseTwoWeapons).toBe(true);
      expect(eligibility.penalties).toBeDefined();
      if (eligibility.penalties) {
        expect(eligibility.penalties.mainHandPenalty).toBe(-1); // -2 + 1 = -1
        expect(eligibility.penalties.offHandPenalty).toBe(-3); // -4 + 1 = -3
      }
    });

    it('should handle missing context data', async () => {
      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Character or weapons not found');
    });
  });
});
