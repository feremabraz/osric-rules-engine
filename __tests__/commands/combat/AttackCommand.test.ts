import { createStore } from 'jotai';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { AttackCommand } from '../../../osric/commands/combat/AttackCommand';
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

interface AttackContext {
  attacker: Character | Monster;
  target: Character | Monster;
  weapon?: Weapon;
  attackType?: string;
  situationalModifiers?: number;
  isChargedAttack?: boolean;
}

describe('AttackCommand', () => {
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

  test('should create attack command with valid parameters', () => {
    const command = new AttackCommand(
      {
        attackerId: 'test-character',
        targetId: 'test-orc',
        weaponId: 'longsword',
      },
      'test-character'
    );

    expect(command.type).toBe('attack');
    expect(command.getDescription()).toContain('test-character attacks test-orc');
  });

  test('should validate attack command can execute', () => {
    const command = new AttackCommand(
      {
        attackerId: 'test-character',
        targetId: 'test-orc',
        weaponId: 'longsword',
      },
      'test-character'
    );

    expect(command.canExecute(context)).toBe(true);
  });

  test('should fail validation if attacker does not exist', () => {
    const command = new AttackCommand(
      {
        attackerId: 'nonexistent',
        targetId: 'test-orc',
      },
      'nonexistent'
    );

    expect(command.canExecute(context)).toBe(false);
  });

  test('should fail validation if target does not exist', () => {
    const command = new AttackCommand(
      {
        attackerId: 'test-character',
        targetId: 'nonexistent',
      },
      'test-character'
    );

    expect(command.canExecute(context)).toBe(false);
  });

  test('should fail validation if attacker is unconscious', () => {
    testCharacter.hitPoints.current = 0;
    context.setEntity('test-character', testCharacter);

    const command = new AttackCommand(
      {
        attackerId: 'test-character',
        targetId: 'test-orc',
      },
      'test-character'
    );

    expect(command.canExecute(context)).toBe(false);
  });

  test('should fail validation if attacker is paralyzed', () => {
    testCharacter.statusEffects.push({
      name: 'Paralyzed',
      duration: 5,
      effect: 'Cannot move or act',
      savingThrow: null,
      endCondition: 'Duration expires',
    });
    context.setEntity('test-character', testCharacter);

    const command = new AttackCommand(
      {
        attackerId: 'test-character',
        targetId: 'test-orc',
      },
      'test-character'
    );

    expect(command.canExecute(context)).toBe(false);
  });

  test('should execute attack command and set context', async () => {
    const command = new AttackCommand(
      {
        attackerId: 'test-character',
        targetId: 'test-orc',
        weaponId: 'longsword',
        situationalModifiers: 2,
      },
      'test-character'
    );

    const result = await command.execute(context);

    expect(result.success).toBe(true);
    expect(result.message).toContain('Attack command prepared for rule processing');

    const attackContext = context.getTemporary('attack-context') as AttackContext;
    expect(attackContext).toBeDefined();
    expect(attackContext.attacker.id).toBe('test-character');
    expect(attackContext.target.id).toBe('test-orc');
    expect(attackContext.weapon?.id).toBe('longsword');
    expect(attackContext.situationalModifiers).toBe(2);
  });

  test('should get required rules for attack processing', () => {
    const command = new AttackCommand(
      {
        attackerId: 'test-character',
        targetId: 'test-orc',
      },
      'test-character'
    );

    const requiredRules = command.getRequiredRules();
    expect(requiredRules).toContain('attack-roll');
    expect(requiredRules).toContain('damage-calculation');
    expect(requiredRules).toContain('combat-effects');
    expect(requiredRules).toContain('combat-result');
  });

  test('should handle unarmed attack (no weapon)', async () => {
    const command = new AttackCommand(
      {
        attackerId: 'test-character',
        targetId: 'test-orc',
      },
      'test-character'
    );

    const result = await command.execute(context);

    expect(result.success).toBe(true);

    const attackContext = context.getTemporary('attack-context') as AttackContext;
    expect(attackContext.weapon).toBeUndefined();
  });

  test('should handle charged attack parameter', async () => {
    const command = new AttackCommand(
      {
        attackerId: 'test-character',
        targetId: 'test-orc',
        weaponId: 'longsword',
        isChargedAttack: true,
      },
      'test-character'
    );

    const result = await command.execute(context);

    expect(result.success).toBe(true);

    const attackContext = context.getTemporary('attack-context') as AttackContext;
    expect(attackContext.isChargedAttack).toBe(true);
  });

  test('should handle subdual attack type', async () => {
    const command = new AttackCommand(
      {
        attackerId: 'test-character',
        targetId: 'test-orc',
        attackType: 'subdual',
      },
      'test-character'
    );

    const result = await command.execute(context);

    expect(result.success).toBe(true);

    const attackContext = context.getTemporary('attack-context') as AttackContext;
    expect(attackContext.attackType).toBe('subdual');
  });

  test('should provide descriptive attack descriptions', () => {
    const weaponCommand = new AttackCommand(
      {
        attackerId: 'test-character',
        targetId: 'test-orc',
        weaponId: 'longsword',
        situationalModifiers: 2,
      },
      'test-character'
    );

    expect(weaponCommand.getDescription()).toBe(
      'test-character attacks test-orc with weapon longsword (+2)'
    );

    const unarmedCommand = new AttackCommand(
      {
        attackerId: 'test-character',
        targetId: 'test-orc',
      },
      'test-character'
    );

    expect(unarmedCommand.getDescription()).toBe('test-character attacks test-orc unarmed');

    const negativeModifierCommand = new AttackCommand(
      {
        attackerId: 'test-character',
        targetId: 'test-orc',
        situationalModifiers: -1,
      },
      'test-character'
    );

    expect(negativeModifierCommand.getDescription()).toBe(
      'test-character attacks test-orc unarmed (-1)'
    );
  });
});
