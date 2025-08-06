import { GameContext } from '@osric/core/GameContext';
import { ClassRequirementRule } from '@osric/rules/character/ClassRequirementRules';
import type { AbilityScores } from '@osric/types/entities';
import { createStore } from 'jotai';
import { beforeEach, describe, expect, it } from 'vitest';

class MockCharacterCommand {
  readonly type = 'create-character';
  readonly actorId = 'test-actor';
  readonly targetIds: string[] = [];

  async execute(_context: GameContext) {
    return { success: true, message: 'Mock command executed' };
  }

  canExecute(_context: GameContext): boolean {
    return true;
  }

  getRequiredRules(): string[] {
    return ['class-requirements'];
  }

  getInvolvedEntities(): string[] {
    return [this.actorId, ...this.targetIds];
  }
}

describe('ClassRequirementRules', () => {
  let context: GameContext;
  let store: ReturnType<typeof createStore>;
  let mockCommand: MockCharacterCommand;

  beforeEach(() => {
    store = createStore();
    context = new GameContext(store);
    mockCommand = new MockCharacterCommand();
  });

  describe('ClassRequirementRule', () => {
    it('should validate fighter requirements correctly (STR 9+)', async () => {
      context.setTemporary('character-creation', {
        characterClass: 'Fighter',
        race: 'Human',
      });

      context.setTemporary('adjusted-ability-scores', {
        strength: 15,
        dexterity: 12,
        constitution: 14,
        intelligence: 10,
        wisdom: 11,
        charisma: 13,
      });

      const rule = new ClassRequirementRule();
      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('meets requirements for Fighter');
    });

    it('should fail for fighter with insufficient strength', async () => {
      context.setTemporary('character-creation', {
        characterClass: 'Fighter',
        race: 'Human',
      });

      context.setTemporary('adjusted-ability-scores', {
        strength: 8,
        dexterity: 12,
        constitution: 14,
        intelligence: 10,
        wisdom: 11,
        charisma: 13,
      });

      const rule = new ClassRequirementRule();
      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('class requirements');
      expect(result.message).toContain('Fighter');
    });

    it('should validate magic-user requirements (INT 9+, DEX 6+)', async () => {
      context.setTemporary('character-creation', {
        characterClass: 'Magic-User',
        race: 'Human',
      });

      context.setTemporary('adjusted-ability-scores', {
        strength: 10,
        dexterity: 6,
        constitution: 12,
        intelligence: 16,
        wisdom: 11,
        charisma: 13,
      });

      const rule = new ClassRequirementRule();
      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('meets requirements for Magic-User');
    });

    it('should fail for magic-user with insufficient intelligence', async () => {
      context.setTemporary('character-creation', {
        characterClass: 'Magic-User',
        race: 'Human',
      });

      context.setTemporary('adjusted-ability-scores', {
        strength: 10,
        dexterity: 12,
        constitution: 12,
        intelligence: 8,
        wisdom: 11,
        charisma: 13,
      });

      const rule = new ClassRequirementRule();
      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('class requirements');
      expect(result.message).toContain('Magic-User');
    });

    it('should validate cleric requirements (WIS 9+)', async () => {
      context.setTemporary('character-creation', {
        characterClass: 'Cleric',
        race: 'Human',
      });

      context.setTemporary('adjusted-ability-scores', {
        strength: 10,
        dexterity: 12,
        constitution: 12,
        intelligence: 11,
        wisdom: 15,
        charisma: 13,
      });

      const rule = new ClassRequirementRule();
      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('meets requirements for Cleric');
    });

    it('should validate thief requirements (DEX 9+)', async () => {
      context.setTemporary('character-creation', {
        characterClass: 'Thief',
        race: 'Human',
      });

      context.setTemporary('adjusted-ability-scores', {
        strength: 10,
        dexterity: 16,
        constitution: 12,
        intelligence: 11,
        wisdom: 10,
        charisma: 13,
      });

      const rule = new ClassRequirementRule();
      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('meets requirements for Thief');
    });

    it('should fail for paladin without high requirements', async () => {
      context.setTemporary('character-creation', {
        characterClass: 'Paladin',
        race: 'Human',
      });

      context.setTemporary('adjusted-ability-scores', {
        strength: 11,
        dexterity: 12,
        constitution: 8,
        intelligence: 8,
        wisdom: 12,
        charisma: 16,
      });

      const rule = new ClassRequirementRule();
      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(false);
      expect(result.message).toContain('class requirements');
      expect(result.message).toContain('Paladin');
    });

    it('should validate paladin with all high requirements met', async () => {
      context.setTemporary('character-creation', {
        characterClass: 'Paladin',
        race: 'Human',
      });

      context.setTemporary('adjusted-ability-scores', {
        strength: 12,
        dexterity: 12,
        constitution: 9,
        intelligence: 9,
        wisdom: 13,
        charisma: 17,
      });

      const rule = new ClassRequirementRule();
      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('meets requirements for Paladin');
    });

    it('should validate ranger requirements (STR 13+, INT 13+, WIS 14+, CON 14+)', async () => {
      context.setTemporary('character-creation', {
        characterClass: 'Ranger',
        race: 'Human',
      });

      context.setTemporary('adjusted-ability-scores', {
        strength: 13,
        dexterity: 12,
        constitution: 14,
        intelligence: 13,
        wisdom: 14,
        charisma: 10,
      });

      const rule = new ClassRequirementRule();
      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('meets requirements for Ranger');
    });

    it('should validate druid requirements (WIS 12+, CHA 15+)', async () => {
      context.setTemporary('character-creation', {
        characterClass: 'Druid',
        race: 'Human',
      });

      context.setTemporary('adjusted-ability-scores', {
        strength: 10,
        dexterity: 12,
        constitution: 12,
        intelligence: 11,
        wisdom: 12,
        charisma: 15,
      });

      const rule = new ClassRequirementRule();
      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('meets requirements for Druid');
    });

    it('should validate assassin requirements (STR 12+, INT 11+, DEX 12+)', async () => {
      context.setTemporary('character-creation', {
        characterClass: 'Assassin',
        race: 'Human',
      });

      context.setTemporary('adjusted-ability-scores', {
        strength: 12,
        dexterity: 12,
        constitution: 12,
        intelligence: 11,
        wisdom: 10,
        charisma: 10,
      });

      const rule = new ClassRequirementRule();
      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('meets requirements for Assassin');
    });

    it('should validate illusionist requirements (DEX 16+, INT 15+)', async () => {
      context.setTemporary('character-creation', {
        characterClass: 'Illusionist',
        race: 'Human',
      });

      context.setTemporary('adjusted-ability-scores', {
        strength: 10,
        dexterity: 16,
        constitution: 12,
        intelligence: 15,
        wisdom: 10,
        charisma: 10,
      });

      const rule = new ClassRequirementRule();
      const result = await rule.execute(context, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toContain('meets requirements for Illusionist');
    });

    it('should validate all OSRIC class requirements exist', () => {
      const rule = new ClassRequirementRule();

      const characterClasses = [
        'Fighter',
        'Cleric',
        'Magic-User',
        'Thief',
        'Assassin',
        'Druid',
        'Illusionist',
        'Paladin',
        'Ranger',
      ];

      for (const characterClass of characterClasses) {
        context.setTemporary('character-creation', {
          characterClass,
          race: 'Human',
        });

        context.setTemporary('adjusted-ability-scores', {
          strength: 15,
          dexterity: 15,
          constitution: 15,
          intelligence: 15,
          wisdom: 15,
          charisma: 15,
        });

        expect(rule.canApply(context, mockCommand)).toBe(true);
      }
    });

    it('should only apply to create-character commands with class and adjusted scores', async () => {
      const rule = new ClassRequirementRule();

      const wrongCommand = { ...mockCommand, type: 'attack' };
      expect(rule.canApply(context, wrongCommand as unknown as typeof mockCommand)).toBe(false);

      expect(rule.canApply(context, mockCommand)).toBe(false);

      context.setTemporary('character-creation', { characterClass: 'Fighter' });
      expect(rule.canApply(context, mockCommand)).toBe(false);

      context.setTemporary('adjusted-ability-scores', {
        strength: 15,
        dexterity: 15,
        constitution: 15,
        intelligence: 15,
        wisdom: 15,
        charisma: 15,
      });
      expect(rule.canApply(context, mockCommand)).toBe(true);
    });
  });
});
