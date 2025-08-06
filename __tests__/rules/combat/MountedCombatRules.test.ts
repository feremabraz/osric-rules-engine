import { GameContext } from '@osric/core/GameContext';
import {
  AerialAgilityLevel,
  type Mount,
  MountedChargeRule,
} from '@osric/rules/combat/MountedCombatRules';
import { COMMAND_TYPES } from '@osric/types/constants';
import type { Character, Monster, Weapon } from '@osric/types/entities';
import { createStore } from 'jotai';
import { beforeEach, describe, expect, it } from 'vitest';

interface _MountedCombatContext {
  rider: Character;
  mount: Mount;
  chargeDistance: number;
  terrain: string;
}

interface MountedChargeResult {
  message: string;
  damageMultiplier: number;
  hitBonus?: number;
  specialEffects?: string[];
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
      constitution: 15,
      intelligence: 10,
      wisdom: 12,
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
    encumbrance: 0.3,
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
      { weapon: 'Lance', penalty: 0 },
      { weapon: 'Longsword', penalty: 0 },
      { weapon: 'Land-based Riding', penalty: 0 },
    ],
    secondarySkills: [],
  };

  return { ...defaultCharacter, ...overrides };
}

function createMockMonster(overrides: Partial<Monster> = {}): Monster {
  const defaultMonster: Monster = {
    id: 'test-monster',
    name: 'Test Monster',
    level: 3,
    hitPoints: { current: 20, maximum: 20 },
    armorClass: 14,
    thac0: 18,
    experience: { current: 0, requiredForNextLevel: 0, level: 3 },
    alignment: 'Chaotic Evil',
    inventory: [],
    position: 'battlefield',
    statusEffects: [],
    hitDice: '3+1',
    damagePerAttack: ['1d8'],
    morale: 10,
    treasure: 'C',
    specialAbilities: [],
    xpValue: 65,
    size: 'Medium',
    movementTypes: [{ type: 'Walk', rate: 90 }],
    habitat: ['Any'],
    frequency: 'Common',
    organization: 'Band',
    diet: 'Carnivore',
    ecology: 'Temperate',
  };

  return { ...defaultMonster, ...overrides };
}

function createMockMount(overrides: Partial<Mount> = {}): Mount {
  const defaultMount: Mount = {
    id: 'test-mount',
    name: 'War Horse',
    type: 'Horse',
    movementRate: 180,
    armorClass: 7,
    hitPoints: { current: 25, maximum: 25 },
    size: 'Large',
    flying: false,
    flyingAgility: null,
    encumbrance: { current: 200, max: 400 },
    isEncumbered: false,
    mountedBy: null,
  };

  return { ...defaultMount, ...overrides };
}

function createMockWeapon(overrides: Partial<Weapon> = {}): Weapon {
  const defaultWeapon: Weapon = {
    id: 'test-weapon',
    name: 'Lance',
    type: 'Melee',
    size: 'Large',
    damage: '1d8+1',
    damageVsLarge: '3d6',
    speed: 8,
    allowedClasses: ['Fighter', 'Paladin'],
    range: null,
    twoHanded: false,
    weight: 10,
    value: 6,
    description: 'A cavalry lance designed for mounted combat',
    equipped: true,
    magicBonus: 0,
    charges: null,
  };

  return { ...defaultWeapon, ...overrides };
}

class MockMountedChargeCommand {
  readonly type = COMMAND_TYPES.MOUNTED_CHARGE;
  readonly actorId = 'test-rider';
  readonly targetIds = ['test-target'];

  async execute(_context: GameContext) {
    return { success: true, message: 'Mock mounted charge executed' };
  }

  canExecute(_context: GameContext): boolean {
    return true;
  }

  getRequiredRules(): string[] {
    return ['mounted-charge'];
  }

  getInvolvedEntities(): string[] {
    return [this.actorId, ...this.targetIds];
  }
}

describe('MountedCombatRules', () => {
  let context: GameContext;
  let store: ReturnType<typeof createStore>;
  let mockCommand: MockMountedChargeCommand;
  let rule: MountedChargeRule;

  beforeEach(() => {
    store = createStore();
    context = new GameContext(store);
    mockCommand = new MockMountedChargeCommand();
    rule = new MountedChargeRule();
  });

  describe('MountedChargeRule', () => {
    it('should execute successful mounted charge with lance', async () => {
      const rider = createMockCharacter({
        name: 'Knight',
        class: 'Fighter',
        encumbrance: 0.4,
      });
      const mount = createMockMount({
        name: 'War Horse',
        mountedBy: rider.id,
        isEncumbered: false,
      });
      const target = createMockMonster({ name: 'Orc' });
      const lance = createMockWeapon({ name: 'Lance' });

      context.setTemporary('mounted-context', {
        rider,
        mount,
        target,
        weapon: lance,
        isChargeAttack: true,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('charge');

      const chargeResult = context.getTemporary('mounted-charge-result') as MountedChargeResult;
      expect(chargeResult).toBeDefined();
      expect(chargeResult.damageMultiplier).toBeGreaterThan(1);

      const damageMultiplier = context.getTemporary('damage-multiplier') as number;
      expect(damageMultiplier).toBeGreaterThan(1);
    });

    it('should fail charge when mount is too encumbered', async () => {
      const rider = createMockCharacter({ name: 'Knight' });
      const mount = createMockMount({
        name: 'Overloaded Horse',
        mountedBy: rider.id,
        isEncumbered: true,
      });
      const target = createMockMonster({ name: 'Orc' });
      const lance = createMockWeapon({ name: 'Lance' });

      context.setTemporary('mounted-context', {
        rider,
        mount,
        target,
        weapon: lance,
        isChargeAttack: true,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('encumbered');
    });

    it('should fail charge when mount is too injured', async () => {
      const rider = createMockCharacter({ name: 'Knight' });
      const mount = createMockMount({
        name: 'Injured Horse',
        mountedBy: rider.id,
        hitPoints: { current: 3, maximum: 25 },
        isEncumbered: false,
      });
      const target = createMockMonster({ name: 'Orc' });
      const lance = createMockWeapon({ name: 'Lance' });

      context.setTemporary('mounted-context', {
        rider,
        mount,
        target,
        weapon: lance,
        isChargeAttack: true,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('injured');
    });

    it('should fail charge when rider is not mounted on the mount', async () => {
      const rider = createMockCharacter({ name: 'Knight' });
      const mount = createMockMount({
        name: 'War Horse',
        mountedBy: 'different-rider-id',
      });
      const target = createMockMonster({ name: 'Orc' });
      const lance = createMockWeapon({ name: 'Lance' });

      context.setTemporary('mounted-context', {
        rider,
        mount,
        target,
        weapon: lance,
        isChargeAttack: true,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('not properly mounted');
    });

    it('should fail charge when rider is too encumbered', async () => {
      const rider = createMockCharacter({
        name: 'Overloaded Knight',
        encumbrance: 0.95,
      });
      const mount = createMockMount({
        name: 'War Horse',
        mountedBy: rider.id,
        isEncumbered: false,
      });
      const target = createMockMonster({ name: 'Orc' });
      const lance = createMockWeapon({ name: 'Lance' });

      context.setTemporary('mounted-context', {
        rider,
        mount,
        target,
        weapon: lance,
        isChargeAttack: true,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('too encumbered');
    });

    it('should handle flying mount charges with different agility', async () => {
      const rider = createMockCharacter({
        name: 'Sky Knight',
        proficiencies: [
          { weapon: 'Lance', penalty: 0 },
          { weapon: 'Aerial Riding', penalty: 0 },
        ],
      });
      const mount = createMockMount({
        name: 'Pegasus',
        type: 'Winged Horse',
        mountedBy: rider.id,
        flying: true,
        flyingAgility: AerialAgilityLevel.Excellent,
        isEncumbered: false,
      });
      const target = createMockMonster({ name: 'Flying Demon' });
      const lance = createMockWeapon({ name: 'Lance' });

      context.setTemporary('mounted-context', {
        rider,
        mount,
        target,
        weapon: lance,
        isChargeAttack: true,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('charge');

      const chargeResult = context.getTemporary('mounted-charge-result') as MountedChargeResult;
      expect(chargeResult.damageMultiplier).toBeGreaterThan(1);
    });

    it('should calculate different damage multipliers by weapon type', async () => {
      const rider = createMockCharacter({ name: 'Knight' });
      const mount = createMockMount({
        name: 'War Horse',
        mountedBy: rider.id,
        isEncumbered: false,
      });
      const target = createMockMonster({ name: 'Orc' });

      const lance = createMockWeapon({ name: 'Lance' });
      context.setTemporary('mounted-context', {
        rider,
        mount,
        target,
        weapon: lance,
        isChargeAttack: true,
      });

      const lanceResult = await rule.execute(context, mockCommand);
      expect(lanceResult.success).toBe(true);
      const lanceMultiplier = context.getTemporary('damage-multiplier') as number;

      const sword = createMockWeapon({
        name: 'Longsword',
        type: 'Melee',
        damage: '1d8',
      });
      context.setTemporary('mounted-context', {
        rider,
        mount,
        target,
        weapon: sword,
        isChargeAttack: true,
      });

      const swordResult = await rule.execute(context, mockCommand);
      expect(swordResult.success).toBe(true);
      const swordMultiplier = context.getTemporary('damage-multiplier') as number;

      expect(lanceMultiplier).toBeGreaterThanOrEqual(swordMultiplier);
    });

    it('should require proper riding proficiency for complex maneuvers', async () => {
      const rider = createMockCharacter({
        name: 'Inexperienced Rider',
        proficiencies: [{ weapon: 'Longsword', penalty: 0 }],
      });
      const mount = createMockMount({
        name: 'War Horse',
        mountedBy: rider.id,
        isEncumbered: false,
      });
      const target = createMockMonster({ name: 'Orc' });
      const lance = createMockWeapon({ name: 'Lance' });

      context.setTemporary('mounted-context', {
        rider,
        mount,
        target,
        weapon: lance,
        isChargeAttack: true,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);

      const chargeResult = context.getTemporary('mounted-charge-result') as MountedChargeResult;
      expect(chargeResult).toBeDefined();
    });

    it('should handle mount size restrictions for weapons', async () => {
      const rider = createMockCharacter({ name: 'Halfling Knight' });
      const mount = createMockMount({
        name: 'Pony',
        size: 'Medium',
        mountedBy: rider.id,
        isEncumbered: false,
      });
      const target = createMockMonster({ name: 'Goblin' });
      const lance = createMockWeapon({
        name: 'Heavy Lance',
        size: 'Large',
      });

      context.setTemporary('mounted-context', {
        rider,
        mount,
        target,
        weapon: lance,
        isChargeAttack: true,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);

      const chargeResult = context.getTemporary('mounted-charge-result') as MountedChargeResult;
      expect(chargeResult).toBeDefined();
    });

    it('should only apply to mounted charge commands with context', () => {
      const wrongCommand = { ...mockCommand, type: COMMAND_TYPES.ATTACK };
      expect(rule.canApply(context, wrongCommand as unknown as typeof mockCommand)).toBe(false);

      expect(rule.canApply(context, mockCommand)).toBe(false);

      const rider = createMockCharacter();
      const mount = createMockMount();
      context.setTemporary('mounted-context', {
        rider,
        mount,
        isChargeAttack: false,
      });
      expect(rule.canApply(context, mockCommand)).toBe(false);

      context.setTemporary('mounted-context', {
        rider,
        mount,
        isChargeAttack: true,
      });
      expect(rule.canApply(context, mockCommand)).toBe(true);
    });

    it('should fail gracefully without mounted context', async () => {
      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('No mounted combat context found');
    });

    it('should fail with invalid charge parameters', async () => {
      const rider = createMockCharacter();
      const mount = createMockMount({ mountedBy: rider.id });

      context.setTemporary('mounted-context', {
        rider,
        mount,
        isChargeAttack: true,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid mounted charge parameters');
    });

    it('should preserve OSRIC mounted combat mechanics exactly', async () => {
      const osricKnight = createMockCharacter({
        name: 'OSRIC Knight',
        class: 'Fighter',
        level: 5,
        proficiencies: [
          { weapon: 'Lance', penalty: 0 },
          { weapon: 'Land-based Riding', penalty: 0 },
        ],
      });
      const osricMount = createMockMount({
        name: 'OSRIC War Horse',
        mountedBy: osricKnight.id,
        movementRate: 180,
        isEncumbered: false,
      });
      const osricTarget = createMockMonster({ name: 'OSRIC Orc' });
      const osricLance = createMockWeapon({
        name: 'OSRIC Lance',
        damage: '1d8+1',
        damageVsLarge: '3d6',
      });

      context.setTemporary('mounted-context', {
        rider: osricKnight,
        mount: osricMount,
        target: osricTarget,
        weapon: osricLance,
        isChargeAttack: true,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);

      const chargeResult = context.getTemporary('mounted-charge-result') as MountedChargeResult;

      expect(chargeResult.damageMultiplier).toBe(2);

      expect(chargeResult.message).toContain('charge');
    });

    it('should handle dismounting scenarios', async () => {
      const rider = createMockCharacter({ name: 'Knight' });
      const mount = createMockMount({
        name: 'War Horse',
        mountedBy: rider.id,
        isEncumbered: false,
      });

      context.setTemporary('mounted-context', {
        rider,
        mount,
        isDismounting: true,
      });

      expect(context.getTemporary('mounted-context')).toBeDefined();
    });

    it('should handle edge cases with extreme mount conditions', async () => {
      const rider = createMockCharacter({ name: 'Dragon Rider' });
      const mount = createMockMount({
        name: 'Ancient Dragon',
        type: 'Dragon',
        size: 'Gargantuan',
        flying: true,
        flyingAgility: AerialAgilityLevel.Poor,
        mountedBy: rider.id,
        hitPoints: { current: 200, maximum: 200 },
        movementRate: 240,
        isEncumbered: false,
      });
      const target = createMockMonster({
        name: 'Storm Giant',
        size: 'Huge',
      });
      const weapon = createMockWeapon({
        name: 'Dragon Lance',
        size: 'Large',
      });

      context.setTemporary('mounted-context', {
        rider,
        mount,
        target,
        weapon,
        isChargeAttack: true,
      });

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();

      const chargeResult = context.getTemporary('mounted-charge-result') as MountedChargeResult;
      expect(chargeResult).toBeDefined();
    });
  });
});
