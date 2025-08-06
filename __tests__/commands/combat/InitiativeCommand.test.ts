import { createStore } from 'jotai';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { InitiativeCommand } from '../../../osric/commands/combat/InitiativeCommand';
import { GameContext } from '../../../osric/core/GameContext';
import type { Character, Monster, Weapon } from '../../../osric/types/entities';

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

interface InitiativeContext {
  entities: string[];
  initiativeType: 'individual' | 'group';
  weapons?: Record<string, string>;
  spells?: Record<string, string>;
  circumstanceModifiers?: Record<string, number>;
  isFirstRound?: boolean;
}

describe('InitiativeCommand', () => {
  let context: GameContext;
  let testCharacter: Character;
  let testMonster: Monster;
  let testWeapon: Weapon;

  beforeEach(() => {
    const store = createStore();
    context = new GameContext(store);

    testCharacter = createMockCharacter();
    testMonster = createMockMonster();

    testWeapon = {
      id: 'longsword',
      name: 'Longsword',
      weight: 40,
      description: 'A well-balanced longsword',
      value: 15,
      equipped: true,
      magicBonus: null,
      charges: null,
      damage: '1d8',
      type: 'Melee',
      size: 'Medium',
      speed: 5,
      allowedClasses: ['Fighter', 'Paladin', 'Ranger'],
      damageVsLarge: '1d12',
      range: null,
      twoHanded: false,
    } as Weapon;

    context.setEntity('test-character', testCharacter);
    context.setEntity('test-orc', testMonster);

    testCharacter.inventory.push(testWeapon);
  });

  test('should create initiative command with valid parameters', () => {
    const command = new InitiativeCommand(
      {
        entities: ['test-character'],
        initiativeType: 'individual',
      },
      'test-character'
    );

    expect(command.type).toBe('initiative');
    expect(command.getDescription()).toContain('Initiative roll for 1 entities');
  });

  test('should validate initiative command can execute', () => {
    const command = new InitiativeCommand(
      {
        entities: ['test-character'],
        initiativeType: 'individual',
      },
      'test-character'
    );

    expect(command.canExecute(context)).toBe(true);
  });

  test('should fail validation if entity does not exist', () => {
    const command = new InitiativeCommand(
      {
        entities: ['nonexistent'],
        initiativeType: 'individual',
      },
      'nonexistent'
    );

    expect(command.canExecute(context)).toBe(false);
  });

  test('should fail validation if entity is unconscious', () => {
    testCharacter.hitPoints.current = 0;
    context.setEntity('test-character', testCharacter);

    const command = new InitiativeCommand(
      {
        entities: ['test-character'],
        initiativeType: 'individual',
      },
      'test-character'
    );

    expect(command.canExecute(context)).toBe(false);
  });

  test('should execute individual initiative command', async () => {
    const command = new InitiativeCommand(
      {
        entities: ['test-character'],
        initiativeType: 'individual',
      },
      'test-character'
    );

    const result = await command.execute(context);

    expect(result.success).toBe(true);
    expect(result.message).toContain('Initiative command prepared for rule processing');

    const initiativeContext = context.getTemporary('initiative-context') as InitiativeContext;
    expect(initiativeContext).toBeDefined();
    expect(initiativeContext.entities).toEqual(['test-character']);
    expect(initiativeContext.initiativeType).toBe('individual');
  });

  test('should execute group initiative command', async () => {
    const command = new InitiativeCommand(
      {
        entities: ['test-character'],
        initiativeType: 'group',
      },
      'test-character'
    );

    const result = await command.execute(context);

    expect(result.success).toBe(true);

    const initiativeContext = context.getTemporary('initiative-context') as InitiativeContext;
    expect(initiativeContext.initiativeType).toBe('group');
  });

  test('should handle weapon-based initiative', async () => {
    const command = new InitiativeCommand(
      {
        entities: ['test-character'],
        initiativeType: 'individual',
        weapons: { 'test-character': 'longsword' },
      },
      'test-character'
    );

    const result = await command.execute(context);

    expect(result.success).toBe(true);

    const initiativeContext = context.getTemporary('initiative-context') as InitiativeContext;
    expect(initiativeContext.weapons).toEqual({ 'test-character': 'longsword' });
  });

  test('should handle spell casting initiative', async () => {
    const command = new InitiativeCommand(
      {
        entities: ['test-character'],
        initiativeType: 'individual',
        spells: { 'test-character': 'Magic Missile' },
      },
      'test-character'
    );

    const result = await command.execute(context);

    expect(result.success).toBe(true);

    const initiativeContext = context.getTemporary('initiative-context') as InitiativeContext;
    expect(initiativeContext.spells).toEqual({ 'test-character': 'Magic Missile' });
  });

  test('should get required rules for initiative processing', () => {
    const command = new InitiativeCommand(
      {
        entities: ['test-character'],
        initiativeType: 'individual',
      },
      'test-character'
    );

    const requiredRules = command.getRequiredRules();
    expect(requiredRules).toContain('initiative-roll');
    expect(requiredRules).toContain('surprise-check');
    expect(requiredRules).toContain('initiative-order');
  });

  test('should provide descriptive initiative descriptions', () => {
    const individualCommand = new InitiativeCommand(
      {
        entities: ['test-character'],
        initiativeType: 'individual',
      },
      'test-character'
    );

    expect(individualCommand.getDescription()).toBe('Initiative roll for 1 entities (individual)');

    const groupCommand = new InitiativeCommand(
      {
        entities: ['test-character'],
        initiativeType: 'group',
      },
      'test-character'
    );

    expect(groupCommand.getDescription()).toBe('Initiative roll for 1 entities (group)');

    const multipleEntitiesCommand = new InitiativeCommand(
      {
        entities: ['test-character', 'test-orc'],
        initiativeType: 'individual',
      },
      'test-character'
    );

    expect(multipleEntitiesCommand.getDescription()).toBe(
      'Initiative roll for 2 entities (individual)'
    );
  });

  test('should handle monster initiative', async () => {
    const command = new InitiativeCommand(
      {
        entities: ['test-orc'],
        initiativeType: 'individual',
      },
      'test-orc'
    );

    const result = await command.execute(context);

    expect(result.success).toBe(true);

    const initiativeContext = context.getTemporary('initiative-context') as InitiativeContext;
    expect(initiativeContext.entities).toEqual(['test-orc']);
  });

  test('should handle multiple entities initiative', async () => {
    const command = new InitiativeCommand(
      {
        entities: ['test-character', 'test-orc'],
        initiativeType: 'individual',
      },
      'test-character'
    );

    const result = await command.execute(context);

    expect(result.success).toBe(true);

    const initiativeContext = context.getTemporary('initiative-context') as InitiativeContext;
    expect(initiativeContext.entities).toEqual(['test-character', 'test-orc']);
  });
});
