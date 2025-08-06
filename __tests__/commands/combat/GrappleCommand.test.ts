import { GrappleCommand } from '@osric/commands/combat/GrappleCommand';
import { GameContext } from '@osric/core/GameContext';
import type { Character, Monster } from '@osric/types/entities';
import { createStore } from 'jotai';
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.spyOn(Math, 'random').mockImplementation(() => 0.5);

function createMockCharacter(overrides: Partial<Character> = {}): Character {
  return {
    id: 'test-character',
    name: 'Test Fighter',
    race: 'Human',
    class: 'Fighter',
    level: 3,
    hitPoints: { current: 25, maximum: 25 },
    armorClass: 5,
    thac0: 18,
    abilities: {
      strength: 16,
      dexterity: 14,
      constitution: 15,
      intelligence: 12,
      wisdom: 13,
      charisma: 11,
    },
    abilityModifiers: {
      strengthHitAdj: 1,
      strengthDamageAdj: 1,
      strengthEncumbrance: null,
      strengthOpenDoors: null,
      strengthBendBars: null,
      dexterityReaction: 1,
      dexterityMissile: 1,
      dexterityDefense: -1,
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
    experience: { current: 4000, requiredForNextLevel: 8000, level: 3 },
    alignment: 'Neutral Good',
    inventory: [],
    position: 'combat',
    statusEffects: [],
    savingThrows: {
      'Poison or Death': 12,
      Wands: 13,
      'Paralysis, Polymorph, or Petrification': 14,
      'Breath Weapons': 15,
      'Spells, Rods, or Staves': 16,
    },
    spells: [],
    currency: { platinum: 0, gold: 50, electrum: 0, silver: 0, copper: 0 },
    encumbrance: 50,
    movementRate: 9,
    classes: { Fighter: 3 },
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
    proficiencies: [],
    secondarySkills: [],
    ...overrides,
  } as Character;
}

function createMockMonster(overrides: Partial<Monster> = {}): Monster {
  return {
    id: 'test-orc',
    name: 'Orc Warrior',
    level: 1,
    hitPoints: { current: 8, maximum: 8 },
    armorClass: 6,
    thac0: 19,
    experience: { current: 0, requiredForNextLevel: 0, level: 1 },
    alignment: 'Chaotic Evil',
    inventory: [],
    position: 'combat',
    statusEffects: [],
    hitDice: '1d8',
    damagePerAttack: ['1d8'],
    morale: 8,
    treasure: 'C',
    specialAbilities: [],
    xpValue: 15,
    size: 'Medium',
    movementTypes: [{ type: 'Walk', rate: 9 }],
    habitat: ['Underground'],
    frequency: 'Common',
    organization: 'Tribal',
    diet: 'Omnivore',
    ecology: 'Tribal',
    ...overrides,
  } as Monster;
}

interface GrappleContext {
  attacker: Character | Monster;
  target: Character | Monster;
  grappleType: 'standard' | 'overbearing';
  isChargedAttack: boolean;
}

describe('GrappleCommand', () => {
  let context: GameContext;
  let testCharacter: Character;
  let testMonster: Monster;

  beforeEach(() => {
    const store = createStore();
    context = new GameContext(store);

    testCharacter = createMockCharacter();
    testMonster = createMockMonster();

    context.setEntity('test-character', testCharacter);
    context.setEntity('test-orc', testMonster);
  });

  test('should create grapple command with valid parameters', () => {
    const command = new GrappleCommand(
      {
        attackerId: 'test-character',
        targetId: 'test-orc',
        grappleType: 'standard',
      },
      'test-character'
    );

    expect(command.type).toBe('grapple');
    expect(command.getDescription()).toContain('test-character attempts to grapple test-orc');
  });

  test('should validate grapple command can execute', () => {
    const command = new GrappleCommand(
      {
        attackerId: 'test-character',
        targetId: 'test-orc',
        grappleType: 'standard',
      },
      'test-character'
    );

    expect(command.canExecute(context)).toBe(true);
  });

  test('should fail validation if attacker does not exist', () => {
    const command = new GrappleCommand(
      {
        attackerId: 'nonexistent',
        targetId: 'test-orc',
        grappleType: 'standard',
      },
      'nonexistent'
    );

    expect(command.canExecute(context)).toBe(false);
  });

  test('should fail validation if target does not exist', () => {
    const command = new GrappleCommand(
      {
        attackerId: 'test-character',
        targetId: 'nonexistent',
        grappleType: 'standard',
      },
      'test-character'
    );

    expect(command.canExecute(context)).toBe(false);
  });

  test('should fail validation if attacker is unconscious', () => {
    testCharacter.hitPoints.current = 0;
    context.setEntity('test-character', testCharacter);

    const command = new GrappleCommand(
      {
        attackerId: 'test-character',
        targetId: 'test-orc',
        grappleType: 'standard',
      },
      'test-character'
    );

    expect(command.canExecute(context)).toBe(false);
  });

  test('should fail validation if attacker is already grappling', () => {
    testCharacter.statusEffects.push({
      name: 'Grappling',
      duration: -1,
      effect: 'Currently grappling another creature',
      savingThrow: null,
      endCondition: 'Grapple ends',
    });
    context.setEntity('test-character', testCharacter);

    const command = new GrappleCommand(
      {
        attackerId: 'test-character',
        targetId: 'test-orc',
        grappleType: 'standard',
      },
      'test-character'
    );

    expect(command.canExecute(context)).toBe(false);
  });

  test('should fail validation for overbear without charge attack', () => {
    const command = new GrappleCommand(
      {
        attackerId: 'test-character',
        targetId: 'test-orc',
        grappleType: 'overbearing',
        isChargedAttack: false,
      },
      'test-character'
    );

    expect(command.canExecute(context)).toBe(false);
  });

  test('should execute grapple command and set context', async () => {
    const command = new GrappleCommand(
      {
        attackerId: 'test-character',
        targetId: 'test-orc',
        grappleType: 'standard',
      },
      'test-character'
    );

    const result = await command.execute(context);

    expect(result.success).toBe(true);
    expect(result.message).toContain('Grapple command prepared for rule processing');

    const grappleContext = context.getTemporary('grapple-context') as GrappleContext;
    expect(grappleContext).toBeDefined();
    expect(grappleContext.attacker.id).toBe('test-character');
    expect(grappleContext.target.id).toBe('test-orc');
    expect(grappleContext.grappleType).toBe('standard');
  });

  test('should execute overbear command with charge attack', async () => {
    const command = new GrappleCommand(
      {
        attackerId: 'test-character',
        targetId: 'test-orc',
        grappleType: 'overbearing',
        isChargedAttack: true,
      },
      'test-character'
    );

    const result = await command.execute(context);

    expect(result.success).toBe(true);

    const grappleContext = context.getTemporary('grapple-context') as GrappleContext;
    expect(grappleContext.grappleType).toBe('overbearing');
    expect(grappleContext.isChargedAttack).toBe(true);
  });

  test('should get required rules for grapple processing', () => {
    const command = new GrappleCommand(
      {
        attackerId: 'test-character',
        targetId: 'test-orc',
        grappleType: 'standard',
      },
      'test-character'
    );

    const requiredRules = command.getRequiredRules();
    expect(requiredRules).toContain('grapple-attack');
    expect(requiredRules).toContain('strength-comparison');
    expect(requiredRules).toContain('grapple-effects');
  });

  test('should provide descriptive grapple descriptions', () => {
    const grappleCommand = new GrappleCommand(
      {
        attackerId: 'test-character',
        targetId: 'test-orc',
        grappleType: 'standard',
      },
      'test-character'
    );

    expect(grappleCommand.getDescription()).toBe('test-character attempts to grapple test-orc');

    const overbearCommand = new GrappleCommand(
      {
        attackerId: 'test-character',
        targetId: 'test-orc',
        grappleType: 'overbearing',
        isChargedAttack: true,
      },
      'test-character'
    );

    expect(overbearCommand.getDescription()).toBe(
      'test-character attempts to overbear test-orc (charge attack)'
    );

    const normalOverbearCommand = new GrappleCommand(
      {
        attackerId: 'test-character',
        targetId: 'test-orc',
        grappleType: 'overbearing',
      },
      'test-character'
    );

    expect(normalOverbearCommand.getDescription()).toBe(
      'test-character attempts to overbear test-orc'
    );
  });

  test('should handle monster grappling', async () => {
    const command = new GrappleCommand(
      {
        attackerId: 'test-orc',
        targetId: 'test-character',
        grappleType: 'standard',
      },
      'test-orc'
    );

    const result = await command.execute(context);

    expect(result.success).toBe(true);

    const grappleContext = context.getTemporary('grapple-context') as GrappleContext;
    expect(grappleContext.attacker.id).toBe('test-orc');
    expect(grappleContext.target.id).toBe('test-character');
  });

  test('should fail validation if target is already grappled', () => {
    testMonster.statusEffects.push({
      name: 'Grappled',
      duration: -1,
      effect: 'Currently being grappled',
      savingThrow: null,
      endCondition: 'Grapple ends',
    });
    context.setEntity('test-orc', testMonster);

    const command = new GrappleCommand(
      {
        attackerId: 'test-character',
        targetId: 'test-orc',
        grappleType: 'standard',
      },
      'test-character'
    );

    expect(command.canExecute(context)).toBe(false);
  });
});
