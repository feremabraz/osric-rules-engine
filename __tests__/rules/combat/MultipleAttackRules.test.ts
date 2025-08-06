import type { Command } from '@osric/core/Command';
import { GameContext } from '@osric/core/GameContext';
import { AttackPrecedenceRule, MultipleAttackRule } from '@osric/rules/combat/MultipleAttackRules';
import { COMMAND_TYPES } from '@osric/types/constants';
import type { Alignment, Character, CharacterClass, Monster, Weapon } from '@osric/types/entities';
import { createStore } from 'jotai';
import { beforeEach, describe, expect, it } from 'vitest';

const createMockCharacter = (level: number, characterClass: CharacterClass): Character => ({
  id: 'test-char',
  name: 'Test Character',
  race: 'Human',
  class: characterClass,
  classes: { [characterClass]: level },
  primaryClass: characterClass,
  level,
  experience: { current: level * 1000, requiredForNextLevel: (level + 1) * 1000, level },
  hitPoints: { current: 20, maximum: 20 },
  abilities: {
    strength: 15,
    dexterity: 14,
    constitution: 13,
    intelligence: 12,
    wisdom: 11,
    charisma: 10,
  },
  abilityModifiers: {
    strengthHitAdj: 0,
    strengthDamageAdj: 0,
    strengthEncumbrance: 170,
    strengthOpenDoors: 7,
    strengthBendBars: 7,
    dexterityReaction: 0,
    dexterityMissile: 0,
    dexterityDefense: 0,
    dexterityPickPockets: 0,
    dexterityOpenLocks: 0,
    dexterityFindTraps: 0,
    dexterityMoveSilently: 0,
    dexterityHideInShadows: 0,
    constitutionHitPoints: 0,
    constitutionSystemShock: 88,
    constitutionResurrectionSurvival: 92,
    constitutionPoisonSave: 0,
    intelligenceLanguages: 3,
    intelligenceLearnSpells: 45,
    intelligenceMaxSpellLevel: 4,
    intelligenceIllusionImmunity: false,
    wisdomMentalSave: 0,
    wisdomBonusSpells: null,
    wisdomSpellFailure: 0,
    charismaReactionAdj: 0,
    charismaLoyaltyBase: 0,
    charismaMaxHenchmen: 2,
  },
  savingThrows: {
    'Poison or Death': 10,
    Wands: 11,
    'Paralysis, Polymorph, or Petrification': 12,
    'Breath Weapons': 13,
    'Spells, Rods, or Staves': 14,
  },
  armorClass: 10,
  spells: [],
  currency: { platinum: 0, gold: 0, electrum: 0, silver: 0, copper: 0 },
  encumbrance: 0,
  movementRate: 120,
  spellSlots: {},
  memorizedSpells: {},
  spellbook: [],
  thiefSkills: {
    pickPockets: 15,
    openLocks: 10,
    findTraps: 10,
    removeTraps: 10,
    moveSilently: 10,
    hideInShadows: 5,
    hearNoise: 10,
    climbWalls: 85,
    readLanguages: 0,
  },
  turnUndead: null,
  languages: ['Common'],
  age: 25,
  ageCategory: 'Adult',
  henchmen: [],
  racialAbilities: [],
  classAbilities: [],
  proficiencies: [],
  secondarySkills: [],
  weaponSpecializations: [],
  thac0: 20 - level,
  alignment: 'Lawful Good',
  inventory: [],
  position: '0,0,0',
  statusEffects: [],
});

const createMockMonster = (hitDice: string): Monster => ({
  id: 'test-monster',
  name: 'Test Monster',
  level: 1,
  hitDice,
  hitPoints: { current: 10, maximum: 10 },
  armorClass: 5,
  thac0: 20,
  experience: { current: 0, requiredForNextLevel: 0, level: 1 },
  alignment: 'True Neutral',
  inventory: [],
  position: '5,5,0',
  statusEffects: [],
  movementTypes: [{ type: 'Walk', rate: 120 }],
  damagePerAttack: ['1d6'],
  morale: 8,
  treasure: 'None',
  specialAbilities: [],
  xpValue: 10,
  size: 'Medium',
  habitat: ['Any'],
  frequency: 'Common',
  organization: 'Solitary',
  diet: 'Omnivore',
  ecology: 'Standard',
});

const createMockWeapon = (name: string): Weapon => ({
  id: 'test-weapon',
  name,
  type: 'Melee',
  damage: '1d8',
  weight: 3,
  description: 'A test weapon',
  value: 15,
  equipped: false,
  magicBonus: null,
  charges: null,
  size: 'Medium',
  speed: 7,
  allowedClasses: ['Fighter', 'Paladin', 'Ranger'],
  damageVsLarge: null,
  range: null,
  twoHanded: false,
});

const createMockAttackCommand = (): Command => ({
  type: COMMAND_TYPES.ATTACK,
  execute: async () => ({ success: true, message: 'Mock attack executed' }),
  canExecute: () => true,
  getRequiredRules: () => ['attack-rules'],
  getInvolvedEntities: () => ['test-char', 'test-monster'],
});

describe('MultipleAttackRule', () => {
  let rule: MultipleAttackRule;
  let context: GameContext;
  let command: Command;

  beforeEach(() => {
    rule = new MultipleAttackRule();
    context = new GameContext(createStore());
    command = createMockAttackCommand();
  });

  describe('canApply', () => {
    it('should return false for non-attack commands', () => {
      const nonAttackCommand = { ...command, type: 'move' as typeof command.type };
      expect(rule.canApply(context, nonAttackCommand)).toBe(false);
    });

    it('should return false when no attack context is available', () => {
      expect(rule.canApply(context, command)).toBe(false);
    });

    it('should return true for fighters with multiple attacks', () => {
      const fighter = createMockCharacter(13, 'Fighter');
      const monster = createMockMonster('1');

      context.setTemporary('attack-context', {
        attacker: fighter,
        target: monster,
        weapon: createMockWeapon('longsword'),
      });

      expect(rule.canApply(context, command)).toBe(true);
    });

    it('should return false for single attack characters', () => {
      const fighter = createMockCharacter(3, 'Fighter');
      const monster = createMockMonster('1');

      context.setTemporary('attack-context', {
        attacker: fighter,
        target: monster,
        weapon: createMockWeapon('longsword'),
      });

      expect(rule.canApply(context, command)).toBe(false);
    });

    it('should return true when multipleAttacks is explicitly set', () => {
      const mage = createMockCharacter(5, 'Magic-User');
      const monster = createMockMonster('1');

      context.setTemporary('attack-context', {
        attacker: mage,
        target: monster,
        weapon: createMockWeapon('dagger'),
        multipleAttacks: true,
      });

      expect(rule.canApply(context, command)).toBe(true);
    });
  });

  describe('Fighter Multiple Attacks by Level', () => {
    it('should give 1 attack to low-level fighters (levels 1-6)', () => {
      const fighter = createMockCharacter(5, 'Fighter');
      const monster = createMockMonster('2');

      context.setTemporary('attack-context', {
        attacker: fighter,
        target: monster,
        weapon: createMockWeapon('longsword'),
      });

      expect(rule.canApply(context, command)).toBe(false);
    });

    it('should give 1.5 attacks to mid-level fighters (levels 7-12)', async () => {
      const fighter = createMockCharacter(8, 'Fighter');
      const monster = createMockMonster('2');

      context.setTemporary('attack-context', {
        attacker: fighter,
        target: monster,
        weapon: createMockWeapon('longsword'),
      });

      expect(rule.canApply(context, command)).toBe(true);

      const result = await rule.execute(context, command);
      expect(result.success).toBe(true);

      const attacksThisRound = context.getTemporary('attacks-this-round');
      expect(attacksThisRound).toBeGreaterThanOrEqual(1);
    });

    it('should give 2 attacks to high-level fighters (levels 13+)', async () => {
      const fighter = createMockCharacter(15, 'Fighter');
      const monster = createMockMonster('2');

      context.setTemporary('attack-context', {
        attacker: fighter,
        target: monster,
        weapon: createMockWeapon('longsword'),
      });

      expect(rule.canApply(context, command)).toBe(true);

      const result = await rule.execute(context, command);
      expect(result.success).toBe(true);
      expect(context.getTemporary('attacks-this-round')).toBe(2);
    });

    it('should apply to Paladins as fighter subclass', async () => {
      const paladin = createMockCharacter(13, 'Paladin');
      const monster = createMockMonster('2');

      context.setTemporary('attack-context', {
        attacker: paladin,
        target: monster,
        weapon: createMockWeapon('longsword'),
      });

      expect(rule.canApply(context, command)).toBe(true);

      const result = await rule.execute(context, command);
      expect(result.success).toBe(true);
      expect(context.getTemporary('attacks-this-round')).toBe(2);
    });

    it('should apply to Rangers as fighter subclass', async () => {
      const ranger = createMockCharacter(13, 'Ranger');
      const monster = createMockMonster('2');

      context.setTemporary('attack-context', {
        attacker: ranger,
        target: monster,
        weapon: createMockWeapon('longsword'),
      });

      expect(rule.canApply(context, command)).toBe(true);

      const result = await rule.execute(context, command);
      expect(result.success).toBe(true);
      expect(context.getTemporary('attacks-this-round')).toBe(2);
    });

    it('should not give multiple attacks to non-fighter classes', () => {
      const mage = createMockCharacter(15, 'Magic-User');
      const monster = createMockMonster('2');

      context.setTemporary('attack-context', {
        attacker: mage,
        target: monster,
        weapon: createMockWeapon('dagger'),
      });

      expect(rule.canApply(context, command)).toBe(false);
    });
  });

  describe('Attacks vs Creatures with Less Than 1 HD', () => {
    it('should give fighters attacks equal to their level vs < 1 HD creatures', async () => {
      const fighter = createMockCharacter(7, 'Fighter');
      const weakMonster = createMockMonster('0.5');

      context.setTemporary('attack-context', {
        attacker: fighter,
        target: weakMonster,
        weapon: createMockWeapon('longsword'),
      });

      expect(rule.canApply(context, command)).toBe(true);

      const result = await rule.execute(context, command);
      expect(result.success).toBe(true);
      expect(context.getTemporary('attacks-this-round')).toBe(7);
    });

    it('should work with 0.25 HD creatures', async () => {
      const fighter = createMockCharacter(5, 'Fighter');
      const veryWeakMonster = createMockMonster('0.25');

      context.setTemporary('attack-context', {
        attacker: fighter,
        target: veryWeakMonster,
        weapon: createMockWeapon('longsword'),
      });

      expect(rule.canApply(context, command)).toBe(true);

      const result = await rule.execute(context, command);
      expect(result.success).toBe(true);
      expect(context.getTemporary('attacks-this-round')).toBe(5);
    });

    it('should not apply special rule vs 1+ HD creatures', () => {
      const fighter = createMockCharacter(7, 'Fighter');
      const normalMonster = createMockMonster('1');

      context.setTemporary('attack-context', {
        attacker: fighter,
        target: normalMonster,
        weapon: createMockWeapon('longsword'),
      });

      expect(rule.canApply(context, command)).toBe(true);
    });
  });

  describe('Weapon Specialization Attack Bonuses', () => {
    it('should give specialized fighters improved attack rates', async () => {
      const fighter = createMockCharacter(7, 'Fighter');
      fighter.weaponSpecializations = [
        {
          weapon: 'longsword',
          bonuses: {
            attackRate: 1,
            hitBonus: 1,
            damageBonus: 2,
          },
        },
      ];

      const monster = createMockMonster('2');

      context.setTemporary('attack-context', {
        attacker: fighter,
        target: monster,
        weapon: createMockWeapon('longsword'),
      });

      expect(rule.canApply(context, command)).toBe(true);

      const result = await rule.execute(context, command);
      expect(result.success).toBe(true);
      expect(context.getTemporary('attacks-this-round')).toBe(2);
    });

    it('should handle double specialization bonuses', async () => {
      const fighter = createMockCharacter(7, 'Fighter');
      fighter.weaponSpecializations = [
        {
          weapon: 'longsword',
          bonuses: {
            attackRate: 2,
            hitBonus: 3,
            damageBonus: 4,
          },
        },
      ];

      const monster = createMockMonster('2');

      context.setTemporary('attack-context', {
        attacker: fighter,
        target: monster,
        weapon: createMockWeapon('longsword'),
      });

      expect(rule.canApply(context, command)).toBe(true);

      const result = await rule.execute(context, command);
      expect(result.success).toBe(true);

      const attacksThisRound = context.getTemporary('attacks-this-round');
      expect(attacksThisRound).toBeGreaterThanOrEqual(2);
    });

    it('should not apply specialization bonuses for non-specialized weapons', async () => {
      const fighter = createMockCharacter(7, 'Fighter');
      fighter.weaponSpecializations = [
        {
          weapon: 'sword',
          bonuses: {
            attackRate: 1,
            hitBonus: 1,
            damageBonus: 2,
          },
        },
      ];

      const monster = createMockMonster('2');

      context.setTemporary('attack-context', {
        attacker: fighter,
        target: monster,
        weapon: createMockWeapon('mace'),
      });

      expect(rule.canApply(context, command)).toBe(true);

      const result = await rule.execute(context, command);
      expect(result.success).toBe(true);

      expect(context.getTemporary('attacks-this-round')).toBeLessThan(2);
    });
  });

  describe('Monster Multiple Attacks', () => {
    it('should handle monsters with multiple damage entries', async () => {
      const multiAttackMonster = createMockMonster('3');
      multiAttackMonster.damagePerAttack = ['1d6', '1d6', '1d4'];

      const character = createMockCharacter(5, 'Fighter');

      context.setTemporary('attack-context', {
        attacker: multiAttackMonster,
        target: character,
      });

      expect(rule.canApply(context, command)).toBe(true);

      const result = await rule.execute(context, command);
      expect(result.success).toBe(true);
      expect(context.getTemporary('attacks-this-round')).toBe(3);
    });

    it('should default to 1 attack for monsters without damage arrays', async () => {
      const singleAttackMonster = createMockMonster('2');

      const character = createMockCharacter(5, 'Fighter');

      context.setTemporary('attack-context', {
        attacker: singleAttackMonster,
        target: character,
      });

      expect(rule.canApply(context, command)).toBe(false);
    });
  });

  describe('Fractional Attack Tracking', () => {
    it('should carry over fractional attacks between rounds', async () => {
      const fighter = createMockCharacter(7, 'Fighter');
      const monster = createMockMonster('2');

      context.setTemporary('attack-context', {
        attacker: fighter,
        target: monster,
        weapon: createMockWeapon('longsword'),
        roundState: {
          currentRound: 1,
          fractionalAttacksCarriedOver: 0.5,
        },
      });

      const result = await rule.execute(context, command);
      expect(result.success).toBe(true);

      expect(context.getTemporary('attacks-this-round')).toBe(2);

      const fractionalCarried = context.getTemporary('fractional-attacks-carried');
      expect(fractionalCarried === null || fractionalCarried === 0).toBe(true);
    });

    it('should accumulate fractional attacks correctly', async () => {
      const fighter = createMockCharacter(7, 'Fighter');
      const monster = createMockMonster('2');

      context.setTemporary('attack-context', {
        attacker: fighter,
        target: monster,
        weapon: createMockWeapon('longsword'),
        roundState: {
          currentRound: 1,
          fractionalAttacksCarriedOver: 0,
        },
      });

      const result = await rule.execute(context, command);
      expect(result.success).toBe(true);

      expect(context.getTemporary('attacks-this-round')).toBe(1);

      expect(context.getTemporary('fractional-attacks-carried')).toBe(0.5);
    });
  });

  describe('Error Handling', () => {
    it('should fail gracefully when no attack context is provided', async () => {
      const result = await rule.execute(context, command);
      expect(result.success).toBe(false);
      expect(result.message).toContain('No attack context found');
    });

    it('should handle missing weapon gracefully', async () => {
      const fighter = createMockCharacter(13, 'Fighter');
      const monster = createMockMonster('2');

      context.setTemporary('attack-context', {
        attacker: fighter,
        target: monster,
      });

      const result = await rule.execute(context, command);
      expect(result.success).toBe(true);
      expect(context.getTemporary('attacks-this-round')).toBe(2);
    });
  });
});

describe('AttackPrecedenceRule', () => {
  let rule: AttackPrecedenceRule;
  let context: GameContext;
  let command: Command;

  beforeEach(() => {
    rule = new AttackPrecedenceRule();
    context = new GameContext(createStore());
    command = createMockAttackCommand();
  });

  describe('canApply', () => {
    it('should return false for non-attack commands', () => {
      const nonAttackCommand = { ...command, type: 'move' as typeof command.type };
      expect(rule.canApply(context, nonAttackCommand)).toBe(false);
    });

    it('should return false when no attack context is available', () => {
      expect(rule.canApply(context, command)).toBe(false);
    });

    it('should return true when attack context is available', () => {
      const fighter = createMockCharacter(13, 'Fighter');
      const monster = createMockMonster('2');

      context.setTemporary('attack-context', {
        attacker: fighter,
        target: monster,
        weapon: createMockWeapon('longsword'),
      });

      expect(rule.canApply(context, command)).toBe(true);
    });
  });

  describe('Multiple Attack Precedence', () => {
    it('should give fighters with multiple attacks precedence (-1)', async () => {
      const fighter = createMockCharacter(13, 'Fighter');
      const monster = createMockMonster('2');

      context.setTemporary('attack-context', {
        attacker: fighter,
        target: monster,
        weapon: createMockWeapon('longsword'),
      });

      const result = await rule.execute(context, command);
      expect(result.success).toBe(true);
      expect(context.getTemporary('attack-precedence')).toBe(-1);
      expect(result.message).toContain('Fighter with multiple attacks goes first');
    });

    it('should give normal precedence (0) to single attack fighters', async () => {
      const fighter = createMockCharacter(5, 'Fighter');
      const monster = createMockMonster('2');

      context.setTemporary('attack-context', {
        attacker: fighter,
        target: monster,
        weapon: createMockWeapon('longsword'),
      });

      const result = await rule.execute(context, command);
      expect(result.success).toBe(true);

      const precedence = context.getTemporary('attack-precedence');
      expect(precedence === null || precedence === 0).toBe(true);
      expect(result.message).toContain('Normal initiative order applies');
    });

    it('should give normal precedence to non-fighters', async () => {
      const mage = createMockCharacter(15, 'Magic-User');
      const monster = createMockMonster('2');

      context.setTemporary('attack-context', {
        attacker: mage,
        target: monster,
        weapon: createMockWeapon('dagger'),
      });

      const result = await rule.execute(context, command);
      expect(result.success).toBe(true);

      const precedence = context.getTemporary('attack-precedence');
      expect(precedence === null || precedence === 0).toBe(true);
      expect(result.message).toContain('Normal initiative order applies');
    });

    it('should handle monsters with multiple attacks', async () => {
      const multiAttackMonster = createMockMonster('3');
      multiAttackMonster.damagePerAttack = ['1d6', '1d6'];

      const character = createMockCharacter(5, 'Fighter');

      context.setTemporary('attack-context', {
        attacker: multiAttackMonster,
        target: character,
      });

      const result = await rule.execute(context, command);
      expect(result.success).toBe(true);
      expect(context.getTemporary('attack-precedence')).toBe(-1);
    });
  });

  describe('Paladin and Ranger Precedence', () => {
    it('should give Paladins with multiple attacks precedence', async () => {
      const paladin = createMockCharacter(13, 'Paladin');
      const monster = createMockMonster('2');

      context.setTemporary('attack-context', {
        attacker: paladin,
        target: monster,
        weapon: createMockWeapon('longsword'),
      });

      const result = await rule.execute(context, command);
      expect(result.success).toBe(true);
      expect(context.getTemporary('attack-precedence')).toBe(-1);
    });

    it('should give Rangers with multiple attacks precedence', async () => {
      const ranger = createMockCharacter(13, 'Ranger');
      const monster = createMockMonster('2');

      context.setTemporary('attack-context', {
        attacker: ranger,
        target: monster,
        weapon: createMockWeapon('longsword'),
      });

      const result = await rule.execute(context, command);
      expect(result.success).toBe(true);
      expect(context.getTemporary('attack-precedence')).toBe(-1);
    });
  });

  describe('Error Handling', () => {
    it('should fail gracefully when no attack context is provided', async () => {
      const result = await rule.execute(context, command);
      expect(result.success).toBe(false);
      expect(result.message).toContain('No attack context found');
    });
  });
});
