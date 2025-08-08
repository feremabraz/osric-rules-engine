import type { Command } from '@osric/core/Command';
import { GameContext } from '@osric/core/GameContext';
import {
  type SpecialAbility,
  type SpecialAbilityContext,
  SpecialAbilityRules,
} from '@osric/rules/npc/SpecialAbilityRules';
import { COMMAND_TYPES } from '@osric/types/constants';
import { createStore } from 'jotai';
import { beforeEach, describe, expect, it } from 'vitest';

interface SpecialAbilityResult {
  abilities: SpecialAbility[];
  abilityDescriptions: string[];
}

describe('SpecialAbilityRules', () => {
  let rule: SpecialAbilityRules;
  let context: GameContext;
  let mockCommand: Command;

  beforeEach(() => {
    const store = createStore();
    context = new GameContext(store);
    rule = new SpecialAbilityRules();

    context.setTemporary('specialAbilityContext', {
      monsterType: 'Orc',
      hitDice: 1,
      size: 'Medium',
      alignment: 'Chaotic Evil',
      intelligence: 8,
      environment: 'forest',
    } as SpecialAbilityContext);

    mockCommand = {
      type: COMMAND_TYPES.MONSTER_GENERATION,
      actorId: 'test-monster',
      targetIds: [],
      async execute() {
        return { success: true, message: 'Mock' };
      },
      canExecute: () => true,
      getRequiredRules: () => ['special-abilities'],
      getInvolvedEntities: () => ['test-monster'],
    } as Command;
  });

  describe('canApply', () => {
    it('should apply when command type is MONSTER_GENERATION', () => {
      expect(rule.canApply(context, mockCommand)).toBe(true);
    });

    it('should not apply with wrong command type', () => {
      const wrongCommand = { ...mockCommand, type: COMMAND_TYPES.ATTACK };
      expect(rule.canApply(context, wrongCommand)).toBe(false);
    });
  });

  describe('execute - Success Scenarios', () => {
    it('should execute successfully with valid data', async () => {
      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toBeDefined();
      expect(result.data).toBeDefined();

      if (result.data) {
        const data = result.data as unknown as SpecialAbilityResult;
        expect(data.abilities).toBeDefined();
        expect(Array.isArray(data.abilities)).toBe(true);
        expect(data.abilityDescriptions).toBeDefined();
      }
    });

    it('should generate abilities for low-tier monsters', async () => {
      context.setTemporary('specialAbilityContext', {
        monsterType: 'Goblin',
        hitDice: 1,
        size: 'Small',
        alignment: 'Neutral Evil',
        intelligence: 6,
        environment: 'underground',
      } as SpecialAbilityContext);

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      if (result.data) {
        const data = result.data as unknown as SpecialAbilityResult;
        expect(data.abilities.length).toBeGreaterThan(0);
        expect(data.abilities.some((a) => a.type === 'resistance')).toBe(true);
        expect(result.message).toContain('Generated');
        expect(result.message).toContain('Goblin');
      }
    });

    it('should generate abilities for mid-tier monsters', async () => {
      context.setTemporary('specialAbilityContext', {
        monsterType: 'Owlbear',
        hitDice: 5,
        size: 'Large',
        alignment: 'Neutral',
        intelligence: 10,
        environment: 'forest',
      } as SpecialAbilityContext);

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      if (result.data) {
        const data = result.data as unknown as SpecialAbilityResult;
        expect(data.abilities.length).toBeGreaterThan(0);
        expect(
          data.abilities.some((a) => a.type === 'breath-weapon' || a.type === 'special-attack')
        ).toBe(true);
      }
    });

    it('should generate abilities for high-tier monsters', async () => {
      context.setTemporary('specialAbilityContext', {
        monsterType: 'Ancient Dragon',
        hitDice: 15,
        size: 'Huge',
        alignment: 'Chaotic Evil',
        intelligence: 18,
        environment: 'mountain',
      } as SpecialAbilityContext);

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      if (result.data) {
        const data = result.data as unknown as SpecialAbilityResult;
        expect(data.abilities.length).toBeGreaterThan(0);
        expect(data.abilities.some((a) => a.type === 'breath-weapon')).toBe(true);
        expect(data.abilities.some((a) => a.type === 'spell-like')).toBe(true);
        expect(data.abilities.some((a) => a.type === 'gaze-attack')).toBe(true);
      }
    });

    it('should generate type-specific abilities for undead', async () => {
      context.setTemporary('specialAbilityContext', {
        monsterType: 'Undead Wraith',
        hitDice: 5,
        size: 'Medium',
        alignment: 'Chaotic Evil',
        intelligence: 14,
        environment: 'ruins',
      } as SpecialAbilityContext);

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      if (result.data) {
        const data = result.data as unknown as SpecialAbilityResult;

        expect(data.abilities.length).toBeGreaterThan(0);

        expect(
          data.abilities.some((a) => a.type === 'immunity' || a.type === 'special-attack')
        ).toBe(true);
      }
    });

    it('should generate type-specific abilities for dragons', async () => {
      context.setTemporary('specialAbilityContext', {
        monsterType: 'Red Dragon',
        hitDice: 10,
        size: 'Large',
        alignment: 'Chaotic Evil',
        intelligence: 16,
        environment: 'mountain',
      } as SpecialAbilityContext);

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      if (result.data) {
        const data = result.data as unknown as SpecialAbilityResult;
        expect(data.abilities.some((a) => a.name === 'Dragon Breath')).toBe(true);
        expect(data.abilities.some((a) => a.name === 'Spell Use')).toBe(true);
      }
    });

    it('should generate environment-specific abilities', async () => {
      context.setTemporary('specialAbilityContext', {
        monsterType: 'Frost Giant',
        hitDice: 8,
        size: 'Large',
        alignment: 'Chaotic Evil',
        intelligence: 12,
        environment: 'arctic',
      } as SpecialAbilityContext);

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      if (result.data) {
        const data = result.data as unknown as SpecialAbilityResult;
        expect(data.abilities.some((a) => a.name === 'Cold Immunity')).toBe(true);
      }
    });
  });

  describe('execute - Error Scenarios', () => {
    it('should handle missing context data', async () => {
      context.setTemporary('specialAbilityContext', null);

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('No special ability context provided');
    });

    it('should handle invalid monster data gracefully', async () => {
      context.setTemporary('specialAbilityContext', {
        monsterType: '',
        hitDice: -1,
        size: 'Invalid',
        alignment: '',
        intelligence: -5,
        environment: '',
      } as SpecialAbilityContext);

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      if (result.data) {
        const data = result.data as unknown as SpecialAbilityResult;
        expect(data.abilities).toBeDefined();
        expect(Array.isArray(data.abilities)).toBe(true);
      }
    });

    it('should limit number of abilities appropriately', async () => {
      context.setTemporary('specialAbilityContext', {
        monsterType: 'Tarrasque',
        hitDice: 35,
        size: 'Gargantuan',
        alignment: 'Chaotic Evil',
        intelligence: 20,
        environment: 'any',
      } as SpecialAbilityContext);

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      if (result.data) {
        const data = result.data as unknown as SpecialAbilityResult;

        expect(data.abilities.length).toBeLessThanOrEqual(6);
      }
    });
  });

  describe('OSRIC Compliance', () => {
    it('should implement authentic OSRIC/AD&D 1st Edition mechanics', async () => {
      context.setTemporary('specialAbilityContext', {
        monsterType: 'Hill Giant',
        hitDice: 8,
        size: 'Large',
        alignment: 'Chaotic Evil',
        intelligence: 6,
        environment: 'hills',
      } as SpecialAbilityContext);

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      if (result.data) {
        const data = result.data as unknown as SpecialAbilityResult;

        expect(
          data.abilities.some((a) => a.type === 'breath-weapon' || a.type === 'special-attack')
        ).toBe(true);

        expect(
          data.abilities.some((a) => a.type === 'special-attack' || a.type === 'breath-weapon')
        ).toBe(true);

        expect(data.abilities.some((a) => a.name.includes('Aura'))).toBe(true);

        expect(data.abilities.length).toBeGreaterThan(2);
        expect(data.abilities.length).toBeLessThanOrEqual(5);
      }
    });

    it('should handle demon/devil OSRIC mechanics', async () => {
      context.setTemporary('specialAbilityContext', {
        monsterType: 'Demon Balrog',
        hitDice: 12,
        size: 'Large',
        alignment: 'Chaotic Evil',
        intelligence: 18,
        environment: 'abyss',
      } as SpecialAbilityContext);

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      if (result.data) {
        const data = result.data as unknown as SpecialAbilityResult;

        expect(data.abilities.some((a) => a.name === 'Magic Resistance')).toBe(true);

        expect(data.abilities.some((a) => a.name === 'Teleport')).toBe(true);

        expect(data.abilities.some((a) => a.name === 'Tactical Genius')).toBe(true);
      }
    });

    it('should handle elemental OSRIC mechanics', async () => {
      context.setTemporary('specialAbilityContext', {
        monsterType: 'Fire Elemental',
        hitDice: 8,
        size: 'Large',
        alignment: 'Neutral',
        intelligence: 8,
        environment: 'elemental plane',
      } as SpecialAbilityContext);

      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      if (result.data) {
        const data = result.data as unknown as SpecialAbilityResult;

        expect(data.abilities.some((a) => a.name === 'Elemental Immunity')).toBe(true);
        expect(data.abilities.some((a) => a.description.includes('non-magical weapons'))).toBe(
          true
        );
      }
    });

    it('should follow OSRIC Hit Dice progression for abilities', async () => {
      const lowHD = {
        monsterType: 'Kobold',
        hitDice: 1,
        size: 'Small',
        alignment: 'Lawful Evil',
        intelligence: 8,
        environment: 'underground',
      };
      const midHD = {
        monsterType: 'Troll',
        hitDice: 6,
        size: 'Large',
        alignment: 'Chaotic Evil',
        intelligence: 9,
        environment: 'any',
      };
      const highHD = {
        monsterType: 'Lich',
        hitDice: 11,
        size: 'Medium',
        alignment: 'Chaotic Evil',
        intelligence: 18,
        environment: 'any',
      };

      context.setTemporary('specialAbilityContext', lowHD as SpecialAbilityContext);
      let result = await rule.execute(context, mockCommand);
      expect(result.success).toBe(true);
      let data = result.data as unknown as SpecialAbilityResult;
      expect(data.abilities.length).toBeLessThanOrEqual(2);

      context.setTemporary('specialAbilityContext', midHD as SpecialAbilityContext);
      result = await rule.execute(context, mockCommand);
      expect(result.success).toBe(true);
      data = result.data as unknown as SpecialAbilityResult;
      expect(data.abilities.length).toBeGreaterThan(2);
      expect(data.abilities.length).toBeLessThanOrEqual(4);

      context.setTemporary('specialAbilityContext', highHD as SpecialAbilityContext);
      result = await rule.execute(context, mockCommand);
      expect(result.success).toBe(true);
      data = result.data as unknown as SpecialAbilityResult;
      expect(data.abilities.length).toBeGreaterThan(4);
    });
  });
});
