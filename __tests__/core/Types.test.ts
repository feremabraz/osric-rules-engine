import type {
  AttackRoll,
  Character,
  Damage,
  GameTime,
  Item,
  Movement,
  Position,
  SavingThrowType,
  Spell,
  StatusEffect,
} from '@osric/core/Types';
import { describe, expect, it } from 'vitest';

describe('Types', () => {
  describe('Character Interface', () => {
    it('should define complete character structure', () => {
      const character: Character = {
        id: 'char-001',
        name: 'Thorin Oakenshield',
        class: 'fighter',
        level: 5,
        abilities: {
          strength: 16,
          intelligence: 12,
          wisdom: 14,
          dexterity: 13,
          constitution: 15,
          charisma: 10,
        },
        hitPoints: {
          current: 35,
          maximum: 42,
        },
        armorClass: 2,
        experience: 8000,
        savingThrows: {
          paralysis: 14,
          rod: 16,
          petrification: 15,
          breath: 17,
          spell: 17,
        },
      };

      expect(character.id).toBe('char-001');
      expect(character.name).toBe('Thorin Oakenshield');
      expect(character.class).toBe('fighter');
      expect(character.level).toBe(5);
      expect(character.abilities.strength).toBe(16);
      expect(character.hitPoints.current).toBe(35);
      expect(character.armorClass).toBe(2);
    });

    it('should support optional inventory and status effects', () => {
      const character: Character = {
        id: 'char-002',
        name: 'Gandalf',
        class: 'wizard',
        level: 12,
        abilities: {
          strength: 11,
          intelligence: 18,
          wisdom: 16,
          dexterity: 14,
          constitution: 13,
          charisma: 15,
        },
        hitPoints: {
          current: 28,
          maximum: 30,
        },
        armorClass: 8,
        experience: 125000,
        savingThrows: {
          paralysis: 11,
          rod: 7,
          petrification: 10,
          breath: 13,
          spell: 8,
        },
        inventory: [
          {
            id: 'staff-001',
            name: 'Staff of Power',
            itemType: 'staff',
            weight: 5,
            value: 50000,
            charges: 50,
            magicBonus: 2,
          },
        ],
        statusEffects: [
          {
            name: 'Blessed',
            duration: 10,
            description: '+1 to attack and saving throws',
          },
        ],
      };

      expect(character.inventory).toBeDefined();
      expect(character.inventory?.length).toBe(1);
      expect(character.statusEffects).toBeDefined();
      expect(character.statusEffects?.length).toBe(1);
    });

    it('should handle all ability score ranges', () => {
      const character: Character = {
        id: 'test-char',
        name: 'Test Character',
        class: 'thief',
        level: 1,
        abilities: {
          strength: 3,
          intelligence: 18,
          wisdom: 9,
          dexterity: 18,
          constitution: 8,
          charisma: 12,
        },
        hitPoints: { current: 4, maximum: 4 },
        armorClass: 7,
        experience: 0,
        savingThrows: {
          paralysis: 13,
          rod: 14,
          petrification: 12,
          breath: 16,
          spell: 15,
        },
      };

      expect(character.abilities.strength).toBeGreaterThanOrEqual(3);
      expect(character.abilities.intelligence).toBeLessThanOrEqual(18);
      expect(character.abilities.dexterity).toBe(18);
    });
  });

  describe('Item Interface', () => {
    it('should define basic item structure', () => {
      const item: Item = {
        id: 'sword-001',
        name: 'Longsword',
        itemType: 'weapon',
        weight: 4,
        value: 15,
        description: 'A standard longsword, well-balanced and sharp',
      };

      expect(item.id).toBe('sword-001');
      expect(item.name).toBe('Longsword');
      expect(item.itemType).toBe('weapon');
      expect(item.weight).toBe(4);
      expect(item.value).toBe(15);
    });

    it('should support magical item properties', () => {
      const magicalItem: Item = {
        id: 'sword-flame',
        name: 'Flame Tongue',
        itemType: 'weapon',
        weight: 4,
        value: 10000,
        description: 'A magical sword that bursts into flames on command',
        charges: null,
        magicBonus: 1,
        commandWord: 'ignis',
        cursed: false,
      };

      expect(magicalItem.charges).toBeNull();
      expect(magicalItem.magicBonus).toBe(1);
      expect(magicalItem.commandWord).toBe('ignis');
      expect(magicalItem.cursed).toBe(false);
    });

    it('should handle cursed items', () => {
      const cursedItem: Item = {
        id: 'ring-curse',
        name: 'Ring of Weakness',
        itemType: 'ring',
        weight: 0,
        value: 1000,
        description: 'A ring that appears valuable but carries a curse',
        cursed: true,
        magicBonus: -2,
      };

      expect(cursedItem.cursed).toBe(true);
      expect(cursedItem.magicBonus).toBe(-2);
    });

    it('should handle charged items', () => {
      const wandItem: Item = {
        id: 'wand-magic',
        name: 'Wand of Magic Missiles',
        itemType: 'wand',
        weight: 1,
        value: 35000,
        charges: 50,
        magicBonus: 0,
      };

      expect(wandItem.charges).toBe(50);
      expect(wandItem.charges).toBeGreaterThan(0);
    });
  });

  describe('Spell Interface', () => {
    it('should define complete spell structure', () => {
      const spell: Spell = {
        name: 'Magic Missile',
        level: 1,
        school: 'evocation',
        castingTime: '1 segment',
        range: '60 yards + 10 yards/level',
        duration: 'Instantaneous',
        description: 'Creates missiles of magical energy that automatically hit their target',
        components: ['verbal', 'somatic'],
      };

      expect(spell.name).toBe('Magic Missile');
      expect(spell.level).toBe(1);
      expect(spell.school).toBe('evocation');
      expect(spell.components).toContain('verbal');
      expect(spell.components).toContain('somatic');
    });

    it('should handle different spell levels', () => {
      const cantrip: Spell = {
        name: 'Light',
        level: 0,
        school: 'alteration',
        castingTime: '1 segment',
        range: '120 yards',
        duration: '6 turns + 1 turn/level',
        description: 'Creates a light source',
        components: ['verbal', 'material'],
      };

      const highLevelSpell: Spell = {
        name: 'Wish',
        level: 9,
        school: 'conjuration/summoning',
        castingTime: 'Special',
        range: 'Unlimited',
        duration: 'Special',
        description: 'Alters reality in some limited way',
        components: ['verbal'],
      };

      expect(cantrip.level).toBe(0);
      expect(highLevelSpell.level).toBe(9);
      expect(highLevelSpell.components.length).toBe(1);
    });

    it('should handle all spell components', () => {
      const complexSpell: Spell = {
        name: 'Teleport',
        level: 5,
        school: 'alteration',
        castingTime: '2 segments',
        range: 'Touch',
        duration: 'Instantaneous',
        description: 'Instantly transports the caster to a known location',
        components: ['verbal', 'somatic', 'material'],
      };

      expect(complexSpell.components).toHaveLength(3);
      expect(complexSpell.components).toContain('verbal');
      expect(complexSpell.components).toContain('somatic');
      expect(complexSpell.components).toContain('material');
    });
  });

  describe('SavingThrowType', () => {
    it('should define all OSRIC saving throw types', () => {
      const types: SavingThrowType[] = ['paralysis', 'rod', 'petrification', 'breath', 'spell'];

      expect(types).toContain('paralysis');
      expect(types).toContain('rod');
      expect(types).toContain('petrification');
      expect(types).toContain('breath');
      expect(types).toContain('spell');
      expect(types.length).toBe(5);
    });

    it('should work with character saving throws', () => {
      const character: Character = {
        id: 'test',
        name: 'Test',
        class: 'cleric',
        level: 3,
        abilities: {
          strength: 12,
          intelligence: 14,
          wisdom: 16,
          dexterity: 11,
          constitution: 13,
          charisma: 15,
        },
        hitPoints: { current: 18, maximum: 18 },
        armorClass: 4,
        experience: 3000,
        savingThrows: {
          paralysis: 10,
          rod: 14,
          petrification: 13,
          breath: 16,
          spell: 15,
        },
      };

      const savingThrowType: SavingThrowType = 'spell';
      const requiredRoll = character.savingThrows[savingThrowType];
      expect(requiredRoll).toBe(15);
    });
  });

  describe('StatusEffect Interface', () => {
    it('should define status effect structure', () => {
      const effect: StatusEffect = {
        name: 'Poisoned',
        duration: 5,
        description: 'Character takes 1d4 damage per round',
      };

      expect(effect.name).toBe('Poisoned');
      expect(effect.duration).toBe(5);
      expect(effect.description).toContain('damage');
    });

    it('should handle different duration types', () => {
      const permanentEffect: StatusEffect = {
        name: 'Cursed',
        duration: -1,
        description: 'Character is cursed until remove curse is cast',
      };

      const temporaryEffect: StatusEffect = {
        name: 'Haste',
        duration: 3,
        description: 'Character moves and attacks at double speed',
      };

      expect(permanentEffect.duration).toBe(-1);
      expect(temporaryEffect.duration).toBeGreaterThan(0);
    });
  });

  describe('AttackRoll Interface', () => {
    it('should define attack roll structure', () => {
      const attack: AttackRoll = {
        roll: 15,
        modifier: 2,
        total: 17,
        hit: true,
      };

      expect(attack.roll).toBe(15);
      expect(attack.modifier).toBe(2);
      expect(attack.total).toBe(17);
      expect(attack.hit).toBe(true);
    });

    it('should handle missed attacks', () => {
      const missedAttack: AttackRoll = {
        roll: 3,
        modifier: 1,
        total: 4,
        hit: false,
      };

      expect(missedAttack.total).toBe(4);
      expect(missedAttack.hit).toBe(false);
    });

    it('should handle critical hits and fumbles', () => {
      const criticalHit: AttackRoll = {
        roll: 20,
        modifier: 3,
        total: 23,
        hit: true,
      };

      const fumble: AttackRoll = {
        roll: 1,
        modifier: 0,
        total: 1,
        hit: false,
      };

      expect(criticalHit.roll).toBe(20);
      expect(fumble.roll).toBe(1);
    });
  });

  describe('Damage Interface', () => {
    it('should define damage structure', () => {
      const damage: Damage = {
        amount: 8,
        type: 'slashing',
      };

      expect(damage.amount).toBe(8);
      expect(damage.type).toBe('slashing');
    });

    it('should handle different damage types', () => {
      const damages: Damage[] = [
        { amount: 6, type: 'piercing' },
        { amount: 4, type: 'bludgeoning' },
        { amount: 10, type: 'fire' },
        { amount: 5, type: 'cold' },
        { amount: 3, type: 'acid' },
      ];

      expect(damages[0].type).toBe('piercing');
      expect(damages[2].type).toBe('fire');
      expect(damages[4].amount).toBe(3);
    });

    it('should handle zero damage', () => {
      const noDamage: Damage = {
        amount: 0,
        type: 'none',
      };

      expect(noDamage.amount).toBe(0);
      expect(noDamage.type).toBe('none');
    });
  });

  describe('GameTime Interface', () => {
    it('should define game time structure', () => {
      const time: GameTime = {
        rounds: 5,
        turns: 2,
        hours: 14,
        days: 3,
      };

      expect(time.rounds).toBe(5);
      expect(time.turns).toBe(2);
      expect(time.hours).toBe(14);
      expect(time.days).toBe(3);
    });

    it('should handle time progression', () => {
      const startTime: GameTime = {
        rounds: 0,
        turns: 0,
        hours: 8,
        days: 1,
      };

      const laterTime: GameTime = {
        rounds: 10,
        turns: 3,
        hours: 12,
        days: 1,
      };

      expect(laterTime.rounds).toBeGreaterThan(startTime.rounds);
      expect(laterTime.turns).toBeGreaterThan(startTime.turns);
      expect(laterTime.hours).toBeGreaterThan(startTime.hours);
    });

    it('should handle OSRIC time units correctly', () => {
      const time: GameTime = {
        rounds: 60,
        turns: 6,
        hours: 1,
        days: 0,
      };

      expect(time.rounds).toBe(60);
      expect(time.turns).toBe(6);
      expect(time.hours).toBe(1);
    });
  });

  describe('Position Interface', () => {
    it('should define 2D position structure', () => {
      const position: Position = {
        x: 10,
        y: 20,
      };

      expect(position.x).toBe(10);
      expect(position.y).toBe(20);
      expect(position.z).toBeUndefined();
    });

    it('should define 3D position structure', () => {
      const position3D: Position = {
        x: 5,
        y: 15,
        z: 25,
      };

      expect(position3D.x).toBe(5);
      expect(position3D.y).toBe(15);
      expect(position3D.z).toBe(25);
    });

    it('should handle negative coordinates', () => {
      const position: Position = {
        x: -10,
        y: -5,
        z: 0,
      };

      expect(position.x).toBe(-10);
      expect(position.y).toBe(-5);
      expect(position.z).toBe(0);
    });
  });

  describe('Movement Interface', () => {
    it('should define movement structure', () => {
      const movement: Movement = {
        base: 120,
        current: 90,
        encumbered: true,
      };

      expect(movement.base).toBe(120);
      expect(movement.current).toBe(90);
      expect(movement.encumbered).toBe(true);
    });

    it('should handle unencumbered movement', () => {
      const movement: Movement = {
        base: 120,
        current: 120,
        encumbered: false,
      };

      expect(movement.current).toBe(movement.base);
      expect(movement.encumbered).toBe(false);
    });

    it('should handle movement penalties', () => {
      const heavilyEncumbered: Movement = {
        base: 120,
        current: 30,
        encumbered: true,
      };

      expect(heavilyEncumbered.current).toBeLessThan(heavilyEncumbered.base);
      expect(heavilyEncumbered.current / heavilyEncumbered.base).toBe(0.25);
    });
  });

  describe('OSRIC Compliance', () => {
    it('should implement authentic OSRIC/AD&D 1st Edition character mechanics', () => {
      const fighter: Character = {
        id: 'fighter-001',
        name: 'Sir Lancelot',
        class: 'fighter',
        level: 1,
        abilities: {
          strength: 16,
          intelligence: 11,
          wisdom: 12,
          dexterity: 14,
          constitution: 15,
          charisma: 13,
        },
        hitPoints: {
          current: 9,
          maximum: 9,
        },
        armorClass: 2,
        experience: 0,
        savingThrows: {
          paralysis: 14,
          rod: 16,
          petrification: 15,
          breath: 17,
          spell: 17,
        },
      };

      expect(fighter.abilities.strength).toBeGreaterThanOrEqual(9);
      expect(fighter.class).toBe('fighter');
      expect(fighter.level).toBe(1);
      expect(fighter.armorClass).toBeLessThanOrEqual(10);
    });

    it('should support OSRIC spell mechanics', () => {
      const arcaneSpell: Spell = {
        name: 'Fireball',
        level: 3,
        school: 'evocation',
        castingTime: '3 segments',
        range: '10 yards + 10 yards/level',
        duration: 'Instantaneous',
        description: 'Creates a fiery explosion dealing 1d6 damage per caster level',
        components: ['verbal', 'somatic', 'material'],
      };

      const divineSpell: Spell = {
        name: 'Cure Light Wounds',
        level: 1,
        school: 'necromancy',
        castingTime: '5 segments',
        range: 'Touch',
        duration: 'Permanent',
        description: 'Heals 1d4+1 points of damage',
        components: ['verbal', 'somatic'],
      };

      expect(arcaneSpell.level).toBe(3);
      expect(arcaneSpell.school).toBe('evocation');
      expect(divineSpell.level).toBe(1);
      expect(divineSpell.school).toBe('necromancy');
    });

    it('should handle OSRIC item mechanics', () => {
      const magicSword: Item = {
        id: 'sword-plus1',
        name: '+1 Longsword',
        itemType: 'weapon',
        weight: 4,
        value: 1000,
        description: 'A longsword with a +1 enchantment',
        magicBonus: 1,
        cursed: false,
      };

      const scrollItem: Item = {
        id: 'scroll-fireball',
        name: 'Scroll of Fireball',
        itemType: 'scroll',
        weight: 0,
        value: 450,
        charges: 1,
        description: 'A scroll containing the fireball spell',
      };

      expect(magicSword.magicBonus).toBe(1);
      expect(scrollItem.charges).toBe(1);
      expect(magicSword.weight).toBe(4);
    });
  });

  describe('Type Integration', () => {
    it('should work together in complete character scenarios', () => {
      const character: Character = {
        id: 'complete-char',
        name: 'Elminster',
        class: 'wizard',
        level: 20,
        abilities: {
          strength: 10,
          intelligence: 18,
          wisdom: 16,
          dexterity: 14,
          constitution: 12,
          charisma: 15,
        },
        hitPoints: {
          current: 45,
          maximum: 50,
        },
        armorClass: 6,
        experience: 500000,
        savingThrows: {
          paralysis: 8,
          rod: 3,
          petrification: 7,
          breath: 10,
          spell: 4,
        },
        inventory: [
          {
            id: 'staff-archmage',
            name: 'Staff of the Archmagi',
            itemType: 'staff',
            weight: 5,
            value: 100000,
            charges: 200,
            magicBonus: 2,
            commandWord: 'arcanum',
          },
        ],
        statusEffects: [
          {
            name: 'Protected from Evil',
            duration: 12,
            description: '+2 to saves vs evil creatures',
          },
        ],
      };

      const spell: Spell = {
        name: 'Time Stop',
        level: 9,
        school: 'alteration',
        castingTime: '9 segments',
        range: '0',
        duration: '1d4+1 segments',
        description: 'Stops time for everyone except the caster',
        components: ['verbal'],
      };

      expect(character.level).toBe(20);
      expect(character.inventory?.length).toBe(1);
      expect(character.statusEffects?.length).toBe(1);
      expect(spell.level).toBe(9);
    });
  });
});
