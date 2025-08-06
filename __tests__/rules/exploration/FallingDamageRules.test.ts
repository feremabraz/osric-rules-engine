import { createStore } from 'jotai';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Command, CommandResult } from '../../../osric/core/Command';
import { GameContext } from '../../../osric/core/GameContext';
import { FallingDamageRule } from '../../../osric/rules/exploration/FallingDamageRules';
import { COMMAND_TYPES, RULE_NAMES } from '../../../osric/types/constants';
import type { AbilityScoreModifiers, Character } from '../../../osric/types/entities';

interface FallingDamageParams {
  characterId: string;
  fallDistance: number;
  surfaceType?: 'soft' | 'normal' | 'hard' | 'spikes';
  circumstances?: {
    intentional?: boolean;
    hasFeatherFall?: boolean;
    encumbrance?: 'light' | 'moderate' | 'heavy' | 'severe';
    dexterityCheck?: boolean;
  };
  savingThrow?: boolean;
  description?: string;
}

interface FallingDamageRuleData {
  characterId: string;
  fallDistance: number;
  baseDamageRange: {
    min: number;
    max: number;
    average: number;
  };
  expectedDamage: number;
  surfaceModifier: number;
  modifiers: Array<{
    source: string;
    effect: string;
    description: string;
  }>;
  specialRules: string[];
  canSurvive: boolean;
  deathSaveRequired: boolean;
  immunities: string[];
}

class MockCommand implements Command {
  constructor(
    public type: string,
    public params: Record<string, unknown> = {}
  ) {}

  async execute(_context: GameContext): Promise<CommandResult> {
    return { success: true, message: 'Mock command executed' };
  }

  canExecute(_context: GameContext): boolean {
    return true;
  }

  getRequiredRules(): string[] {
    return [];
  }

  getInvolvedEntities(): string[] {
    return [];
  }
}

function createMockCharacter(overrides: Partial<Character> = {}): Character {
  const defaultModifiers: AbilityScoreModifiers = {
    strengthHitAdj: 0,
    strengthDamageAdj: 0,
    strengthEncumbrance: 0,
    strengthOpenDoors: 0,
    strengthBendBars: 0,
    dexterityReaction: 0,
    dexterityMissile: 0,
    dexterityDefense: 0,
    dexterityPickPockets: 0,
    dexterityOpenLocks: 0,
    dexterityFindTraps: 0,
    dexterityMoveSilently: 0,
    dexterityHideInShadows: 0,
    constitutionHitPoints: 0,
    constitutionSystemShock: 0,
    constitutionResurrectionSurvival: 0,
    constitutionPoisonSave: 0,
    intelligenceLanguages: 0,
    intelligenceLearnSpells: 0,
    intelligenceMaxSpellLevel: 0,
    intelligenceIllusionImmunity: false,
    wisdomMentalSave: 0,
    wisdomBonusSpells: null,
    wisdomSpellFailure: 0,
    charismaReactionAdj: 0,
    charismaLoyaltyBase: 0,
    charismaMaxHenchmen: 0,
  };

  return {
    id: 'test-character',
    name: 'Test Adventurer',
    class: 'Fighter',
    level: 5,
    hitPoints: { current: 40, maximum: 40 },
    abilities: {
      strength: 15,
      dexterity: 14,
      constitution: 16,
      intelligence: 12,
      wisdom: 13,
      charisma: 11,
    },
    armorClass: 5,
    thac0: 16,
    race: 'Human',
    alignment: 'Neutral Good',
    experience: { current: 16000, requiredForNextLevel: 32000, level: 5 },
    currency: { platinum: 0, gold: 100, electrum: 0, silver: 50, copper: 25 },
    spells: [],
    savingThrows: {
      'Poison or Death': 12,
      Wands: 13,
      'Paralysis, Polymorph, or Petrification': 14,
      'Breath Weapons': 15,
      'Spells, Rods, or Staves': 16,
    },
    abilityModifiers: defaultModifiers,
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
    proficiencies: [],
    secondarySkills: [],
    inventory: [],
    position: 'adventure',
    statusEffects: [],
    ...overrides,
  };
}

function createFallingDamageParams(
  overrides: Partial<FallingDamageParams> = {}
): FallingDamageParams {
  return {
    characterId: 'test-character',
    fallDistance: 30,
    surfaceType: 'normal',
    circumstances: {
      intentional: false,
      hasFeatherFall: false,
      encumbrance: 'light',
      dexterityCheck: false,
    },
    savingThrow: false,
    description: 'Character falls down a pit',
    ...overrides,
  };
}

describe('FallingDamageRule', () => {
  let context: GameContext;
  let rule: FallingDamageRule;
  let character: Character;
  let command: MockCommand;

  beforeEach(() => {
    const store = createStore();
    context = new GameContext(store);
    rule = new FallingDamageRule();
    character = createMockCharacter();
    command = new MockCommand(COMMAND_TYPES.FALLING_DAMAGE);

    context.setEntity(character.id, character);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rule Properties', () => {
    it('should have correct rule name and description', () => {
      expect(rule.name).toBe(RULE_NAMES.FALLING_DAMAGE);
      expect(rule.priority).toBe(500);
    });
  });

  describe('Rule Application', () => {
    it('should apply to falling damage commands', () => {
      expect(rule.canApply(context, command)).toBe(true);
    });

    it('should not apply to other command types', () => {
      const otherCommand = new MockCommand('other-command');
      expect(rule.canApply(context, otherCommand)).toBe(false);
    });
  });

  describe('Basic Falling Damage Calculation', () => {
    it('should return no damage for falls under 10 feet', async () => {
      const params = createFallingDamageParams({ fallDistance: 5 });
      context.setTemporary('falling-damage-params', params);

      const result = await rule.execute(context, command);

      expect(result.success).toBe(true);
      expect((result.data as unknown as FallingDamageRuleData)?.expectedDamage).toBe(0);
    });

    it('should calculate damage for 10-foot fall (1d6)', async () => {
      const params = createFallingDamageParams({ fallDistance: 10 });
      context.setTemporary('falling-damage-params', params);

      const result = await rule.execute(context, command);

      expect(result.success).toBe(true);
      const data = result.data as unknown as FallingDamageRuleData;
      expect(data.baseDamageRange.min).toBe(1);
      expect(data.baseDamageRange.max).toBe(6);
      expect(data.baseDamageRange.average).toBe(3.5);
    });

    it('should calculate damage for 30-foot fall (3d6)', async () => {
      const params = createFallingDamageParams({ fallDistance: 30 });
      context.setTemporary('falling-damage-params', params);

      const result = await rule.execute(context, command);

      expect(result.success).toBe(true);
      const data = result.data as unknown as FallingDamageRuleData;
      expect(data.baseDamageRange.min).toBe(3);
      expect(data.baseDamageRange.max).toBe(18);
      expect(data.baseDamageRange.average).toBe(10.5);
    });

    it('should calculate damage for 100-foot fall (10d6)', async () => {
      const params = createFallingDamageParams({ fallDistance: 100 });
      context.setTemporary('falling-damage-params', params);

      const result = await rule.execute(context, command);

      expect(result.success).toBe(true);
      const data = result.data as unknown as FallingDamageRuleData;
      expect(data.baseDamageRange.min).toBe(10);
      expect(data.baseDamageRange.max).toBe(60);
      expect(data.baseDamageRange.average).toBe(35);
    });

    it('should cap damage at 20d6 for terminal velocity (200+ feet)', async () => {
      character = createMockCharacter({
        level: 15,
        experience: { current: 300000, requiredForNextLevel: 750000, level: 15 },
        hitPoints: { current: 120, maximum: 120 },
      });
      context.setEntity(character.id, character);

      const params = createFallingDamageParams({ fallDistance: 300 });
      context.setTemporary('falling-damage-params', params);

      const result = await rule.execute(context, command);

      expect(result.success).toBe(true);
      const data = result.data as unknown as FallingDamageRuleData;
      expect(data.baseDamageRange.min).toBe(20);
      expect(data.baseDamageRange.max).toBe(120);
      expect(data.baseDamageRange.average).toBe(70);
      expect(data.modifiers.some((m) => m.source === 'terminal-velocity')).toBe(true);
    });
  });

  describe('Surface Type Modifiers', () => {
    it('should halve damage for soft surfaces', async () => {
      const params = createFallingDamageParams({
        fallDistance: 20,
        surfaceType: 'soft',
      });
      context.setTemporary('falling-damage-params', params);

      const result = await rule.execute(context, command);

      expect(result.success).toBe(true);
      const data = result.data as unknown as FallingDamageRuleData;
      expect(data.surfaceModifier).toBe(0.5);
      expect(data.expectedDamage).toBe(3);
    });

    it('should apply normal damage for normal surfaces', async () => {
      const params = createFallingDamageParams({
        fallDistance: 20,
        surfaceType: 'normal',
      });
      context.setTemporary('falling-damage-params', params);

      const result = await rule.execute(context, command);

      expect(result.success).toBe(true);
      const data = result.data as unknown as FallingDamageRuleData;
      expect(data.surfaceModifier).toBe(1.0);
      expect(data.expectedDamage).toBe(7);
    });

    it('should increase damage for hard surfaces', async () => {
      const params = createFallingDamageParams({
        fallDistance: 20,
        surfaceType: 'hard',
      });
      context.setTemporary('falling-damage-params', params);

      const result = await rule.execute(context, command);

      expect(result.success).toBe(true);
      const data = result.data as unknown as FallingDamageRuleData;
      expect(data.surfaceModifier).toBe(1.5);
      expect(data.expectedDamage).toBe(10);
    });

    it('should double damage for spikes', async () => {
      const params = createFallingDamageParams({
        fallDistance: 20,
        surfaceType: 'spikes',
      });
      context.setTemporary('falling-damage-params', params);

      const result = await rule.execute(context, command);

      expect(result.success).toBe(true);
      const data = result.data as unknown as FallingDamageRuleData;
      expect(data.surfaceModifier).toBe(2.0);
      expect(data.expectedDamage).toBe(14);
    });
  });

  describe('Character Class Abilities', () => {
    it('should provide monk immunity for level 4+ monks', async () => {
      character = createMockCharacter({
        class: 'Monk',
        level: 4,
        experience: { current: 6000, requiredForNextLevel: 13000, level: 4 },
      });
      context.setEntity(character.id, character);

      const params = createFallingDamageParams({ fallDistance: 30 });
      context.setTemporary('falling-damage-params', params);

      const result = await rule.execute(context, command);

      expect(result.success).toBe(true);
      const data = result.data as unknown as FallingDamageRuleData;
      expect(data.immunities.some((i: string) => i.includes('Monks can slow falls'))).toBe(true);
    });

    it('should provide thief damage reduction for short falls', async () => {
      character = createMockCharacter({ class: 'Thief' });
      context.setEntity(character.id, character);

      const params = createFallingDamageParams({ fallDistance: 10 });
      context.setTemporary('falling-damage-params', params);

      const result = await rule.execute(context, command);

      expect(result.success).toBe(true);
      const data = result.data as unknown as FallingDamageRuleData;
      expect(data.immunities.some((i: string) => i.includes('Thieves are trained'))).toBe(true);
    });

    it('should provide halfling agility for falls under 20 feet', async () => {
      character = createMockCharacter({ race: 'Halfling' });
      context.setEntity(character.id, character);

      const params = createFallingDamageParams({ fallDistance: 15 });
      context.setTemporary('falling-damage-params', params);

      const result = await rule.execute(context, command);

      expect(result.success).toBe(true);
      const data = result.data as unknown as FallingDamageRuleData;
      expect(data.immunities.some((i: string) => i.includes('Halflings are naturally agile'))).toBe(
        true
      );
    });
  });

  describe('Circumstantial Modifiers', () => {
    it('should reduce damage for intentional jumps up to 30 feet', async () => {
      const params = createFallingDamageParams({
        fallDistance: 20,
        circumstances: {
          intentional: true,
          hasFeatherFall: false,
          encumbrance: 'light',
          dexterityCheck: false,
        },
      });
      context.setTemporary('falling-damage-params', params);

      const result = await rule.execute(context, command);

      expect(result.success).toBe(true);
      const data = result.data as unknown as FallingDamageRuleData;
      expect(
        data.modifiers.some(
          (m: FallingDamageRuleData['modifiers'][0]) => m.source === 'intentional-jump'
        )
      ).toBe(true);
      expect(
        data.modifiers.some((m: FallingDamageRuleData['modifiers'][0]) => m.effect === '-2 damage')
      ).toBe(true);
    });

    it('should not reduce damage for intentional jumps over 30 feet', async () => {
      const params = createFallingDamageParams({
        fallDistance: 40,
        circumstances: {
          intentional: true,
          hasFeatherFall: false,
          encumbrance: 'light',
          dexterityCheck: false,
        },
      });
      context.setTemporary('falling-damage-params', params);

      const result = await rule.execute(context, command);

      expect(result.success).toBe(true);
      const data = result.data as unknown as FallingDamageRuleData;
      expect(
        data.modifiers.some(
          (m: FallingDamageRuleData['modifiers'][0]) => m.source === 'intentional-jump'
        )
      ).toBe(false);
    });

    it('should increase damage for heavy encumbrance', async () => {
      const params = createFallingDamageParams({
        fallDistance: 20,
        circumstances: {
          intentional: false,
          hasFeatherFall: false,
          encumbrance: 'heavy',
          dexterityCheck: false,
        },
      });
      context.setTemporary('falling-damage-params', params);

      const result = await rule.execute(context, command);

      expect(result.success).toBe(true);
      const data = result.data as unknown as FallingDamageRuleData;
      expect(
        data.modifiers.some(
          (m: FallingDamageRuleData['modifiers'][0]) => m.source === 'encumbrance'
        )
      ).toBe(true);
      expect(
        data.modifiers.some((m: FallingDamageRuleData['modifiers'][0]) => m.effect === '+2 damage')
      ).toBe(true);
    });

    it('should apply dexterity check modifier for high dexterity', async () => {
      character = createMockCharacter({ abilities: { ...character.abilities, dexterity: 18 } });
      context.setEntity(character.id, character);

      const params = createFallingDamageParams({
        fallDistance: 20,
        circumstances: {
          intentional: false,
          hasFeatherFall: false,
          encumbrance: 'light',
          dexterityCheck: true,
        },
      });
      context.setTemporary('falling-damage-params', params);

      const result = await rule.execute(context, command);

      expect(result.success).toBe(true);
      const data = result.data as unknown as FallingDamageRuleData;
      expect(
        data.modifiers.some(
          (m: FallingDamageRuleData['modifiers'][0]) => m.source === 'dexterity-check'
        )
      ).toBe(true);
      expect(
        data.modifiers.some((m: FallingDamageRuleData['modifiers'][0]) =>
          m.effect.includes('90% chance')
        )
      ).toBe(true);
    });

    it('should negate all damage with Feather Fall', async () => {
      const params = createFallingDamageParams({
        fallDistance: 100,
        circumstances: {
          intentional: false,
          hasFeatherFall: true,
          encumbrance: 'light',
          dexterityCheck: false,
        },
      });
      context.setTemporary('falling-damage-params', params);

      const result = await rule.execute(context, command);

      expect(result.success).toBe(true);
      const data = result.data as unknown as FallingDamageRuleData;
      expect(data.immunities.some((i: string) => i.includes('Feather Fall spell negates'))).toBe(
        true
      );
    });
  });

  describe('Death Save and Survivability', () => {
    it('should indicate death save required for lethal damage', async () => {
      character = createMockCharacter({ hitPoints: { current: 10, maximum: 40 } });
      context.setEntity(character.id, character);

      const params = createFallingDamageParams({
        fallDistance: 60,
        savingThrow: true,
      });
      context.setTemporary('falling-damage-params', params);

      const result = await rule.execute(context, command);

      expect(result.success).toBe(true);
      expect(result.data?.deathSaveRequired).toBe(true);
      expect(result.data?.canSurvive).toBe(false);
    });

    it('should prevent extreme falls for low-level characters', async () => {
      character = createMockCharacter({
        level: 2,
        experience: { current: 2000, requiredForNextLevel: 4000, level: 2 },
      });
      context.setEntity(character.id, character);

      const params = createFallingDamageParams({ fallDistance: 250 });
      context.setTemporary('falling-damage-params', params);

      const result = await rule.execute(context, command);

      expect(result.success).toBe(false);
      expect(result.message).toContain('too extreme for character to realistically survive');
    });

    it('should allow extreme falls for high-level characters', async () => {
      character = createMockCharacter({
        level: 15,
        experience: { current: 300000, requiredForNextLevel: 750000, level: 15 },
        hitPoints: { current: 120, maximum: 120 },
      });
      context.setEntity(character.id, character);

      const params = createFallingDamageParams({ fallDistance: 250 });
      context.setTemporary('falling-damage-params', params);

      const result = await rule.execute(context, command);

      expect(result.success).toBe(true);
      expect(result.data?.canSurvive).toBe(true);
    });
  });

  describe('Special Rules and OSRIC Compliance', () => {
    it('should include authentic OSRIC base rules', async () => {
      const params = createFallingDamageParams({ fallDistance: 30 });
      context.setTemporary('falling-damage-params', params);

      const result = await rule.execute(context, command);

      expect(result.success).toBe(true);
      expect(result.data?.specialRules).toContain('1d6 damage per 10 feet fallen');
      expect(result.data?.specialRules).toContain('Maximum 20d6 damage (terminal velocity)');
      expect(result.data?.specialRules).toContain('No damage for falls under 10 feet');
    });

    it('should include surface-specific rules', async () => {
      const params = createFallingDamageParams({ fallDistance: 30 });
      context.setTemporary('falling-damage-params', params);

      const result = await rule.execute(context, command);

      expect(result.success).toBe(true);
      expect(result.data?.specialRules).toContain('Soft surfaces (hay, water) halve damage');
      expect(result.data?.specialRules).toContain('Hard surfaces (spikes) can double damage');
    });

    it('should include death save rules when applicable', async () => {
      const params = createFallingDamageParams({
        fallDistance: 60,
        savingThrow: true,
      });
      context.setTemporary('falling-damage-params', params);

      const result = await rule.execute(context, command);

      expect(result.success).toBe(true);
      expect(result.data?.specialRules).toContain(
        'Death save required if damage equals or exceeds current HP'
      );
      expect(result.data?.specialRules).toContain('Constitution modifier applies to death saves');
    });

    it('should include terminal velocity rules for extreme falls', async () => {
      const params = createFallingDamageParams({ fallDistance: 250 });
      context.setTemporary('falling-damage-params', params);

      character = createMockCharacter({
        level: 15,
        experience: { current: 300000, requiredForNextLevel: 750000, level: 15 },
        hitPoints: { current: 120, maximum: 120 },
      });
      context.setEntity(character.id, character);

      const result = await rule.execute(context, command);

      expect(result.success).toBe(true);
      expect(result.data?.specialRules).toContain(
        'Terminal velocity reached - damage caps at 20d6'
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle missing falling damage parameters', async () => {
      const result = await rule.execute(context, command);

      expect(result.success).toBe(false);
      expect(result.message).toBe('No falling damage data provided');
    });

    it('should handle missing character', async () => {
      const params = createFallingDamageParams({ characterId: 'non-existent' });
      context.setTemporary('falling-damage-params', params);

      const result = await rule.execute(context, command);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Character non-existent not found');
    });

    it('should handle exceptions gracefully', async () => {
      const params = createFallingDamageParams({ fallDistance: -999 });
      context.setTemporary('falling-damage-params', params);

      const result = await rule.execute(context, command);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Falling damage validation complete');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero distance falls', async () => {
      const params = createFallingDamageParams({ fallDistance: 0 });
      context.setTemporary('falling-damage-params', params);

      const result = await rule.execute(context, command);

      expect(result.success).toBe(true);
      expect(result.data?.expectedDamage).toBe(0);
    });

    it('should handle negative distances', async () => {
      const params = createFallingDamageParams({ fallDistance: -10 });
      context.setTemporary('falling-damage-params', params);

      const result = await rule.execute(context, command);

      expect(result.success).toBe(true);

      const data = result.data as unknown as FallingDamageRuleData;
      expect(data.expectedDamage).toBe(-4);
    });

    it('should handle multiple modifiers simultaneously', async () => {
      const params = createFallingDamageParams({
        fallDistance: 25,
        surfaceType: 'hard',
        circumstances: {
          intentional: true,
          hasFeatherFall: false,
          encumbrance: 'heavy',
          dexterityCheck: true,
        },
      });
      context.setTemporary('falling-damage-params', params);

      const result = await rule.execute(context, command);

      expect(result.success).toBe(true);
      const data = result.data as unknown as FallingDamageRuleData;
      expect(data.modifiers.length).toBeGreaterThan(2);
      expect(
        data.modifiers.some((m: FallingDamageRuleData['modifiers'][0]) => m.source === 'surface')
      ).toBe(true);
      expect(
        data.modifiers.some(
          (m: FallingDamageRuleData['modifiers'][0]) => m.source === 'intentional-jump'
        )
      ).toBe(true);
      expect(
        data.modifiers.some(
          (m: FallingDamageRuleData['modifiers'][0]) => m.source === 'encumbrance'
        )
      ).toBe(true);
    });
  });
});
