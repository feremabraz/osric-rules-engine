import { createStore } from 'jotai';
import { beforeEach, describe, expect, it } from 'vitest';
import { GameContext } from '../../../osric/core/GameContext';
import {
  InitiativeOrderRule,
  InitiativeRollRule,
  SurpriseCheckRule,
} from '../../../osric/rules/combat/InitiativeRules';
import { COMMAND_TYPES } from '../../../osric/types/constants';
import type { Character, Monster, Spell, Weapon } from '../../../osric/types/entities';

interface InitiativeResult {
  entity: Character | Monster;
  naturalRoll: number;
  modifiers: number;
  weaponSpeedFactor: number;
  surprised: boolean;
  initiative: number;
}

interface InitiativeOrder {
  activeEntities: Array<{
    entityId: string;
    name: string;
    initiative: number;
    weaponSpeedFactor: number;
  }>;
  surprisedEntities: Array<{
    entityId: string;
    name: string;
    initiative: number;
  }>;
  roundNumber: number;
}

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
      dexterity: 14,
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

function createMockSpell(overrides: Partial<Spell> = {}): Spell {
  const defaultSpell: Spell = {
    name: 'Magic Missile',
    level: 1,
    class: 'Magic-User',
    castingTime: '1 segment',
    range: '150 feet',
    duration: 'Instantaneous',
    areaOfEffect: '1 target',
    savingThrow: 'None',
    components: ['V', 'S'],
    description: 'A magic missile spell',
    materialComponents: [],
    reversible: false,
    effect: () => ({
      damage: null,
      healing: null,
      statusEffects: null,
      narrative: 'Magic missile fired',
    }),
  };

  return { ...defaultSpell, ...overrides };
}

class MockInitiativeCommand {
  readonly type = COMMAND_TYPES.INITIATIVE;
  readonly actorId = 'test-actor';
  readonly targetIds: string[] = [];

  async execute(_context: GameContext) {
    return { success: true, message: 'Mock initiative executed' };
  }

  canExecute(_context: GameContext): boolean {
    return true;
  }

  getRequiredRules(): string[] {
    return ['initiative-roll'];
  }

  getInvolvedEntities(): string[] {
    return [this.actorId, ...this.targetIds];
  }
}

describe('InitiativeRules', () => {
  let context: GameContext;
  let store: ReturnType<typeof createStore>;
  let mockCommand: MockInitiativeCommand;
  let initiativeRule: InitiativeRollRule;
  let _surpriseRule: SurpriseCheckRule;
  let orderRule: InitiativeOrderRule;

  beforeEach(() => {
    store = createStore();
    context = new GameContext(store);
    mockCommand = new MockInitiativeCommand();
    initiativeRule = new InitiativeRollRule();
    _surpriseRule = new SurpriseCheckRule();
    orderRule = new InitiativeOrderRule();
  });

  describe('InitiativeRollRule', () => {
    it('should roll individual initiative with dexterity modifiers', async () => {
      const fighter = createMockCharacter({
        name: 'Fast Fighter',
        abilities: { ...createMockCharacter().abilities, dexterity: 16 },
        abilityModifiers: { ...createMockCharacter().abilityModifiers, dexterityReaction: 2 },
      });
      const monster = createMockMonster({ name: 'Slow Monster' });

      context.setTemporary('initiative-context', {
        entities: [fighter, monster],
        initiativeType: 'individual',
        entityWeapons: {},
        entitySpells: {},
        circumstanceModifiers: {},
        isFirstRound: true,
      });

      const result = await initiativeRule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Initiative rolled');

      const initiativeResults = context.getTemporary('initiative-results') as InitiativeResult[];
      expect(initiativeResults).toBeDefined();
      expect(Array.isArray(initiativeResults)).toBe(true);
      expect(initiativeResults).toHaveLength(2);

      const fighterResult = initiativeResults.find((r) => r.entity.name === 'Fast Fighter');
      expect(fighterResult).toBeDefined();
      if (fighterResult) {
        expect(fighterResult.naturalRoll).toBeGreaterThanOrEqual(1);
        expect(fighterResult.naturalRoll).toBeLessThanOrEqual(10);
        expect(fighterResult.modifiers).toBe(-2);
        expect(fighterResult.initiative).toBe(fighterResult.naturalRoll - 2);
      }
    });

    it('should apply weapon speed factors', async () => {
      const fighter = createMockCharacter({ name: 'Fighter' });
      const dagger = createMockWeapon({ name: 'Dagger', speed: 2 });

      context.setTemporary('initiative-context', {
        entities: [fighter],
        initiativeType: 'individual',
        entityWeapons: { [fighter.id]: dagger },
        entitySpells: {},
        circumstanceModifiers: {},
        isFirstRound: true,
      });

      const result = await initiativeRule.execute(context, mockCommand);

      expect(result.success).toBe(true);

      const initiativeResults = context.getTemporary('initiative-results') as InitiativeResult[];
      const fighterResult = initiativeResults[0];
      expect(fighterResult.weaponSpeedFactor).toBe(2);
      expect(fighterResult.initiative).toBeGreaterThan(
        fighterResult.naturalRoll + fighterResult.modifiers
      );
    });

    it('should handle spell casting time modifiers', async () => {
      const wizard = createMockCharacter({
        name: 'Wizard',
        class: 'Magic-User',
      });
      const fireball = createMockSpell({
        name: 'Fireball',
        castingTime: '3 segments',
      });

      context.setTemporary('initiative-context', {
        entities: [wizard],
        initiativeType: 'individual',
        entityWeapons: {},
        entitySpells: { [wizard.id]: fireball },
        circumstanceModifiers: {},
        isFirstRound: true,
      });

      const result = await initiativeRule.execute(context, mockCommand);

      expect(result.success).toBe(true);

      const initiativeResults = context.getTemporary('initiative-results') as InitiativeResult[];
      const wizardResult = initiativeResults[0];

      expect(wizardResult.initiative).toBeGreaterThan(
        wizardResult.naturalRoll + wizardResult.modifiers
      );
    });

    it('should apply surprise modifiers', async () => {
      const character = createMockCharacter({
        name: 'Surprised Character',

        abilityModifiers: { ...createMockCharacter().abilityModifiers, dexterityReaction: 0 },
      });
      const monster = createMockMonster({ name: 'Surprising Monster' });

      context.setTemporary('initiative-context', {
        entities: [character, monster],
        initiativeType: 'individual',
        entityWeapons: {},
        entitySpells: {},
        circumstanceModifiers: {
          [character.id]: 2,
          [monster.id]: -2,
        },
        isFirstRound: true,
      });

      const result = await initiativeRule.execute(context, mockCommand);

      expect(result.success).toBe(true);

      const initiativeResults = context.getTemporary('initiative-results') as InitiativeResult[];
      const charResult = initiativeResults.find((r) => r.entity.name === 'Surprised Character');
      const monsterResult = initiativeResults.find((r) => r.entity.name === 'Surprising Monster');

      expect(charResult?.modifiers).toBe(2);
      expect(monsterResult?.modifiers).toBe(-2);
    });

    it('should handle group initiative', async () => {
      const fighter1 = createMockCharacter({ name: 'Fighter 1' });
      const fighter2 = createMockCharacter({ name: 'Fighter 2' });
      const monster1 = createMockMonster({ name: 'Monster 1' });
      const monster2 = createMockMonster({ name: 'Monster 2' });

      context.setTemporary('initiative-context', {
        entities: [fighter1, fighter2, monster1, monster2],
        initiativeType: 'group',
        entityWeapons: {},
        entitySpells: {},
        circumstanceModifiers: {},
        isFirstRound: true,
      });

      const result = await initiativeRule.execute(context, mockCommand);

      expect(result.success).toBe(true);

      const initiativeResults = context.getTemporary('initiative-results') as InitiativeResult[];

      expect(initiativeResults.length).toBeGreaterThan(0);

      expect(initiativeResults.length).toBeLessThanOrEqual(4);
    });

    it('should determine correct initiative order', async () => {
      const fastCharacter = createMockCharacter({
        name: 'Fast Character',
        abilities: { ...createMockCharacter().abilities, dexterity: 18 },
        abilityModifiers: { ...createMockCharacter().abilityModifiers, dexterityReaction: 3 },
      });
      const slowCharacter = createMockCharacter({
        name: 'Slow Character',
        abilities: { ...createMockCharacter().abilities, dexterity: 8 },
        abilityModifiers: { ...createMockCharacter().abilityModifiers, dexterityReaction: -1 },
      });

      context.setTemporary('initiative-context', {
        entities: [slowCharacter, fastCharacter],
        initiativeType: 'individual',
        entityWeapons: {},
        entitySpells: {},
        circumstanceModifiers: {},
        isFirstRound: true,
      });

      const rollResult = await initiativeRule.execute(context, mockCommand);
      expect(rollResult.success).toBe(true);

      const orderResult = await orderRule.execute(context, mockCommand);
      expect(orderResult.success).toBe(true);

      const initiativeOrder = context.getTemporary('initiative-order') as InitiativeOrder;
      expect(initiativeOrder).toBeDefined();
      expect(initiativeOrder.activeEntities).toBeDefined();
      expect(Array.isArray(initiativeOrder.activeEntities)).toBe(true);
      expect(initiativeOrder.activeEntities).toHaveLength(2);

      if (initiativeOrder.activeEntities.length >= 2) {
        expect(initiativeOrder.activeEntities[0].initiative).toBeLessThanOrEqual(
          initiativeOrder.activeEntities[1].initiative
        );
      }
    });

    it('should handle ties in initiative', async () => {
      const char1 = createMockCharacter({ name: 'Character 1' });
      const char2 = createMockCharacter({ name: 'Character 2' });

      context.setTemporary('initiative-context', {
        entities: [char1, char2],
        initiativeType: 'individual',
        entityWeapons: {},
        entitySpells: {},
        circumstanceModifiers: {},
        isFirstRound: true,
      });

      const rollResult = await initiativeRule.execute(context, mockCommand);
      expect(rollResult.success).toBe(true);

      const orderResult = await orderRule.execute(context, mockCommand);
      expect(orderResult.success).toBe(true);

      const initiativeOrder = context.getTemporary('initiative-order') as InitiativeOrder;
      expect(initiativeOrder.activeEntities).toHaveLength(2);
    });

    it('should only apply to initiative commands with context', () => {
      const wrongCommand = { ...mockCommand, type: 'move' };
      expect(initiativeRule.canApply(context, wrongCommand as unknown as typeof mockCommand)).toBe(
        false
      );

      expect(initiativeRule.canApply(context, mockCommand)).toBe(false);

      context.setTemporary('initiative-context', {
        entities: [createMockCharacter()],
        initiativeType: 'individual',
        entityWeapons: {},
        entitySpells: {},
        circumstanceModifiers: {},
        isFirstRound: true,
      });
      expect(initiativeRule.canApply(context, mockCommand)).toBe(true);
    });

    it('should fail gracefully without initiative context', async () => {
      const result = await initiativeRule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('No initiative context found');
    });

    it('should preserve OSRIC initiative mechanics exactly', async () => {
      const osricFighter = createMockCharacter({
        name: 'OSRIC Fighter',
        abilities: { ...createMockCharacter().abilities, dexterity: 16 },
        abilityModifiers: { ...createMockCharacter().abilityModifiers, dexterityReaction: 2 },
      });
      const osricWeapon = createMockWeapon({
        name: 'OSRIC Longsword',
        speed: 5,
      });

      context.setTemporary('initiative-context', {
        entities: [osricFighter],
        initiativeType: 'individual',
        entityWeapons: { [osricFighter.id]: osricWeapon },
        entitySpells: {},
        circumstanceModifiers: {},
        isFirstRound: true,
      });

      const result = await initiativeRule.execute(context, mockCommand);

      expect(result.success).toBe(true);

      const initiativeResults = context.getTemporary('initiative-results') as InitiativeResult[];
      const fighterResult = initiativeResults[0];

      expect(fighterResult.naturalRoll).toBeGreaterThanOrEqual(1);
      expect(fighterResult.naturalRoll).toBeLessThanOrEqual(10);

      expect(fighterResult.modifiers).toBe(-2);

      expect(fighterResult.weaponSpeedFactor).toBe(5);
      expect(fighterResult.initiative).toBe(fighterResult.naturalRoll - 2 + 5);
    });

    it('should handle multiple attacks per round', async () => {
      const highLevelFighter = createMockCharacter({
        name: 'High Level Fighter',
        level: 7,
        class: 'Fighter',
      });

      context.setTemporary('initiative-context', {
        entities: [highLevelFighter],
        initiativeType: 'individual',
        entityWeapons: {},
        entitySpells: {},
        circumstanceModifiers: {},
        isFirstRound: true,
      });

      const result = await initiativeRule.execute(context, mockCommand);

      expect(result.success).toBe(true);

      expect(result.message).toContain('Initiative rolled');
    });
  });
});
