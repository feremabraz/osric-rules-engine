import { createStore } from 'jotai';
import { beforeEach, describe, expect, it } from 'vitest';
import { BaseCommand, type CommandResult } from '../../osric/core/Command';
import { GameContext } from '../../osric/core/GameContext';

class SimpleTestCommand extends BaseCommand {
  readonly type = 'simple-test';

  constructor(
    public readonly testData: string,
    actorId = 'test-actor',
    targetIds: string[] = []
  ) {
    super(actorId, targetIds);
  }

  async execute(context: GameContext): Promise<CommandResult> {
    context.setTemporary('command-executed', true);
    context.setTemporary('command-data', this.testData);

    return this.createSuccessResult(`Simple command executed with: ${this.testData}`);
  }

  canExecute(context: GameContext): boolean {
    return this.validateEntities(context);
  }

  getRequiredRules(): string[] {
    return ['simple-test-rule'];
  }
}

class EntityRequiredCommand extends BaseCommand {
  readonly type = 'entity-required';

  constructor(actorId: string, targetIds: string[] = []) {
    super(actorId, targetIds);
  }

  async execute(_context: GameContext): Promise<CommandResult> {
    return this.createSuccessResult('Entity command executed');
  }

  canExecute(context: GameContext): boolean {
    return this.validateEntities(context);
  }

  getRequiredRules(): string[] {
    return ['entity-rule'];
  }
}

class FailingCommand extends BaseCommand {
  readonly type = 'failing-command';

  constructor(actorId = 'failing-actor') {
    super(actorId);
  }

  async execute(_context: GameContext): Promise<CommandResult> {
    return this.createFailureResult('This command always fails');
  }

  canExecute(_context: GameContext): boolean {
    return true;
  }

  getRequiredRules(): string[] {
    return ['failing-rule'];
  }
}

class ValidationCommand extends BaseCommand {
  readonly type = 'validation-test';

  constructor(
    actorId: string,
    targetIds: string[] = [],
    public readonly requireTargets = false
  ) {
    super(actorId, targetIds);
  }

  async execute(_context: GameContext): Promise<CommandResult> {
    return this.createSuccessResult('Validation command executed');
  }

  canExecute(context: GameContext): boolean {
    if (!this.validateEntities(context)) {
      return false;
    }

    if (this.requireTargets && this.getInvolvedEntities().length <= 1) {
      return false;
    }

    return true;
  }

  getRequiredRules(): string[] {
    return ['validation-rule'];
  }

  getInvolvedEntities(): string[] {
    return super.getInvolvedEntities();
  }
}

import type {
  AbilityScores,
  Alignment,
  Character as CharacterData,
  Experience,
  SavingThrowType,
} from '../../osric/types/entities';

const createMockCharacter = (id: string, name: string): CharacterData => ({
  id,
  name,
  race: 'Human',
  class: 'Fighter',
  level: 1,
  hitPoints: { current: 8, maximum: 8 },
  armorClass: 10,
  thac0: 20,
  experience: {
    current: 0,
    level: 1,
    requiredForNextLevel: 2000,
  } as Experience,
  alignment: 'Neutral' as Alignment,
  inventory: [],
  position: 'ready',
  statusEffects: [],
  abilities: {
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
  } as AbilityScores,
  abilityModifiers: {
    strengthHitAdj: 0,
    strengthDamageAdj: 0,
    strengthEncumbrance: 0,
    strengthOpenDoors: 0,
    strengthBendBars: 0,
    dexterityReaction: 0,
    dexterityMissile: 0,
    dexterityDefense: 0,
    dexterityPickPockets: null,
    dexterityOpenLocks: null,
    dexterityFindTraps: null,
    dexterityMoveSilently: null,
    dexterityHideInShadows: null,
    constitutionHitPoints: 0,
    constitutionSystemShock: 0,
    constitutionResurrectionSurvival: 0,
    constitutionPoisonSave: 0,
    intelligenceLanguages: 0,
    intelligenceLearnSpells: null,
    intelligenceMaxSpellLevel: null,
    intelligenceIllusionImmunity: false,
    wisdomMentalSave: 0,
    wisdomBonusSpells: null,
    wisdomSpellFailure: 0,
    charismaReactionAdj: 0,
    charismaLoyaltyBase: 0,
    charismaMaxHenchmen: 0,
  },
  savingThrows: {
    'Poison or Death': 14,
    Wands: 16,
    'Paralysis, Polymorph, or Petrification': 15,
    'Breath Weapons': 17,
    'Spells, Rods, or Staves': 17,
  } as Record<SavingThrowType, number>,
  spells: [],
  currency: { copper: 0, silver: 0, electrum: 0, gold: 0, platinum: 0 },
  encumbrance: 0,
  movementRate: 120,
  classes: { Fighter: 1 },
  primaryClass: null,
  spellSlots: {},
  memorizedSpells: {},
  spellbook: [],
  thiefSkills: null,
  turnUndead: null,
  languages: [],
  age: 25,
  ageCategory: 'Adult',
  henchmen: [],
  racialAbilities: [],
  classAbilities: [],
  proficiencies: [],
  secondarySkills: [],
});

describe('BaseCommand', () => {
  let gameContext: GameContext;
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
    gameContext = new GameContext(store);
  });

  describe('Command Creation', () => {
    it('should create commands with basic properties', () => {
      const command = new SimpleTestCommand('test-data', 'actor-1', ['target-1']);

      expect(command.type).toBe('simple-test');
      expect(command.testData).toBe('test-data');
      expect(command.getInvolvedEntities()).toEqual(['actor-1', 'target-1']);
    });

    it('should create commands with default parameters', () => {
      const command = new SimpleTestCommand('test-data');

      expect(command.getInvolvedEntities()).toEqual(['test-actor']);
    });
  });

  describe('Command Execution', () => {
    it('should execute simple commands', async () => {
      const command = new SimpleTestCommand('hello-world');
      const result = await command.execute(gameContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('hello-world');
      expect(gameContext.getTemporary('command-executed')).toBe(true);
      expect(gameContext.getTemporary('command-data')).toBe('hello-world');
    });

    it('should handle command failures', async () => {
      const command = new FailingCommand();
      const result = await command.execute(gameContext);

      expect(result.success).toBe(false);
      expect(result.message).toBe('This command always fails');
    });

    it('should include execution data in results', async () => {
      const command = new SimpleTestCommand('data-test');
      const result = await command.execute(gameContext);

      expect(result.data).toBeUndefined();
      expect(result.success).toBe(true);
    });
  });

  describe('Entity Validation', () => {
    it('should validate entities exist before execution', () => {
      const mockCharacter = createMockCharacter('test-character', 'Test Character');
      gameContext.setEntity('test-character', mockCharacter);

      const validCommand = new EntityRequiredCommand('test-character');
      expect(validCommand.canExecute(gameContext)).toBe(true);

      const invalidCommand = new EntityRequiredCommand('non-existing-character');
      expect(invalidCommand.canExecute(gameContext)).toBe(false);
    });

    it('should validate target entities exist', () => {
      const actor = createMockCharacter('actor', 'Actor');
      const target = createMockCharacter('target', 'Target');

      gameContext.setEntity('actor', actor);
      gameContext.setEntity('target', target);

      const validCommand = new EntityRequiredCommand('actor', ['target']);
      expect(validCommand.canExecute(gameContext)).toBe(true);

      const invalidCommand = new EntityRequiredCommand('actor', ['missing-target']);
      expect(invalidCommand.canExecute(gameContext)).toBe(false);
    });

    it('should handle custom validation logic', () => {
      const mockCharacter = createMockCharacter('validation-character', 'Validation Character');
      gameContext.setEntity('validation-character', mockCharacter);

      const command1 = new ValidationCommand('validation-character', [], false);
      expect(command1.canExecute(gameContext)).toBe(true);

      const command2 = new ValidationCommand('validation-character', [], true);
      expect(command2.canExecute(gameContext)).toBe(false);

      const command3 = new ValidationCommand('validation-character', ['some-target'], true);
      expect(command3.canExecute(gameContext)).toBe(false);
    });
  });

  describe('Command Metadata', () => {
    it('should provide required rules information', () => {
      const command = new SimpleTestCommand('metadata-test');
      const requiredRules = command.getRequiredRules();

      expect(requiredRules).toEqual(['simple-test-rule']);
    });

    it('should provide involved entities information', () => {
      const command = new EntityRequiredCommand('actor', ['target1', 'target2']);
      const entities = command.getInvolvedEntities();

      expect(entities).toEqual(['actor', 'target1', 'target2']);
    });
  });

  describe('Result Creation Helpers', () => {
    it('should create success results correctly', async () => {
      const command = new SimpleTestCommand('success-test');
      const result = await command.execute(gameContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('success-test');
    });

    it('should create failure results correctly', async () => {
      const command = new FailingCommand();
      const result = await command.execute(gameContext);

      expect(result.success).toBe(false);
      expect(result.message).toBe('This command always fails');
    });

    it('should create results with additional data', async () => {
      class DataCommand extends BaseCommand {
        readonly type = 'data-command';

        constructor() {
          super('data-actor');
        }

        async execute(_context: GameContext): Promise<CommandResult> {
          return this.createSuccessResult(
            'Command with data',
            { testValue: 42, testString: 'hello' },
            ['effect1', 'effect2'],
            [10, 15]
          );
        }

        canExecute(_context: GameContext): boolean {
          return true;
        }

        getRequiredRules(): string[] {
          return ['data-rule'];
        }
      }

      const command = new DataCommand();
      const result = await command.execute(gameContext);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Command with data');
      expect(result.data).toEqual({ testValue: 42, testString: 'hello' });
      expect(result.effects).toEqual(['effect1', 'effect2']);
      expect(result.damage).toEqual([10, 15]);
    });
  });

  describe('Command Performance', () => {
    it('should execute commands efficiently', async () => {
      const command = new SimpleTestCommand('performance-test');

      const startTime = Date.now();
      await command.execute(gameContext);
      const endTime = Date.now();

      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(100);
    });

    it('should handle batch command creation efficiently', () => {
      const commands = [];

      const startTime = Date.now();
      for (let i = 0; i < 1000; i++) {
        commands.push(new SimpleTestCommand(`batch-${i}`));
      }
      const endTime = Date.now();

      const creationTime = endTime - startTime;
      expect(creationTime).toBeLessThan(1000);
      expect(commands).toHaveLength(1000);
    });
  });

  describe('Error Handling', () => {
    it('should handle execution errors gracefully', async () => {
      class ErrorCommand extends BaseCommand {
        readonly type = 'error-command';

        constructor() {
          super('error-actor');
        }

        async execute(_context: GameContext): Promise<CommandResult> {
          throw new Error('Unexpected execution error');
        }

        canExecute(_context: GameContext): boolean {
          return true;
        }

        getRequiredRules(): string[] {
          return ['error-rule'];
        }
      }

      const command = new ErrorCommand();

      await expect(command.execute(gameContext)).rejects.toThrow('Unexpected execution error');
    });

    it('should handle validation errors appropriately', () => {
      const command = new EntityRequiredCommand('non-existing-actor');

      expect(command.canExecute(gameContext)).toBe(false);
    });
  });

  describe('Command Interface Compliance', () => {
    it('should implement all required Command interface methods', () => {
      const command = new SimpleTestCommand('interface-test');

      expect(typeof command.type).toBe('string');
      expect(typeof command.execute).toBe('function');
      expect(typeof command.canExecute).toBe('function');
      expect(typeof command.getRequiredRules).toBe('function');
      expect(typeof command.getInvolvedEntities).toBe('function');
    });

    it('should provide consistent command types', () => {
      const command1 = new SimpleTestCommand('test1');
      const command2 = new SimpleTestCommand('test2');

      expect(command1.type).toBe(command2.type);
      expect(command1.type).toBe('simple-test');
    });

    it('should maintain entity relationships', () => {
      const command = new EntityRequiredCommand('actor1', ['target1', 'target2']);
      const entities = command.getInvolvedEntities();

      expect(entities).toContain('actor1');
      expect(entities).toContain('target1');
      expect(entities).toContain('target2');
      expect(entities).toHaveLength(3);
    });
  });

  describe('OSRIC Preservation Features', () => {
    it('should support OSRIC-style command patterns', () => {
      const attackCommand = new SimpleTestCommand('attack-goblin', 'fighter1', ['goblin1']);
      const spellCommand = new SimpleTestCommand('cast-magic-missile', 'wizard1', ['orc1']);

      expect(attackCommand.getRequiredRules()).toEqual(['simple-test-rule']);
      expect(spellCommand.getRequiredRules()).toEqual(['simple-test-rule']);

      expect(attackCommand.getInvolvedEntities()).toEqual(['fighter1', 'goblin1']);
      expect(spellCommand.getInvolvedEntities()).toEqual(['wizard1', 'orc1']);
    });

    it('should maintain command execution context for OSRIC rules', async () => {
      const command = new SimpleTestCommand('osric-test');

      gameContext.setTemporary('combat-round', 1);
      gameContext.setTemporary('initiative-order', ['fighter', 'wizard', 'goblin']);

      const result = await command.execute(gameContext);

      expect(result.success).toBe(true);
      expect(gameContext.getTemporary('combat-round')).toBe(1);
      expect(gameContext.getTemporary('initiative-order')).toEqual(['fighter', 'wizard', 'goblin']);
      expect(gameContext.getTemporary('command-executed')).toBe(true);
    });

    it('should support command chaining for complex OSRIC actions', () => {
      const moveCommand = new SimpleTestCommand('move', 'character1');
      const attackCommand = new SimpleTestCommand('attack', 'character1', ['monster1']);

      expect(moveCommand.type).toBe('simple-test');
      expect(attackCommand.type).toBe('simple-test');

      expect(moveCommand.getInvolvedEntities()[0]).toBe(attackCommand.getInvolvedEntities()[0]);
    });
  });
});
