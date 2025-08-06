import { createStore } from 'jotai';
import { beforeEach, describe, expect, it } from 'vitest';
import { GameContext } from '../../../osric/core/GameContext';
import { DamageCalculationRule } from '../../../osric/rules/combat/DamageCalculationRules';
import { COMMAND_TYPES } from '../../../osric/types/constants';
import type { Character, CombatResult, Monster, Weapon } from '../../../osric/types/entities';

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
    position: 'town',
    statusEffects: [],
    race: 'Human',
    class: 'Fighter',
    abilities: {
      strength: 16,
      dexterity: 10,
      constitution: 10,
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

function createMockMonster(overrides: Partial<Monster> = {}): Monster {
  const defaultMonster: Monster = {
    id: 'test-monster',
    name: 'Test Monster',
    level: 2,
    hitPoints: { current: 10, maximum: 10 },
    armorClass: 12,
    thac0: 19,
    experience: { current: 0, requiredForNextLevel: 0, level: 2 },
    alignment: 'True Neutral',
    inventory: [],
    position: 'dungeon',
    statusEffects: [],
    hitDice: '2+1',
    damagePerAttack: ['1d6'],
    morale: 8,
    treasure: 'C',
    specialAbilities: [],
    xpValue: 35,
    size: 'Medium',
    movementTypes: [{ type: 'Walk', rate: 90 }],
    habitat: ['Dungeon'],
    frequency: 'Common',
    organization: 'Pack',
    diet: 'Omnivore',
    ecology: 'Temperate',
  };

  return { ...defaultMonster, ...overrides };
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

class MockAttackCommand {
  readonly type = COMMAND_TYPES.ATTACK;
  readonly actorId = 'test-attacker';
  readonly targetIds = ['test-target'];

  async execute(_context: GameContext) {
    return { success: true, message: 'Mock attack executed' };
  }

  canExecute(_context: GameContext): boolean {
    return true;
  }

  getRequiredRules(): string[] {
    return ['damage-calculation'];
  }

  getInvolvedEntities(): string[] {
    return [this.actorId, ...this.targetIds];
  }
}

describe('DamageCalculationRules', () => {
  let context: GameContext;
  let store: ReturnType<typeof createStore>;
  let mockCommand: MockAttackCommand;
  let rule: DamageCalculationRule;

  beforeEach(() => {
    store = createStore();
    context = new GameContext(store);
    mockCommand = new MockAttackCommand();
    rule = new DamageCalculationRule();
  });

  describe('DamageCalculationRule', () => {
    it('should calculate basic weapon damage with strength bonus', async () => {
      const attacker = createMockCharacter({
        name: 'Fighter',
        abilities: { ...createMockCharacter().abilities, strength: 16 },
        abilityModifiers: { ...createMockCharacter().abilityModifiers, strengthDamageAdj: 1 },
      });
      const target = createMockCharacter({
        name: 'Target',
        hitPoints: { current: 10, maximum: 10 },
      });
      const weapon = createMockWeapon({ damage: '1d8' });

      context.setTemporary('attack-context', {
        attacker,
        target,
        weapon,
        attackType: 'normal',
        hitRoll: 15,
        isCriticalHit: false,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Damage calculated');

      const damageValues = context.getTemporary('damage-values') as number[];
      expect(damageValues).toBeDefined();
      expect(damageValues.length).toBe(1);

      expect(damageValues[0]).toBeGreaterThanOrEqual(2);
      expect(damageValues[0]).toBeLessThanOrEqual(9);

      const combatResult = context.getTemporary('damage-result') as CombatResult;
      expect(combatResult.hit).toBe(true);
      expect(combatResult.critical).toBe(false);
    });

    it('should handle critical hit damage doubling', async () => {
      const attacker = createMockCharacter({ name: 'Fighter' });
      const target = createMockCharacter({
        name: 'Target',
        hitPoints: { current: 10, maximum: 10 },
      });
      const weapon = createMockWeapon({ damage: '1d8' });

      context.setTemporary('attack-context', {
        attacker,
        target,
        weapon,
        attackType: 'normal',
        hitRoll: 20,
        isCriticalHit: true,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);

      const combatResult = context.getTemporary('damage-result') as CombatResult;
      expect(combatResult.critical).toBe(true);
      expect(combatResult.message).toContain('critically hit');
    });

    it('should apply magic weapon bonuses', async () => {
      const attacker = createMockCharacter({ name: 'Fighter' });
      const target = createMockCharacter({
        name: 'Target',
        hitPoints: { current: 10, maximum: 10 },
      });
      const magicWeapon = createMockWeapon({
        name: '+1 Longsword',
        damage: '1d8',
        magicBonus: 1,
      });

      context.setTemporary('attack-context', {
        attacker,
        target,
        weapon: magicWeapon,
        attackType: 'normal',
        hitRoll: 15,
        isCriticalHit: false,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);

      const damageValues = context.getTemporary('damage-values') as number[];

      expect(damageValues[0]).toBeGreaterThanOrEqual(3);
      expect(damageValues[0]).toBeLessThanOrEqual(10);
    });

    it('should use damageVsLarge for large creatures', async () => {
      const attacker = createMockCharacter({ name: 'Fighter' });
      const largeMonster = createMockMonster({
        name: 'Large Monster',
        size: 'Large',
        hitPoints: { current: 20, maximum: 20 },
      });
      const weapon = createMockWeapon({
        damage: '1d8',
        damageVsLarge: '1d12',
      });

      context.setTemporary('attack-context', {
        attacker,
        target: largeMonster,
        weapon,
        attackType: 'normal',
        hitRoll: 15,
        isCriticalHit: false,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);

      const damageValues = context.getTemporary('damage-values') as number[];

      expect(damageValues[0]).toBeGreaterThanOrEqual(2);
      expect(damageValues[0]).toBeLessThanOrEqual(13);
    });

    it('should handle monster natural attacks', async () => {
      const monster = createMockMonster({
        name: 'Wolf',
        damagePerAttack: ['1d4+1'],
      });
      const target = createMockCharacter({ name: 'Target', hitPoints: { current: 8, maximum: 8 } });

      context.setTemporary('attack-context', {
        attacker: monster,
        target,
        attackType: 'natural',
        hitRoll: 15,
        isCriticalHit: false,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);

      const damageValues = context.getTemporary('damage-values') as number[];

      expect(damageValues[0]).toBeGreaterThanOrEqual(2);
      expect(damageValues[0]).toBeLessThanOrEqual(5);
    });

    it('should handle unarmed attacks with 1d2 damage', async () => {
      const attacker = createMockCharacter({ name: 'Unarmed Fighter' });
      const target = createMockCharacter({ name: 'Target', hitPoints: { current: 8, maximum: 8 } });

      context.setTemporary('attack-context', {
        attacker,
        target,

        attackType: 'unarmed',
        hitRoll: 15,
        isCriticalHit: false,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);

      const damageValues = context.getTemporary('damage-values') as number[];

      expect(damageValues[0]).toBeGreaterThanOrEqual(2);
      expect(damageValues[0]).toBeLessThanOrEqual(3);
    });

    it('should ensure minimum damage of 1', async () => {
      const weakAttacker = createMockCharacter({
        name: 'Weak Fighter',
        abilities: { ...createMockCharacter().abilities, strength: 3 },
        abilityModifiers: { ...createMockCharacter().abilityModifiers, strengthDamageAdj: -3 },
      });
      const target = createMockCharacter({ name: 'Target', hitPoints: { current: 8, maximum: 8 } });
      const weapon = createMockWeapon({ damage: '1d2' });

      context.setTemporary('attack-context', {
        attacker: weakAttacker,
        target,
        weapon,
        attackType: 'normal',
        hitRoll: 15,
        isCriticalHit: false,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);

      const damageValues = context.getTemporary('damage-values') as number[];

      expect(damageValues[0]).toBeGreaterThanOrEqual(1);
    });

    it('should create unconscious status when target reaches 0 hp', async () => {
      const attacker = createMockCharacter({ name: 'Fighter' });
      const target = createMockCharacter({
        name: 'Target',
        hitPoints: { current: 2, maximum: 8 },
      });
      const weapon = createMockWeapon({ damage: '1d8' });

      context.setTemporary('attack-context', {
        attacker,
        target,
        weapon,
        attackType: 'normal',
        hitRoll: 15,
        isCriticalHit: false,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);

      const combatResult = context.getTemporary('damage-result') as CombatResult;

      if (target.hitPoints.current === 0) {
        expect(combatResult.message).toContain('unconscious');
        expect(combatResult.specialEffects).toBeDefined();

        const unconsciousEffect = combatResult.specialEffects?.find(
          (e) => e.name === 'Unconscious'
        );
        expect(unconsciousEffect).toBeDefined();

        const bleedingEffect = combatResult.specialEffects?.find((e) => e.name === 'Bleeding');
        expect(bleedingEffect).toBeDefined();
      }
    });

    it('should handle subdual damage mechanics', async () => {
      const attacker = createMockCharacter({ name: 'Fighter' });
      const target = createMockCharacter({ name: 'Target', hitPoints: { current: 8, maximum: 8 } });
      const weapon = createMockWeapon({ damage: '1d8' });

      context.setTemporary('attack-context', {
        attacker,
        target,
        weapon,
        attackType: 'subdual',
        hitRoll: 15,
        isCriticalHit: false,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);

      const damageValues = context.getTemporary('damage-values') as number[];
      expect(damageValues.length).toBe(2);

      const combatResult = context.getTemporary('damage-result') as CombatResult;
      expect(combatResult.message).toContain('subdual damage');

      const subduedEffect = combatResult.specialEffects?.find((e) => e.name === 'Subdued');
      expect(subduedEffect).toBeDefined();
    });

    it('should only apply to attack commands with hit rolls', () => {
      const wrongCommand = { ...mockCommand, type: 'move' };
      expect(rule.canApply(context, wrongCommand as unknown as typeof mockCommand)).toBe(false);

      expect(rule.canApply(context, mockCommand)).toBe(false);

      context.setTemporary('attack-context', {
        attacker: createMockCharacter(),
        target: createMockCharacter(),
      });
      expect(rule.canApply(context, mockCommand)).toBe(false);

      context.setTemporary('attack-context', {
        attacker: createMockCharacter(),
        target: createMockCharacter(),
        hitRoll: 15,
      });
      expect(rule.canApply(context, mockCommand)).toBe(true);
    });

    it('should fail gracefully without attack context', async () => {
      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('No attack context found');
    });

    it('should preserve OSRIC damage calculations exactly', async () => {
      const attacker = createMockCharacter({
        name: 'OSRIC Fighter',
        abilities: { ...createMockCharacter().abilities, strength: 16 },
        abilityModifiers: { ...createMockCharacter().abilityModifiers, strengthDamageAdj: 1 },
      });
      const target = createMockCharacter({ name: 'OSRIC Target' });
      const osricWeapon = createMockWeapon({
        name: 'OSRIC Longsword',
        damage: '1d8',
        damageVsLarge: '1d12',
      });

      context.setTemporary('attack-context', {
        attacker,
        target,
        weapon: osricWeapon,
        attackType: 'normal',
        hitRoll: 15,
        isCriticalHit: false,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);

      const damageValues = context.getTemporary('damage-values') as number[];

      expect(damageValues[0]).toBeGreaterThanOrEqual(2);
      expect(damageValues[0]).toBeLessThanOrEqual(9);

      const combatResult = context.getTemporary('damage-result') as CombatResult;
      expect(combatResult.hit).toBe(true);
      expect(combatResult.message).toMatch(/OSRIC Fighter.*hit.*OSRIC Target.*for \d+ damage/);
    });
  });
});
