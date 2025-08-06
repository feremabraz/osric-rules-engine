import { GameContext } from '@osric/core/GameContext';
import {
  SpecializationLevel,
  WeaponSpecializationRule,
} from '@osric/rules/combat/WeaponSpecializationRules';
import { COMMAND_TYPES } from '@osric/types/constants';
import type { Character, Weapon } from '@osric/types/entities';
import { createStore } from 'jotai';
import { beforeEach, describe, expect, it } from 'vitest';

interface SpecializationEligibility {
  canSpecialize: boolean;
  canDoubleSpecialize: boolean;
  slotCost: number;
  reason?: string;
}

interface SpecializationBonuses {
  level: SpecializationLevel;
  hitBonus: number;
  damageBonus: number;
  attackRate: number;
}

function createMockCharacter(overrides: Partial<Character> = {}): Character {
  const defaultCharacter: Character = {
    id: 'test-char',
    name: 'Test Character',
    level: 5,
    hitPoints: { current: 35, maximum: 35 },
    armorClass: 10,
    thac0: 16,
    experience: { current: 16000, requiredForNextLevel: 32000, level: 5 },
    alignment: 'True Neutral',
    inventory: [],
    position: 'town',
    statusEffects: [],
    race: 'Human',
    class: 'Fighter',
    abilities: {
      strength: 16,
      dexterity: 14,
      constitution: 14,
      intelligence: 10,
      wisdom: 10,
      charisma: 10,
    },
    abilityModifiers: {
      strengthHitAdj: 1,
      strengthDamageAdj: 1,
      strengthEncumbrance: null,
      strengthOpenDoors: null,
      strengthBendBars: null,
      dexterityReaction: 1,
      dexterityMissile: null,
      dexterityDefense: -1,
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
      'Poison or Death': 12,
      Wands: 13,
      'Paralysis, Polymorph, or Petrification': 14,
      'Breath Weapons': 15,
      'Spells, Rods, or Staves': 16,
    },
    spells: [],
    currency: { platinum: 0, gold: 100, electrum: 0, silver: 50, copper: 0 },
    encumbrance: 0,
    movementRate: 120,
    classes: { Fighter: 5 },
    primaryClass: null,
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
    proficiencies: [
      { weapon: 'Longsword', penalty: 0 },
      { weapon: 'Bow (Long)', penalty: 0 },
    ],
    weaponSpecializations: [],
    secondarySkills: [],
  };

  return { ...defaultCharacter, ...overrides };
}

function createMockWeapon(overrides: Partial<Weapon> = {}): Weapon {
  const defaultWeapon: Weapon = {
    id: 'test-weapon',
    name: 'Longsword',
    type: 'Melee',
    size: 'Medium',
    damage: '1d8',
    damageVsLarge: '1d12',
    speed: 5,
    allowedClasses: ['Fighter', 'Paladin', 'Ranger'],
    range: null,
    twoHanded: false,
    weight: 4,
    value: 15,
    description: 'A standard longsword',
    equipped: false,
    magicBonus: 0,
    charges: null,
  };

  return { ...defaultWeapon, ...overrides };
}

class MockSpecializationCommand {
  readonly type = COMMAND_TYPES.CHECK_SPECIALIZATION;
  readonly actorId = 'test-actor';
  readonly targetIds: string[] = [];

  async execute(_context: GameContext) {
    return { success: true, message: 'Mock specialization command executed' };
  }

  canExecute(_context: GameContext): boolean {
    return true;
  }

  getRequiredRules(): string[] {
    return ['weapon-specialization'];
  }

  getInvolvedEntities(): string[] {
    return [this.actorId, ...this.targetIds];
  }
}

describe('WeaponSpecializationRules', () => {
  let context: GameContext;
  let store: ReturnType<typeof createStore>;
  let mockCommand: MockSpecializationCommand;
  let rule: WeaponSpecializationRule;

  beforeEach(() => {
    store = createStore();
    context = new GameContext(store);
    mockCommand = new MockSpecializationCommand();
    rule = new WeaponSpecializationRule();
  });

  describe('WeaponSpecializationRule', () => {
    it('should check specialization eligibility for Fighter', async () => {
      const fighter = createMockCharacter({
        name: 'Fighter',
        class: 'Fighter',
        proficiencies: [{ weapon: 'Longsword', penalty: 0 }],
      });
      const longsword = createMockWeapon({ name: 'Longsword' });

      context.setTemporary('specialization-context', {
        character: fighter,
        weapon: longsword,
        checkEligibility: true,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Can specialize in Longsword');

      const eligibility = context.getTemporary(
        'specialization-eligibility'
      ) as SpecializationEligibility;
      expect(eligibility).toBeDefined();
      expect(eligibility.canSpecialize).toBe(true);
      expect(eligibility.slotCost).toBeGreaterThan(0);
    });

    it('should reject specialization for non-fighter classes', async () => {
      const wizard = createMockCharacter({
        name: 'Wizard',
        class: 'Magic-User',
        proficiencies: [{ weapon: 'Dagger', penalty: 0 }],
      });
      const dagger = createMockWeapon({ name: 'Dagger' });

      context.setTemporary('specialization-context', {
        character: wizard,
        weapon: dagger,
        checkEligibility: true,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Cannot specialize in Dagger');

      const eligibility = context.getTemporary(
        'specialization-eligibility'
      ) as SpecializationEligibility;
      expect(eligibility).toBeDefined();
      expect(eligibility.canSpecialize).toBe(false);
      expect(eligibility.reason).toContain('Only Fighter, Paladin, and Ranger');
    });

    it('should allow Paladin specialization', async () => {
      const paladin = createMockCharacter({
        name: 'Paladin',
        class: 'Paladin',
        proficiencies: [{ weapon: 'Longsword', penalty: 0 }],
      });
      const longsword = createMockWeapon({ name: 'Longsword' });

      context.setTemporary('specialization-context', {
        character: paladin,
        weapon: longsword,
        checkEligibility: true,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Can specialize in Longsword');

      const eligibility = context.getTemporary(
        'specialization-eligibility'
      ) as SpecializationEligibility;
      expect(eligibility.canSpecialize).toBe(true);
    });

    it('should allow Ranger specialization', async () => {
      const ranger = createMockCharacter({
        name: 'Ranger',
        class: 'Ranger',
        proficiencies: [{ weapon: 'Bow (Long)', penalty: 0 }],
      });
      const longbow = createMockWeapon({
        name: 'Bow (Long)',
        type: 'Ranged',
        damage: '1d6',
      });

      context.setTemporary('specialization-context', {
        character: ranger,
        weapon: longbow,
        checkEligibility: true,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Can specialize in Bow (Long)');

      const eligibility = context.getTemporary(
        'specialization-eligibility'
      ) as SpecializationEligibility;
      expect(eligibility.canSpecialize).toBe(true);
    });

    it('should require weapon proficiency for specialization', async () => {
      const fighter = createMockCharacter({
        name: 'Fighter',
        class: 'Fighter',
        proficiencies: [{ weapon: 'Dagger', penalty: 0 }],
      });
      const longsword = createMockWeapon({ name: 'Longsword' });

      context.setTemporary('specialization-context', {
        character: fighter,
        weapon: longsword,
        checkEligibility: true,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Cannot specialize in Longsword');

      const eligibility = context.getTemporary(
        'specialization-eligibility'
      ) as SpecializationEligibility;
      expect(eligibility.canSpecialize).toBe(false);
      expect(eligibility.reason).toContain('Must be proficient');
    });

    it('should calculate regular specialization bonuses for melee weapons', async () => {
      const specialist = createMockCharacter({
        name: 'Specialist Fighter',
        class: 'Fighter',
        level: 5,
        proficiencies: [{ weapon: 'Longsword', penalty: 0 }],
        weaponSpecializations: [
          {
            weapon: 'Longsword',
            bonuses: {
              attackBonus: 1,
              damageBonus: 2,
              extraAttacks: 0.5,
            },
          },
        ],
      });
      const longsword = createMockWeapon({ name: 'Longsword', type: 'Melee' });

      context.setTemporary('specialization-context', {
        character: specialist,
        weapon: longsword,
        calculateBonuses: true,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Specialization bonuses applied');

      const bonuses = context.getTemporary('specialization-bonuses') as SpecializationBonuses;
      expect(bonuses).toBeDefined();
      expect(bonuses.level).toBe(SpecializationLevel.SPECIALIZED);
      expect(bonuses.hitBonus).toBe(1);
      expect(bonuses.damageBonus).toBe(2);
      expect(bonuses.attackRate).toBeGreaterThan(1);
    });

    it('should calculate double specialization bonuses for melee weapons', async () => {
      const doubleSpecialist = createMockCharacter({
        name: 'Double Specialist Fighter',
        class: 'Fighter',
        level: 7,
        proficiencies: [{ weapon: 'Longsword', penalty: 0 }],
        weaponSpecializations: [
          {
            weapon: 'Longsword',
            bonuses: {
              attackBonus: 3,
              damageBonus: 3,
              extraAttacks: 1,
            },
          },
        ],
      });
      const longsword = createMockWeapon({ name: 'Longsword', type: 'Melee' });

      context.setTemporary('specialization-context', {
        character: doubleSpecialist,
        weapon: longsword,
        calculateBonuses: true,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Specialization bonuses applied');

      const bonuses = context.getTemporary('specialization-bonuses') as SpecializationBonuses;
      expect(bonuses.level).toBe(SpecializationLevel.DOUBLE_SPECIALIZED);
      expect(bonuses.hitBonus).toBe(3);
      expect(bonuses.damageBonus).toBe(3);
    });

    it('should calculate ranged weapon specialization bonuses', async () => {
      const archerSpecialist = createMockCharacter({
        name: 'Archer Specialist',
        class: 'Ranger',
        level: 4,
        proficiencies: [{ weapon: 'Bow (Long)', penalty: 0 }],
        weaponSpecializations: [
          {
            weapon: 'Bow (Long)',
            bonuses: {
              attackBonus: 1,
              damageBonus: 1,
              extraAttacks: 0.5,
            },
          },
        ],
      });
      const longbow = createMockWeapon({
        name: 'Bow (Long)',
        type: 'Ranged',
        damage: '1d6',
      });

      context.setTemporary('specialization-context', {
        character: archerSpecialist,
        weapon: longbow,
        calculateBonuses: true,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);

      const bonuses = context.getTemporary('specialization-bonuses') as SpecializationBonuses;
      expect(bonuses.level).toBe(SpecializationLevel.SPECIALIZED);
      expect(bonuses.hitBonus).toBe(1);
      expect(bonuses.damageBonus).toBe(1);
    });

    it('should handle non-specialized characters', async () => {
      const nonSpecialist = createMockCharacter({
        name: 'Non-Specialist',
        class: 'Fighter',
        proficiencies: [{ weapon: 'Longsword', penalty: 0 }],
        weaponSpecializations: [],
      });
      const longsword = createMockWeapon({ name: 'Longsword' });

      context.setTemporary('specialization-context', {
        character: nonSpecialist,
        weapon: longsword,
        calculateBonuses: true,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('No specialization bonuses');

      const bonuses = context.getTemporary('specialization-bonuses') as SpecializationBonuses;
      expect(bonuses.level).toBe(SpecializationLevel.NONE);
      expect(bonuses.hitBonus).toBe(0);
      expect(bonuses.damageBonus).toBe(0);
    });

    it('should calculate proper attack rates by level', async () => {
      const lowLevelFighter = createMockCharacter({
        name: 'Low Level Fighter',
        class: 'Fighter',
        level: 3,
        weaponSpecializations: [],
      });
      const sword = createMockWeapon({ name: 'Longsword' });

      context.setTemporary('specialization-context', {
        character: lowLevelFighter,
        weapon: sword,
        calculateBonuses: true,
      });

      let result = await rule.execute(context, mockCommand);
      expect(result.success).toBe(true);
      let bonuses = context.getTemporary('specialization-bonuses') as SpecializationBonuses;
      expect(bonuses.attackRate).toBe(1);

      const midLevelFighter = createMockCharacter({
        name: 'Mid Level Fighter',
        class: 'Fighter',
        level: 8,
        weaponSpecializations: [],
      });

      context.setTemporary('specialization-context', {
        character: midLevelFighter,
        weapon: sword,
        calculateBonuses: true,
      });

      result = await rule.execute(context, mockCommand);
      bonuses = context.getTemporary('specialization-bonuses') as SpecializationBonuses;
      expect(bonuses.attackRate).toBe(1.5);

      const highLevelFighter = createMockCharacter({
        name: 'High Level Fighter',
        class: 'Fighter',
        level: 15,
        weaponSpecializations: [],
      });

      context.setTemporary('specialization-context', {
        character: highLevelFighter,
        weapon: sword,
        calculateBonuses: true,
      });

      result = await rule.execute(context, mockCommand);
      bonuses = context.getTemporary('specialization-bonuses') as SpecializationBonuses;
      expect(bonuses.attackRate).toBe(2);
    });

    it('should only apply to specialization commands with context', () => {
      const wrongCommand = { ...mockCommand, type: 'move' };
      expect(rule.canApply(context, wrongCommand as unknown as typeof mockCommand)).toBe(false);

      expect(rule.canApply(context, mockCommand)).toBe(false);

      context.setTemporary('specialization-context', {
        character: createMockCharacter(),
        weapon: createMockWeapon(),
        checkEligibility: true,
      });
      expect(rule.canApply(context, mockCommand)).toBe(true);
    });

    it('should fail gracefully without specialization context', async () => {
      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('No specialization context found');
    });

    it('should handle attack commands with specialization context', async () => {
      const attackCommand = { ...mockCommand, type: COMMAND_TYPES.ATTACK };

      context.setTemporary('specialization-context', {
        character: createMockCharacter(),
        weapon: createMockWeapon(),
        calculateBonuses: true,
      });

      expect(rule.canApply(context, attackCommand as unknown as typeof mockCommand)).toBe(true);
    });

    it('should preserve OSRIC specialization mechanics exactly', async () => {
      const osricFighter = createMockCharacter({
        name: 'OSRIC Fighter',
        class: 'Fighter',
        level: 5,
        proficiencies: [{ weapon: 'Longsword', penalty: 0 }],
        weaponSpecializations: [
          {
            weapon: 'Longsword',
            bonuses: {
              attackBonus: 1,
              damageBonus: 2,
              extraAttacks: 0.5,
            },
          },
        ],
      });
      const osricWeapon = createMockWeapon({
        name: 'Longsword',
        type: 'Melee',
      });

      context.setTemporary('specialization-context', {
        character: osricFighter,
        weapon: osricWeapon,
        calculateBonuses: true,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);

      const bonuses = context.getTemporary('specialization-bonuses') as SpecializationBonuses;

      expect(bonuses.level).toBe(SpecializationLevel.SPECIALIZED);
      expect(bonuses.hitBonus).toBe(1);
      expect(bonuses.damageBonus).toBe(2);
      expect(bonuses.attackRate).toBeGreaterThan(1);
    });

    it('should handle weapon slot costs correctly', async () => {
      const fighter = createMockCharacter({
        name: 'Fighter',
        class: 'Fighter',
        proficiencies: [{ weapon: 'Longsword', penalty: 0 }],
      });
      const longsword = createMockWeapon({ name: 'Longsword' });

      context.setTemporary('specialization-context', {
        character: fighter,
        weapon: longsword,
        checkEligibility: true,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);

      const eligibility = context.getTemporary(
        'specialization-eligibility'
      ) as SpecializationEligibility;
      expect(eligibility.slotCost).toBeGreaterThan(0);
      expect(Number.isInteger(eligibility.slotCost)).toBe(true);
    });

    it('should handle edge cases with missing data', async () => {
      const characterNoProficiencies = createMockCharacter({
        name: 'No Proficiencies',
        class: 'Fighter',
        proficiencies: [],
      });
      const weapon = createMockWeapon({ name: 'Longsword' });

      context.setTemporary('specialization-context', {
        character: characterNoProficiencies,
        weapon: weapon,
        checkEligibility: true,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      const eligibility = context.getTemporary(
        'specialization-eligibility'
      ) as SpecializationEligibility;
      expect(eligibility.canSpecialize).toBe(false);
      expect(eligibility.reason).toContain('Must be proficient');
    });
  });
});
