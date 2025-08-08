import { GameContext } from '@osric/core/GameContext';
// File: __tests__/entities/Monster.test.ts
import { Monster, MonsterFactory } from '@osric/entities/Monster';
import type { Monster as BaseMonster, StatusEffect } from '@osric/types/entities';
import { createStore } from 'jotai';
import { beforeEach, describe, expect, it } from 'vitest';

describe('Monster', () => {
  let context: GameContext;

  beforeEach(() => {
    const store = createStore();
    context = new GameContext(store);
  });

  // Helper to create basic monster data
  function createBasicMonsterData(overrides: Partial<BaseMonster> = {}): BaseMonster {
    return {
      id: 'test-monster',
      name: 'Test Monster',
      level: 3,
      hitPoints: { current: 15, maximum: 15 },
      armorClass: 6,
      thac0: 17,
      experience: { current: 0, requiredForNextLevel: 0, level: 3 },
      alignment: 'Neutral Evil',
      inventory: [],
      position: 'dungeon',
      statusEffects: [],
      hitDice: '3',
      damagePerAttack: ['1d6', '1d4'],
      morale: 8,
      treasure: 'C',
      specialAbilities: [],
      xpValue: 35,
      size: 'Medium',
      movementTypes: [{ type: 'Walk', rate: 120 }],
      habitat: ['Dungeon', 'Underground'],
      frequency: 'Common',
      organization: 'Pack',
      diet: 'Carnivore',
      ecology: 'Aggressive',
      ...overrides,
    };
  }

  // Helper to create status effect
  function createStatusEffect(name: string, duration = 5): StatusEffect {
    return {
      name,
      duration,
      effect: `${name} effect`,
      savingThrow: null,
      endCondition: null,
    };
  }

  describe('Creation and Basic Properties', () => {
    it('should create monster with all basic properties', () => {
      const monsterData = createBasicMonsterData({
        id: 'orc-1',
        name: 'Orc Warrior',
        level: 1,
        hitPoints: { current: 8, maximum: 8 },
        armorClass: 6,
        hitDice: '1',
        damagePerAttack: ['1d8'],
        morale: 8,
        treasure: 'Q (×5), S',
      });

      const monster = new Monster(monsterData);

      expect(monster.id).toBe('orc-1');
      expect(monster.name).toBe('Orc Warrior');
      expect(monster.level).toBe(1);
      expect(monster.hitPoints).toBe(8);
      expect(monster.maxHitPoints).toBe(8);
      expect(monster.armorClass).toBe(6);
      expect(monster.hitDice).toBe('1');
      expect(monster.damagePerAttack).toEqual(['1d8']);
      expect(monster.morale).toBe(8);
      expect(monster.treasure).toBe('Q (×5), S');
    });

    it('should return immutable data copy', () => {
      const monsterData = createBasicMonsterData();
      const monster = new Monster(monsterData);
      const data = monster.data;

      data.name = 'Modified Name';
      expect(monster.name).toBe('Test Monster');
    });

    it('should access all required properties', () => {
      const monster = new Monster(createBasicMonsterData());

      expect(monster.thac0).toBe(17);
      expect(monster.alignment).toBe('Neutral Evil');
      expect(monster.inventory).toEqual([]);
      expect(monster.position).toBe('dungeon');
      expect(monster.statusEffects).toEqual([]);
    });
  });

  describe('Hit Dice Parsing and Calculations', () => {
    it('should parse basic hit dice', () => {
      const monster = new Monster(createBasicMonsterData({ hitDice: '5' }));
      const hitDiceValue = monster.getHitDiceValue();

      expect(hitDiceValue.dice).toBe(5);
      expect(hitDiceValue.bonus).toBe(0);
      expect(hitDiceValue.sides).toBe(8);
    });

    it('should parse hit dice with bonus', () => {
      const monster = new Monster(createBasicMonsterData({ hitDice: '3+2' }));
      const hitDiceValue = monster.getHitDiceValue();

      expect(hitDiceValue.dice).toBe(3);
      expect(hitDiceValue.bonus).toBe(2);
      expect(hitDiceValue.sides).toBe(8);
    });

    it('should parse hit dice with penalty', () => {
      const monster = new Monster(createBasicMonsterData({ hitDice: '4-1' }));
      const hitDiceValue = monster.getHitDiceValue();

      expect(hitDiceValue.dice).toBe(4);
      expect(hitDiceValue.bonus).toBe(-1);
      expect(hitDiceValue.sides).toBe(8);
    });

    it('should handle invalid hit dice format', () => {
      const monster = new Monster(createBasicMonsterData({ hitDice: 'invalid' }));
      const hitDiceValue = monster.getHitDiceValue();

      expect(hitDiceValue.dice).toBe(1);
      expect(hitDiceValue.bonus).toBe(0);
      expect(hitDiceValue.sides).toBe(8);
    });

    it('should calculate average hit points', () => {
      const monster1 = new Monster(createBasicMonsterData({ hitDice: '2' }));
      const monster2 = new Monster(createBasicMonsterData({ hitDice: '3+2' }));

      expect(monster1.getAverageHitPoints()).toBe(9); // 2 × 4.5 = 9
      expect(monster2.getAverageHitPoints()).toBe(15); // 3 × 4.5 + 2 = 15.5 → 15
    });
  });

  describe('THAC0 Calculation', () => {
    it('should calculate THAC0 based on hit dice', () => {
      const tests = [
        { hitDice: '1', expectedThac0: 19 },
        { hitDice: '2', expectedThac0: 18 },
        { hitDice: '4', expectedThac0: 16 },
        { hitDice: '8', expectedThac0: 12 },
        { hitDice: '12', expectedThac0: 8 },
        { hitDice: '16', expectedThac0: 4 },
        { hitDice: '20', expectedThac0: 3 },
      ];

      for (const test of tests) {
        const monster = new Monster(createBasicMonsterData({ hitDice: test.hitDice }));
        expect(monster.calculateThac0()).toBe(test.expectedThac0);
      }
    });

    it('should handle hit dice with bonuses for THAC0', () => {
      const monster1 = new Monster(createBasicMonsterData({ hitDice: '3+2' }));
      const monster2 = new Monster(createBasicMonsterData({ hitDice: '4-1' }));

      // Should use base dice count (3 and 4)
      expect(monster1.calculateThac0()).toBe(17);
      expect(monster2.calculateThac0()).toBe(16);
    });
  });

  describe('Combat Mechanics', () => {
    it('should get correct number of attacks per round', () => {
      const singleAttack = new Monster(
        createBasicMonsterData({
          damagePerAttack: ['1d8'],
        })
      );
      const multiAttack = new Monster(
        createBasicMonsterData({
          damagePerAttack: ['1d6', '1d6', '1d4'],
        })
      );

      expect(singleAttack.getAttacksPerRound()).toBe(1);
      expect(multiAttack.getAttacksPerRound()).toBe(3);
    });

    it('should get damage for specific attacks', () => {
      const monster = new Monster(
        createBasicMonsterData({
          damagePerAttack: ['1d8', '1d6', '1d4'],
        })
      );

      expect(monster.getDamageForAttack(0)).toBe('1d8');
      expect(monster.getDamageForAttack(1)).toBe('1d6');
      expect(monster.getDamageForAttack(2)).toBe('1d4');
      expect(monster.getDamageForAttack(3)).toBe('1d4'); // Out of bounds
      expect(monster.getDamageForAttack(-1)).toBe('1d4'); // Invalid index
    });

    it('should calculate attack bonus based on hit dice', () => {
      const weak = new Monster(createBasicMonsterData({ hitDice: '3' }));
      const medium = new Monster(createBasicMonsterData({ hitDice: '8' }));
      const strong = new Monster(createBasicMonsterData({ hitDice: '15' }));

      expect(weak.getAttackBonus()).toBe(0);
      expect(medium.getAttackBonus()).toBe(1); // 7+ HD = +1
      expect(strong.getAttackBonus()).toBe(3); // 15+ HD = +3
    });

    it('should check action availability', () => {
      const healthy = new Monster(
        createBasicMonsterData({
          hitPoints: { current: 15, maximum: 15 },
          morale: 10,
        })
      );
      const wounded = new Monster(
        createBasicMonsterData({
          hitPoints: { current: 5, maximum: 15 },
          morale: 6,
        })
      );
      const dead = new Monster(
        createBasicMonsterData({
          hitPoints: { current: 0, maximum: 15 },
        })
      );

      expect(healthy.canPerformAction('attack')).toBe(true);
      expect(healthy.canPerformAction('move')).toBe(true);
      expect(healthy.canPerformAction('special-ability')).toBe(true);

      expect(wounded.canPerformAction('attack')).toBe(false); // Low morale
      expect(wounded.canPerformAction('move')).toBe(true);

      expect(dead.canPerformAction('attack')).toBe(false);
      expect(dead.canPerformAction('move')).toBe(false);
    });

    it('should check morale requirements', () => {
      const healthy = new Monster(
        createBasicMonsterData({
          hitPoints: { current: 15, maximum: 15 },
        })
      );
      const wounded = new Monster(
        createBasicMonsterData({
          hitPoints: { current: 7, maximum: 15 },
        })
      );

      expect(healthy.shouldCheckMorale()).toBe(false);
      expect(wounded.shouldCheckMorale()).toBe(true);
    });
  });

  describe('Experience Value Calculation', () => {
    it('should calculate experience value by hit dice', () => {
      const tests = [
        { hitDice: '1', expectedXp: 15 },
        { hitDice: '2', expectedXp: 20 },
        { hitDice: '4', expectedXp: 75 },
        { hitDice: '8', expectedXp: 650 },
        { hitDice: '15', expectedXp: 2250 },
        { hitDice: '20', expectedXp: 5250 },
        { hitDice: '25', expectedXp: 5250 }, // Over maximum caps at 20 HD
      ];

      for (const test of tests) {
        const monster = new Monster(createBasicMonsterData({ hitDice: test.hitDice }));
        expect(monster.getExperienceValue()).toBe(test.expectedXp);
      }
    });

    it('should count bonus hit dice towards experience', () => {
      const monster1 = new Monster(createBasicMonsterData({ hitDice: '3' }));
      const monster2 = new Monster(createBasicMonsterData({ hitDice: '3+1' }));

      expect(monster1.getExperienceValue()).toBe(35); // 3 HD
      expect(monster2.getExperienceValue()).toBe(75); // 4 HD (3+1 bonus)
    });
  });

  describe('Treasure Management', () => {
    it('should detect treasure presence', () => {
      const withTreasure = new Monster(createBasicMonsterData({ treasure: 'B' }));
      const noTreasure = new Monster(createBasicMonsterData({ treasure: 'Nil' }));
      const emptyTreasure = new Monster(createBasicMonsterData({ treasure: '' }));

      expect(withTreasure.hasTreasure()).toBe(true);
      expect(noTreasure.hasTreasure()).toBe(false);
      expect(emptyTreasure.hasTreasure()).toBe(false);
    });

    it('should return treasure type', () => {
      const monster = new Monster(createBasicMonsterData({ treasure: 'C, Q (×5)' }));

      expect(monster.getTreasureType()).toBe('C, Q (×5)');
    });

    it('should generate basic treasure structure', () => {
      const monster = new Monster(createBasicMonsterData());
      const treasure = monster.generateTreasure();

      expect(treasure).toHaveProperty('coins');
      expect(treasure).toHaveProperty('items');
      expect(treasure.coins).toEqual({ copper: 0, silver: 0, gold: 0, platinum: 0 });
      expect(treasure.items).toEqual([]);
    });
  });

  describe('Health and Status Management', () => {
    it('should track alive/dead state', () => {
      const alive = new Monster(
        createBasicMonsterData({
          hitPoints: { current: 5, maximum: 15 },
        })
      );
      const dead = new Monster(
        createBasicMonsterData({
          hitPoints: { current: 0, maximum: 15 },
        })
      );

      expect(alive.isAlive()).toBe(true);
      expect(alive.isIncapacitated()).toBe(false);
      expect(dead.isAlive()).toBe(false);
      expect(dead.isIncapacitated()).toBe(true);
    });

    it('should handle damage correctly', () => {
      const monster = new Monster(
        createBasicMonsterData({
          hitPoints: { current: 15, maximum: 15 },
        })
      );

      const damaged = monster.takeDamage(5);
      const killed = monster.takeDamage(20);

      expect(damaged.hitPoints).toBe(10);
      expect(damaged.maxHitPoints).toBe(15);
      expect(killed.hitPoints).toBe(0);
      expect(monster.hitPoints).toBe(15); // Original unchanged
    });

    it('should handle healing correctly', () => {
      const monster = new Monster(
        createBasicMonsterData({
          hitPoints: { current: 8, maximum: 15 },
        })
      );

      const healed = monster.heal(5);
      const overhealed = monster.heal(10);

      expect(healed.hitPoints).toBe(13);
      expect(overhealed.hitPoints).toBe(15); // Capped at maximum
      expect(monster.hitPoints).toBe(8); // Original unchanged
    });

    it('should manage status effects', () => {
      const monster = new Monster(createBasicMonsterData());
      const poison = createStatusEffect('Poisoned');
      const paralyzed = createStatusEffect('Paralyzed');

      const withPoison = monster.addStatusEffect(poison);
      const withBoth = withPoison.addStatusEffect(paralyzed);
      const cured = withBoth.removeStatusEffect('Poisoned');

      expect(monster.hasStatusEffect('Poisoned')).toBe(false);
      expect(withPoison.hasStatusEffect('Poisoned')).toBe(true);
      expect(withBoth.hasStatusEffect('Poisoned')).toBe(true);
      expect(withBoth.hasStatusEffect('Paralyzed')).toBe(true);
      expect(cured.hasStatusEffect('Poisoned')).toBe(false);
      expect(cured.hasStatusEffect('Paralyzed')).toBe(true);
    });
  });

  describe('Command Execution', () => {
    it('should validate command execution capabilities', () => {
      const healthy = new Monster(
        createBasicMonsterData({
          hitPoints: { current: 15, maximum: 15 },
          morale: 10,
        })
      );
      const dead = new Monster(
        createBasicMonsterData({
          hitPoints: { current: 0, maximum: 15 },
        })
      );

      expect(healthy.canExecuteCommand('attack', {})).toBe(true);
      expect(healthy.canExecuteCommand('move', {})).toBe(true);
      expect(healthy.canExecuteCommand('use-special-ability', {})).toBe(true);
      expect(healthy.canExecuteCommand('unknown-command', {})).toBe(true);

      expect(dead.canExecuteCommand('attack', {})).toBe(false);
      expect(dead.canExecuteCommand('move', {})).toBe(false);
    });

    it('should throw error when executing commands directly', async () => {
      const monster = new Monster(createBasicMonsterData());

      await expect(monster.executeCommand('attack', {}, context)).rejects.toThrow(
        'Command execution should be handled by the RuleEngine'
      );
    });
  });

  describe('Updates and Mutations', () => {
    it('should update properties immutably', () => {
      const monster = new Monster(createBasicMonsterData());
      const updated = monster.update({
        name: 'Updated Monster',
        level: 5,
        morale: 12,
      });

      expect(updated.name).toBe('Updated Monster');
      expect(updated.level).toBe(5);
      expect(updated.morale).toBe(12);
      expect(monster.name).toBe('Test Monster'); // Original unchanged
    });
  });

  describe('MonsterFactory', () => {
    it('should create monsters using factory', () => {
      const data = createBasicMonsterData();
      const monster = MonsterFactory.create(data);

      expect(monster).toBeInstanceOf(Monster);
      expect(monster.id).toBe(data.id);
    });

    it('should create monsters from JSON', () => {
      const data = createBasicMonsterData();
      const json = JSON.stringify(data);
      const monster = MonsterFactory.fromJSON(json);

      expect(monster).toBeInstanceOf(Monster);
      expect(monster.data).toEqual(data);
    });

    it('should create monsters from stat blocks', () => {
      const statBlock = {
        name: 'Orc',
        hitDice: '1',
        armorClass: 6,
        damage: ['1d8'],
        morale: 8,
        treasure: 'Q (×5), S',
        alignment: 'Lawful Evil',
      };

      const monster = MonsterFactory.fromStatBlock(statBlock);

      expect(monster.name).toBe('Orc');
      expect(monster.hitDice).toBe('1');
      expect(monster.armorClass).toBe(6);
      expect(monster.damagePerAttack).toEqual(['1d8']);
      expect(monster.morale).toBe(8);
      expect(monster.treasure).toBe('Q (×5), S');
      expect(monster.alignment).toBe('Lawful Evil');
      expect(monster.id).toMatch(/^monster-\d+$/);
    });

    it('should validate monster data', () => {
      const validData = createBasicMonsterData();
      const invalidData = createBasicMonsterData({
        hitDice: 'invalid-format',
        armorClass: 15, // Outside OSRIC range
        morale: 15, // Outside OSRIC range
      });

      const validResult = MonsterFactory.validate(validData);
      const invalidResult = MonsterFactory.validate(invalidData);

      expect(validResult.valid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors).toHaveLength(3);
      expect(invalidResult.errors).toContain('Invalid hit dice format: invalid-format');
      expect(invalidResult.errors).toContain('Armor class 15 is outside OSRIC range (-10 to 10)');
      expect(invalidResult.errors).toContain('Morale 15 is outside OSRIC range (2-12)');
    });
  });

  describe('OSRIC Compliance', () => {
    it('should implement authentic OSRIC/AD&D 1st Edition monster mechanics', () => {
      // Test classic AD&D monster - Orc
      const orc = new Monster(
        createBasicMonsterData({
          name: 'Orc',
          hitDice: '1',
          hitPoints: { current: 8, maximum: 8 },
          armorClass: 6,
          damagePerAttack: ['1d8'],
          morale: 8,
          treasure: 'Q (×5), S',
          alignment: 'Lawful Evil',
        })
      );

      expect(orc.calculateThac0()).toBe(19); // 1 HD = THAC0 19
      expect(orc.getExperienceValue()).toBe(15); // 1 HD = 15 XP
      expect(orc.getAttackBonus()).toBe(0); // Low HD = no bonus
      expect(orc.getAttacksPerRound()).toBe(1);
      expect(orc.shouldCheckMorale()).toBe(false); // Full HP
    });

    it('should handle high-level monsters correctly', () => {
      // Test high-level monster like Adult Red Dragon
      const redDragon = new Monster(
        createBasicMonsterData({
          name: 'Adult Red Dragon',
          hitDice: '10',
          hitPoints: { current: 80, maximum: 80 },
          armorClass: -1,
          damagePerAttack: ['1d8', '1d8', '3d10'],
          morale: 10,
          treasure: 'H',
          alignment: 'Chaotic Evil',
        })
      );

      expect(redDragon.calculateThac0()).toBe(10); // 10 HD = THAC0 10
      expect(redDragon.getExperienceValue()).toBe(1100); // 10 HD
      expect(redDragon.getAttackBonus()).toBe(2); // 9+ HD = +2
      expect(redDragon.getAttacksPerRound()).toBe(3); // Claw/Claw/Bite
    });

    it('should implement proper morale system', () => {
      const goblin = new Monster(
        createBasicMonsterData({
          name: 'Goblin',
          hitDice: '1-1',
          hitPoints: { current: 4, maximum: 4 },
          morale: 7,
        })
      );

      // At full health, no morale check needed
      expect(goblin.shouldCheckMorale()).toBe(false);
      expect(goblin.canPerformAction('attack')).toBe(true);

      // When wounded below half
      const wounded = goblin.takeDamage(3); // 1 HP remaining
      expect(wounded.shouldCheckMorale()).toBe(true);
      expect(wounded.canPerformAction('attack')).toBe(true); // Morale 7 >= 7
    });
  });
});
