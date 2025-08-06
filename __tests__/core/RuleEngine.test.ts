import { createStore } from 'jotai';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BaseCommand, type CommandResult } from '../../osric/core/Command';
import { GameContext } from '../../osric/core/GameContext';
import { BaseRule, type RuleResult } from '../../osric/core/Rule';
import { RuleChain } from '../../osric/core/RuleChain';
import { RuleEngine, type RuleEngineConfig } from '../../osric/core/RuleEngine';

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

class TestCommand extends BaseCommand {
  readonly type = 'test-command';

  constructor(
    public readonly testData: string,
    actorId = 'test-actor',
    targetIds: string[] = []
  ) {
    super(actorId, targetIds);
  }

  async execute(_context: GameContext): Promise<CommandResult> {
    return this.createSuccessResult(`Test command executed with: ${this.testData}`);
  }

  canExecute(context: GameContext): boolean {
    return this.validateEntities(context);
  }

  getRequiredRules(): string[] {
    return ['test-rule'];
  }
}

class CriticalTestCommand extends BaseCommand {
  readonly type = 'death-save';

  constructor(actorId = 'dying-actor') {
    super(actorId);
  }

  async execute(_context: GameContext): Promise<CommandResult> {
    return this.createSuccessResult('Death save executed');
  }

  canExecute(_context: GameContext): boolean {
    return true;
  }

  getRequiredRules(): string[] {
    return ['death-save-rule'];
  }
}

class TestRule extends BaseRule {
  readonly name = 'test-rule';
  readonly priority = 100;

  async execute(context: GameContext, command: TestCommand): Promise<RuleResult> {
    await new Promise((resolve) => setTimeout(resolve, 1));

    const testData = command.testData;
    context.setTemporary('test-rule-executed', true);
    context.setTemporary('test-data', testData);

    return this.createSuccessResult(`Test rule executed with data: ${testData}`, { testData });
  }

  canApply(_context: GameContext, command: TestCommand): boolean {
    return command.type === 'test-command';
  }
}

class FailingRule extends BaseRule {
  readonly name = 'failing-rule';
  readonly priority = 50;

  async execute(_context: GameContext, _command: TestCommand): Promise<RuleResult> {
    return this.createFailureResult('This rule always fails', undefined, true);
  }

  canApply(_context: GameContext, _command: TestCommand): boolean {
    return true;
  }
}

class HighPriorityRule extends BaseRule {
  readonly name = 'high-priority-rule';
  readonly priority = 10;

  async execute(context: GameContext, _command: TestCommand): Promise<RuleResult> {
    const executionOrder = (context.getTemporary('execution-order') as string[]) || [];
    context.setTemporary('execution-order', [...executionOrder, 'high-priority']);

    return this.createSuccessResult('High priority rule executed');
  }

  canApply(_context: GameContext, _command: TestCommand): boolean {
    return true;
  }
}

class LowPriorityRule extends BaseRule {
  readonly name = 'low-priority-rule';
  readonly priority = 200;

  async execute(context: GameContext, _command: TestCommand): Promise<RuleResult> {
    const executionOrder = (context.getTemporary('execution-order') as string[]) || [];
    context.setTemporary('execution-order', [...executionOrder, 'low-priority']);

    return this.createSuccessResult('Low priority rule executed');
  }

  canApply(_context: GameContext, _command: TestCommand): boolean {
    return true;
  }
}

class DeathSaveRule extends BaseRule {
  readonly name = 'death-save-rule';
  readonly priority = 1;

  async execute(context: GameContext, _command: CriticalTestCommand): Promise<RuleResult> {
    context.setTemporary('death-save-executed', true);
    return this.createSuccessResult('Death save rule executed');
  }

  canApply(_context: GameContext, command: CriticalTestCommand): boolean {
    return command.type === 'death-save';
  }
}

class FailingDeathSaveRule extends BaseRule {
  readonly name = 'failing-death-save-rule';
  readonly priority = 1;

  async execute(context: GameContext, _command: CriticalTestCommand): Promise<RuleResult> {
    context.setTemporary('death-save-executed', true);
    return this.createFailureResult('Critical command encountered');
  }

  canApply(_context: GameContext, command: CriticalTestCommand): boolean {
    return command.type === 'death-save';
  }
}

describe('RuleEngine', () => {
  let ruleEngine: RuleEngine;
  let gameContext: GameContext;
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
    gameContext = new GameContext(store);
    ruleEngine = new RuleEngine();

    const testActor = createMockCharacter('test-actor', 'Test Actor');
    const dyingActor = createMockCharacter('dying-actor', 'Dying Actor');
    const failingActor = createMockCharacter('failing-actor', 'Failing Actor');

    gameContext.setEntity('test-actor', testActor);
    gameContext.setEntity('dying-actor', dyingActor);
    gameContext.setEntity('failing-actor', failingActor);
  });

  describe('Configuration', () => {
    it('should initialize with default configuration', () => {
      const engine = new RuleEngine();
      const metrics = engine.getMetrics();

      expect(metrics.commandsProcessed).toBe(0);
      expect(metrics.successRate).toBe(0);
      expect(metrics.averageExecutionTime).toBe(0);
    });

    it('should accept custom configuration', () => {
      const config: RuleEngineConfig = {
        enableLogging: true,
        enableMetrics: false,
        defaultChainConfig: {
          stopOnFailure: true,
          mergeResults: false,
          clearTemporary: false,
        },
      };

      const engine = new RuleEngine(config);
      expect(engine).toBeDefined();
    });
  });

  describe('Rule Chain Management', () => {
    it('should register and retrieve rule chains', () => {
      const testChain = new RuleChain();
      testChain.addRule(new TestRule());

      ruleEngine.registerRuleChain('test-command', testChain);

      expect(ruleEngine.hasRuleChain('test-command')).toBe(true);
      expect(ruleEngine.getRuleChain('test-command')).toBe(testChain);
    });

    it('should register multiple rule chains at once', () => {
      const testChain = new RuleChain();
      testChain.addRule(new TestRule());

      const criticalChain = new RuleChain();
      criticalChain.addRule(new DeathSaveRule());

      const chains = {
        'test-command': testChain,
        'death-save': criticalChain,
      };

      ruleEngine.registerRuleChains(chains);

      expect(ruleEngine.hasRuleChain('test-command')).toBe(true);
      expect(ruleEngine.hasRuleChain('death-save')).toBe(true);
    });

    it('should validate rule chains are not empty', () => {
      const emptyChain = new RuleChain();

      expect(() => {
        ruleEngine.registerRuleChain('empty-command', emptyChain);
      }).toThrow('Rule chain for empty-command is empty');
    });

    it('should remove rule chains', () => {
      const testChain = new RuleChain();
      testChain.addRule(new TestRule());

      ruleEngine.registerRuleChain('test-command', testChain);
      expect(ruleEngine.hasRuleChain('test-command')).toBe(true);

      ruleEngine.unregisterRuleChain('test-command');
      expect(ruleEngine.hasRuleChain('test-command')).toBe(false);
    });
  });

  describe('Command Processing', () => {
    it('should process commands through appropriate rule chains', async () => {
      const testChain = new RuleChain();
      testChain.addRule(new TestRule());
      ruleEngine.registerRuleChain('test-command', testChain);

      const command = new TestCommand('hello-world');
      const result = await ruleEngine.process(command, gameContext);

      expect(result.success).toBe(true);
      expect(result.message).toContain('hello-world');
      expect(gameContext.getTemporary('test-rule-executed')).toBe(true);
      expect(gameContext.getTemporary('test-data')).toBe('hello-world');
    });

    it('should handle commands with no matching rule chain', async () => {
      const command = new TestCommand('no-chain');

      await expect(ruleEngine.process(command, gameContext)).rejects.toThrow(
        'No rule chain found for command type: test-command'
      );
    });

    it('should respect rule execution priority', async () => {
      const testChain = new RuleChain();
      testChain.addRule(new LowPriorityRule());
      testChain.addRule(new HighPriorityRule());
      testChain.addRule(new TestRule());

      ruleEngine.registerRuleChain('test-command', testChain);

      gameContext.setTemporary('execution-order', []);
      const command = new TestCommand('priority-test');
      await ruleEngine.process(command, gameContext);

      const executionOrder = gameContext.getTemporary('execution-order') as string[];
      expect(executionOrder).toEqual(['high-priority', 'low-priority']);
    });

    it('should handle rule chain failures', async () => {
      const testChain = new RuleChain({
        stopOnFailure: true,
        mergeResults: true,
        clearTemporary: false,
      });
      testChain.addRule(new FailingRule());
      testChain.addRule(new TestRule());

      ruleEngine.registerRuleChain('test-command', testChain);

      const command = new TestCommand('failure-test');
      const result = await ruleEngine.process(command, gameContext);

      expect(result.success).toBe(false);
      expect(result.message).toContain('This rule always fails');
      expect(gameContext.getTemporary('test-rule-executed')).toBe(null);
    });
  });

  describe('Batch Processing', () => {
    it('should process multiple commands in batch', async () => {
      const testChain = new RuleChain();
      testChain.addRule(new TestRule());
      ruleEngine.registerRuleChain('test-command', testChain);

      const commands = [
        new TestCommand('batch-1'),
        new TestCommand('batch-2'),
        new TestCommand('batch-3'),
      ];

      const results = await ruleEngine.processBatch(commands, gameContext);

      expect(results).toHaveLength(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[2].success).toBe(true);
    });

    it('should stop batch processing on critical commands', async () => {
      const testChain = new RuleChain();
      testChain.addRule(new TestRule());
      ruleEngine.registerRuleChain('test-command', testChain);

      const criticalChain = new RuleChain();
      criticalChain.addRule(new FailingDeathSaveRule());
      ruleEngine.registerRuleChain('death-save', criticalChain);

      const commands = [
        new TestCommand('before-critical'),
        new CriticalTestCommand(),
        new TestCommand('after-critical'),
      ];

      const results = await ruleEngine.processBatch(commands, gameContext);

      expect(results).toHaveLength(2);
      expect(results[1].message).toContain('Critical command encountered');
    });
  });

  describe('Metrics and Performance', () => {
    it('should track command processing metrics', async () => {
      const testChain = new RuleChain();
      testChain.addRule(new TestRule());
      ruleEngine.registerRuleChain('test-command', testChain);

      await ruleEngine.process(new TestCommand('test-1'), gameContext);
      await ruleEngine.process(new TestCommand('test-2'), gameContext);

      const metrics = ruleEngine.getMetrics();

      expect(metrics.commandsProcessed).toBe(2);
      expect(metrics.averageExecutionTime).toBeGreaterThan(0);
      expect(metrics.successRate).toBe(1.0);
      expect(metrics.ruleChainUsage['test-command']).toBe(2);
    });

    it('should calculate success rate correctly with failures', async () => {
      const testChain = new RuleChain();
      testChain.addRule(new TestRule());
      ruleEngine.registerRuleChain('test-command', testChain);

      const failingChain = new RuleChain();
      failingChain.addRule(new FailingRule());
      ruleEngine.registerRuleChain('failing-command', failingChain);

      class FailingCommand extends BaseCommand {
        readonly type = 'failing-command';

        constructor() {
          super('failing-actor');
        }

        async execute(_context: GameContext): Promise<CommandResult> {
          return this.createFailureResult('Failing command');
        }

        canExecute(): boolean {
          return true;
        }
        getRequiredRules(): string[] {
          return ['failing-rule'];
        }
      }

      await ruleEngine.process(new TestCommand('success'), gameContext);
      await ruleEngine.process(new FailingCommand(), gameContext);
      await ruleEngine.process(new TestCommand('success'), gameContext);

      const metrics = ruleEngine.getMetrics();

      expect(metrics.commandsProcessed).toBe(3);
      expect(metrics.successRate).toBeCloseTo(0.67, 2);
    });

    it('should reset metrics', async () => {
      const testChain = new RuleChain();
      testChain.addRule(new TestRule());
      ruleEngine.registerRuleChain('test-command', testChain);

      await ruleEngine.process(new TestCommand('test'), gameContext);

      let metrics = ruleEngine.getMetrics();
      expect(metrics.commandsProcessed).toBe(1);

      ruleEngine.resetMetrics();

      metrics = ruleEngine.getMetrics();
      expect(metrics.commandsProcessed).toBe(0);
      expect(metrics.successRate).toBe(0);
    });
  });

  describe('OSRIC-Specific Features', () => {
    it('should handle critical OSRIC commands correctly', async () => {
      const testChain = new RuleChain();
      testChain.addRule(new TestRule());
      ruleEngine.registerRuleChain('test-command', testChain);

      const criticalChain = new RuleChain();
      criticalChain.addRule(new DeathSaveRule());
      ruleEngine.registerRuleChain('death-save', criticalChain);

      const commands = [
        new TestCommand('before-critical'),
        new CriticalTestCommand(),
        new TestCommand('after-critical'),
      ];

      const results = await ruleEngine.processBatch(commands, gameContext);

      expect(results).toHaveLength(3);
      expect(results[1].success).toBe(true);
    });

    it('should preserve temporary data for rule communication', async () => {
      class CommunicatingRule1 extends BaseRule {
        readonly name = 'rule-1';
        readonly priority = 10;

        async execute(context: GameContext): Promise<RuleResult> {
          context.setTemporary('attack-roll', 15);
          context.setTemporary('strength-bonus', 2);
          return this.createSuccessResult('Rule 1 executed');
        }

        canApply(): boolean {
          return true;
        }
      }

      class CommunicatingRule2 extends BaseRule {
        readonly name = 'rule-2';
        readonly priority = 20;

        async execute(context: GameContext): Promise<RuleResult> {
          const attackRoll = context.getTemporary('attack-roll') as number;
          const strengthBonus = context.getTemporary('strength-bonus') as number;
          const totalAttack = attackRoll + strengthBonus;

          context.setTemporary('total-attack', totalAttack);
          return this.createSuccessResult(`Rule 2 calculated total: ${totalAttack}`, {
            totalAttack,
          });
        }

        canApply(): boolean {
          return true;
        }
      }

      const communicationChain = new RuleChain();
      communicationChain.addRule(new CommunicatingRule1());
      communicationChain.addRule(new CommunicatingRule2());

      ruleEngine.registerRuleChain('test-command', communicationChain);

      const result = await ruleEngine.process(new TestCommand('communication-test'), gameContext);

      expect(result.success).toBe(true);
      expect(gameContext.getTemporary('total-attack')).toBe(17);
    });

    it('should validate rule engine completeness', () => {
      const validation = ruleEngine.validate();
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('No rule chains registered');

      const testChain = new RuleChain();
      testChain.addRule(new TestRule());
      ruleEngine.registerRuleChain('test-command', testChain);

      const validationAfter = ruleEngine.validate();
      expect(validationAfter.valid).toBe(true);
      expect(validationAfter.errors).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle rule execution errors gracefully', async () => {
      class ErrorRule extends BaseRule {
        readonly name = 'error-rule';
        readonly priority = 100;

        async execute(): Promise<RuleResult> {
          throw new Error('Simulated rule error');
        }

        canApply(): boolean {
          return true;
        }
      }

      const errorChain = new RuleChain();
      errorChain.addRule(new ErrorRule());
      ruleEngine.registerRuleChain('test-command', errorChain);

      const command = new TestCommand('error-test');
      const result = await ruleEngine.process(command, gameContext);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Error executing rule');
    });

    it('should handle missing rule chains', async () => {
      const command = new TestCommand('missing-chain');

      await expect(ruleEngine.process(command, gameContext)).rejects.toThrow(
        'No rule chain found for command type: test-command'
      );
    });
  });
});
