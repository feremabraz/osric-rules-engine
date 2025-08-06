import { createStore } from 'jotai';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BaseCommand, type CommandResult } from '../../osric/core/Command';
import { GameContext } from '../../osric/core/GameContext';
import { BaseRule, type RuleResult } from '../../osric/core/Rule';
import { RuleChain, type RuleChainConfig } from '../../osric/core/RuleChain';

// Mock command for testing
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

// Mock rules for testing
class TestRule extends BaseRule {
  readonly name = 'test-rule';
  readonly priority = 100;

  async execute(context: GameContext, command: TestCommand): Promise<RuleResult> {
    const testData = command.testData;
    context.setTemporary('test-rule-executed', true);
    context.setTemporary('test-data', testData);

    return this.createSuccessResult(`Test rule executed with data: ${testData}`, { testData });
  }

  canApply(_context: GameContext, command: TestCommand): boolean {
    return command.type === 'test-command';
  }
}

class HighPriorityRule extends BaseRule {
  readonly name = 'high-priority-rule';
  readonly priority = 10; // Lower number = higher priority

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
  readonly priority = 200; // Higher number = lower priority

  async execute(context: GameContext, _command: TestCommand): Promise<RuleResult> {
    const executionOrder = (context.getTemporary('execution-order') as string[]) || [];
    context.setTemporary('execution-order', [...executionOrder, 'low-priority']);

    return this.createSuccessResult('Low priority rule executed');
  }

  canApply(_context: GameContext, _command: TestCommand): boolean {
    return true;
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

class ConditionalRule extends BaseRule {
  readonly name = 'conditional-rule';
  readonly priority = 75;

  async execute(context: GameContext, _command: TestCommand): Promise<RuleResult> {
    context.setTemporary('conditional-rule-executed', true);
    return this.createSuccessResult('Conditional rule executed');
  }

  canApply(context: GameContext, _command: TestCommand): boolean {
    return context.getTemporary('allow-conditional') === true;
  }
}

class OSRICAttackRule extends BaseRule {
  readonly name = 'osric-attack-rule';
  readonly priority = 10;

  async execute(context: GameContext, _command: TestCommand): Promise<RuleResult> {
    // Simulate OSRIC attack roll calculation
    const baseThac0 = 20;
    const targetAC = 5;
    const attackRoll = 15; // Simulated roll
    const strengthBonus = 1;

    const totalAttack = attackRoll + strengthBonus;
    const hitThreshold = baseThac0 - targetAC;
    const isHit = totalAttack >= hitThreshold;

    context.setTemporary('attack-roll', attackRoll);
    context.setTemporary('total-attack', totalAttack);
    context.setTemporary('hit-threshold', hitThreshold);
    context.setTemporary('is-hit', isHit);

    return this.createSuccessResult(
      `OSRIC attack: roll ${attackRoll} + ${strengthBonus} = ${totalAttack} vs ${hitThreshold} (${isHit ? 'HIT' : 'MISS'})`,
      { attackRoll, totalAttack, hitThreshold, isHit }
    );
  }

  canApply(_context: GameContext, _command: TestCommand): boolean {
    return true;
  }
}

class OSRICDamageRule extends BaseRule {
  readonly name = 'osric-damage-rule';
  readonly priority = 20; // Executes after attack rule

  async execute(context: GameContext, _command: TestCommand): Promise<RuleResult> {
    const isHit = context.getTemporary('is-hit') as boolean;

    if (!isHit) {
      return this.createSuccessResult('No damage - attack missed');
    }

    // Simulate OSRIC damage calculation
    const baseDamage = 8; // 1d8 longsword
    const strengthBonus = 2; // 18 strength
    const totalDamage = baseDamage + strengthBonus;

    context.setTemporary('base-damage', baseDamage);
    context.setTemporary('damage-bonus', strengthBonus);
    context.setTemporary('total-damage', totalDamage);

    return this.createSuccessResult(
      `OSRIC damage: ${baseDamage} + ${strengthBonus} = ${totalDamage}`,
      { baseDamage, strengthBonus, totalDamage }
    );
  }

  canApply(context: GameContext, _command: TestCommand): boolean {
    return context.getTemporary('is-hit') !== null;
  }
}

describe('RuleChain', () => {
  let ruleChain: RuleChain;
  let gameContext: GameContext;
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
    gameContext = new GameContext(store);
    ruleChain = new RuleChain();
  });

  describe('Configuration', () => {
    it('should initialize with default configuration', () => {
      const chain = new RuleChain();
      expect(chain.getRules()).toHaveLength(0);
    });

    it('should accept custom configuration', () => {
      const config: RuleChainConfig = {
        stopOnFailure: true,
        mergeResults: false,
        clearTemporary: true,
      };

      const chain = new RuleChain(config);
      expect(chain).toBeDefined();
    });
  });

  describe('Rule Management', () => {
    it('should add and retrieve rules', () => {
      const testRule = new TestRule();
      ruleChain.addRule(testRule);

      const rules = ruleChain.getRules();
      expect(rules).toHaveLength(1);
      expect(rules[0]).toBe(testRule);
    });

    it('should add multiple rules at once', () => {
      const rules = [new TestRule(), new HighPriorityRule(), new LowPriorityRule()];

      ruleChain.addRules(rules);

      const chainRules = ruleChain.getRules();
      expect(chainRules).toHaveLength(3);
    });

    it('should remove rules by name', () => {
      const testRule = new TestRule();
      const highPriorityRule = new HighPriorityRule();

      ruleChain.addRule(testRule);
      ruleChain.addRule(highPriorityRule);

      expect(ruleChain.getRules()).toHaveLength(2);

      ruleChain.removeRule('test-rule');
      const remainingRules = ruleChain.getRules();
      expect(remainingRules).toHaveLength(1);
      expect(remainingRules[0].name).toBe('high-priority-rule');
    });

    it('should check if rules exist by name', () => {
      const testRule = new TestRule();
      ruleChain.addRule(testRule);

      expect(ruleChain.hasRule('test-rule')).toBe(true);
      expect(ruleChain.hasRule('non-existing-rule')).toBe(false);
    });

    it('should get rules by name', () => {
      const testRule = new TestRule();
      ruleChain.addRule(testRule);

      const retrieved = ruleChain.getRule('test-rule');
      expect(retrieved).toBe(testRule);

      const nonExisting = ruleChain.getRule('non-existing-rule');
      expect(nonExisting).toBeUndefined();
    });

    it('should clear all rules', () => {
      ruleChain.addRule(new TestRule());
      ruleChain.addRule(new HighPriorityRule());

      expect(ruleChain.getRules()).toHaveLength(2);

      ruleChain.clearRules();
      expect(ruleChain.getRules()).toHaveLength(0);
    });
  });

  describe('Rule Execution Order', () => {
    it('should execute rules in priority order (lower number = higher priority)', async () => {
      // Create RuleChain with clearTemporary: false to preserve execution tracking
      const testRuleChain = new RuleChain({ clearTemporary: false });

      testRuleChain.addRule(new LowPriorityRule()); // priority 200
      testRuleChain.addRule(new HighPriorityRule()); // priority 10
      testRuleChain.addRule(new TestRule()); // priority 100

      gameContext.setTemporary('execution-order', []);
      const command = new TestCommand('priority-test');

      const result = await testRuleChain.execute(command, gameContext);

      const executionOrder = gameContext.getTemporary('execution-order') as string[];
      expect(executionOrder).toEqual(['high-priority', 'low-priority']);
      expect(result.success).toBe(true);
    });

    it('should handle rules with same priority', async () => {
      class SamePriorityRule1 extends BaseRule {
        readonly name = 'same-priority-1';
        readonly priority = 100;

        async execute(context: GameContext): Promise<RuleResult> {
          const order = (context.getTemporary('execution-order') as string[]) || [];
          context.setTemporary('execution-order', [...order, 'same-1']);
          return this.createSuccessResult('Same priority 1 executed');
        }

        canApply(): boolean {
          return true;
        }
      }

      class SamePriorityRule2 extends BaseRule {
        readonly name = 'same-priority-2';
        readonly priority = 100;

        async execute(context: GameContext): Promise<RuleResult> {
          const order = (context.getTemporary('execution-order') as string[]) || [];
          context.setTemporary('execution-order', [...order, 'same-2']);
          return this.createSuccessResult('Same priority 2 executed');
        }

        canApply(): boolean {
          return true;
        }
      }

      // Create RuleChain with clearTemporary: false to preserve execution tracking
      const testRuleChain = new RuleChain({ clearTemporary: false });

      testRuleChain.addRule(new SamePriorityRule2()); // Added first
      testRuleChain.addRule(new SamePriorityRule1()); // Added second

      gameContext.setTemporary('execution-order', []);
      const command = new TestCommand('same-priority-test');

      await testRuleChain.execute(command, gameContext);

      const executionOrder = gameContext.getTemporary('execution-order') as string[];
      // Should maintain addition order when priorities are equal
      expect(executionOrder).toEqual(['same-2', 'same-1']);
    });
  });

  describe('Rule Execution Conditions', () => {
    it('should only execute rules that can apply', async () => {
      // Create RuleChain with clearTemporary: false to preserve execution tracking
      const testRuleChain = new RuleChain({ clearTemporary: false });

      testRuleChain.addRule(new ConditionalRule());
      testRuleChain.addRule(new TestRule());

      // First test without allowing conditional rule
      const command = new TestCommand('conditional-test');
      await testRuleChain.execute(command, gameContext);

      expect(gameContext.getTemporary('conditional-rule-executed')).toBe(null);
      expect(gameContext.getTemporary('test-rule-executed')).toBe(true);

      // Reset and test with conditional rule allowed
      gameContext.clearTemporary();
      gameContext.setTemporary('allow-conditional', true);

      await testRuleChain.execute(command, gameContext);

      expect(gameContext.getTemporary('conditional-rule-executed')).toBe(true);
      expect(gameContext.getTemporary('test-rule-executed')).toBe(true);
    });

    it('should skip non-applicable rules without error', async () => {
      // Create RuleChain with clearTemporary: false to preserve execution tracking
      const testRuleChain = new RuleChain({ clearTemporary: false });

      class NonApplicableRule extends BaseRule {
        readonly name = 'non-applicable-rule';
        readonly priority = 50;

        async execute(): Promise<RuleResult> {
          return this.createSuccessResult('Should not execute');
        }

        canApply(): boolean {
          return false; // Never applies
        }
      }

      testRuleChain.addRule(new NonApplicableRule());
      testRuleChain.addRule(new TestRule());

      const command = new TestCommand('non-applicable-test');
      const result = await testRuleChain.execute(command, gameContext);

      expect(result.success).toBe(true);
      expect(gameContext.getTemporary('test-rule-executed')).toBe(true);
    });
  });

  describe('Failure Handling', () => {
    it('should stop on failure when configured to do so', async () => {
      const config: RuleChainConfig = {
        stopOnFailure: true,
        mergeResults: true,
        clearTemporary: false,
      };

      ruleChain = new RuleChain(config);
      ruleChain.addRule(new FailingRule()); // priority 50, will fail
      ruleChain.addRule(new TestRule()); // priority 100, should not execute

      const command = new TestCommand('stop-on-failure-test');
      const result = await ruleChain.execute(command, gameContext);

      expect(result.success).toBe(false);
      expect(result.message).toContain('This rule always fails');
      expect(gameContext.getTemporary('test-rule-executed')).toBe(null);
    });

    it('should continue on failure when configured to do so', async () => {
      // Create a non-critical failing rule for this test
      class NonCriticalFailingRule extends BaseRule {
        readonly name = 'non-critical-failing-rule';
        readonly priority = 50;

        async execute(): Promise<RuleResult> {
          return this.createFailureResult('This rule always fails', undefined, false); // non-critical
        }

        canApply(): boolean {
          return true;
        }
      }

      const config: RuleChainConfig = {
        stopOnFailure: false,
        mergeResults: true,
        clearTemporary: false,
      };

      ruleChain = new RuleChain(config);
      ruleChain.addRule(new NonCriticalFailingRule()); // priority 50, will fail but not stop chain
      ruleChain.addRule(new TestRule()); // priority 100, should execute

      const command = new TestCommand('continue-on-failure-test');
      const result = await ruleChain.execute(command, gameContext);

      expect(result.success).toBe(false); // Overall result is failure due to one failing rule
      expect(result.message).toContain('This rule always fails');
      expect(gameContext.getTemporary('test-rule-executed')).toBe(true); // But other rules executed
    });

    it('should handle critical failures correctly', async () => {
      class CriticalFailureRule extends BaseRule {
        readonly name = 'critical-failure-rule';
        readonly priority = 10;

        async execute(): Promise<RuleResult> {
          return this.createFailureResult('Critical failure occurred', undefined, true);
        }

        canApply(): boolean {
          return true;
        }
      }

      ruleChain.addRule(new CriticalFailureRule());
      ruleChain.addRule(new TestRule());

      const command = new TestCommand('critical-failure-test');
      const result = await ruleChain.execute(command, gameContext);

      expect(result.success).toBe(false);
      expect(result.critical).toBe(true);
      expect(gameContext.getTemporary('test-rule-executed')).toBe(null);
    });
  });

  describe('Result Merging', () => {
    it('should merge results when configured to do so', async () => {
      class DataRule1 extends BaseRule {
        readonly name = 'data-rule-1';
        readonly priority = 10;

        async execute(): Promise<RuleResult> {
          return this.createSuccessResult('Data rule 1', { value1: 'test1' });
        }

        canApply(): boolean {
          return true;
        }
      }

      class DataRule2 extends BaseRule {
        readonly name = 'data-rule-2';
        readonly priority = 20;

        async execute(): Promise<RuleResult> {
          return this.createSuccessResult('Data rule 2', { value2: 'test2' });
        }

        canApply(): boolean {
          return true;
        }
      }

      const config: RuleChainConfig = {
        stopOnFailure: false,
        mergeResults: true,
        clearTemporary: false,
      };

      ruleChain = new RuleChain(config);
      ruleChain.addRule(new DataRule1());
      ruleChain.addRule(new DataRule2());

      const command = new TestCommand('merge-test');
      const result = await ruleChain.execute(command, gameContext);

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        value1: 'test1',
        value2: 'test2',
      });
    });

    it('should not merge results when configured not to', async () => {
      class DataRule extends BaseRule {
        readonly name = 'data-rule';
        readonly priority = 10;

        async execute(): Promise<RuleResult> {
          return this.createSuccessResult('Data rule', { value: 'test' });
        }

        canApply(): boolean {
          return true;
        }
      }

      const config: RuleChainConfig = {
        stopOnFailure: false,
        mergeResults: false,
        clearTemporary: false,
      };

      ruleChain = new RuleChain(config);
      ruleChain.addRule(new DataRule());

      const command = new TestCommand('no-merge-test');
      const result = await ruleChain.execute(command, gameContext);

      expect(result.success).toBe(true);
      expect(result.data).toBeUndefined();
    });
  });

  describe('Temporary Data Management', () => {
    it('should clear temporary data when configured to do so', async () => {
      const config: RuleChainConfig = {
        stopOnFailure: false,
        mergeResults: false,
        clearTemporary: true,
      };

      ruleChain = new RuleChain(config);
      ruleChain.addRule(new TestRule());

      gameContext.setTemporary('pre-existing-data', 'should-be-cleared');

      const command = new TestCommand('clear-temp-test');
      await ruleChain.execute(command, gameContext);

      expect(gameContext.getTemporary('pre-existing-data')).toBe(null);
    });

    it('should preserve temporary data when configured to do so', async () => {
      const config: RuleChainConfig = {
        stopOnFailure: false,
        mergeResults: false,
        clearTemporary: false,
      };

      ruleChain = new RuleChain(config);
      ruleChain.addRule(new TestRule());

      gameContext.setTemporary('pre-existing-data', 'should-be-preserved');

      const command = new TestCommand('preserve-temp-test');
      await ruleChain.execute(command, gameContext);

      expect(gameContext.getTemporary('pre-existing-data')).toBe('should-be-preserved');
      expect(gameContext.getTemporary('test-rule-executed')).toBe(true);
    });
  });

  describe('OSRIC-Specific Features', () => {
    it('should handle OSRIC combat rule chains correctly', async () => {
      // Create a rule chain that preserves temporary calculations
      const osricCombatChain = new RuleChain({ clearTemporary: false });

      // Create a typical OSRIC combat chain: Attack -> Damage
      osricCombatChain.addRule(new OSRICAttackRule()); // priority 10
      osricCombatChain.addRule(new OSRICDamageRule()); // priority 20

      const command = new TestCommand('osric-combat-test');
      const result = await osricCombatChain.execute(command, gameContext);

      expect(result.success).toBe(true);

      // Verify OSRIC attack calculations were preserved
      expect(gameContext.getTemporary('attack-roll')).toBe(15);
      expect(gameContext.getTemporary('total-attack')).toBe(16); // 15 + 1 strength
      expect(gameContext.getTemporary('hit-threshold')).toBe(15); // 20 - 5 AC
      expect(gameContext.getTemporary('is-hit')).toBe(true);

      // Verify OSRIC damage calculations were preserved
      expect(gameContext.getTemporary('base-damage')).toBe(8);
      expect(gameContext.getTemporary('damage-bonus')).toBe(2);
      expect(gameContext.getTemporary('total-damage')).toBe(10);
    });

    it('should handle OSRIC spell casting rule chains', async () => {
      class OSRICSpellCheckRule extends BaseRule {
        readonly name = 'osric-spell-check-rule';
        readonly priority = 10;

        async execute(context: GameContext): Promise<RuleResult> {
          // Simulate OSRIC spell level and slot checking
          const casterLevel = 3;
          const spellLevel = 2;
          const availableSlots = 1;

          context.setTemporary('caster-level', casterLevel);
          context.setTemporary('spell-level', spellLevel);
          context.setTemporary('available-slots', availableSlots);
          context.setTemporary('can-cast', availableSlots > 0 && casterLevel >= spellLevel);

          return this.createSuccessResult('Spell check completed');
        }

        canApply(): boolean {
          return true;
        }
      }

      class OSRICSpellEffectRule extends BaseRule {
        readonly name = 'osric-spell-effect-rule';
        readonly priority = 20;

        async execute(context: GameContext): Promise<RuleResult> {
          const canCast = context.getTemporary('can-cast') as boolean;

          if (!canCast) {
            return this.createFailureResult('Cannot cast spell');
          }

          // Simulate spell effect
          const damage = 12; // 3d4 magic missile
          context.setTemporary('spell-damage', damage);

          return this.createSuccessResult(`Spell cast for ${damage} damage`);
        }

        canApply(context: GameContext): boolean {
          return context.getTemporary('can-cast') !== null;
        }
      }

      // Create a rule chain that preserves temporary calculations
      const osricSpellChain = new RuleChain({ clearTemporary: false });
      osricSpellChain.addRule(new OSRICSpellCheckRule());
      osricSpellChain.addRule(new OSRICSpellEffectRule());

      const command = new TestCommand('osric-spell-test');
      const result = await osricSpellChain.execute(command, gameContext);

      expect(result.success).toBe(true);
      expect(gameContext.getTemporary('caster-level')).toBe(3);
      expect(gameContext.getTemporary('spell-level')).toBe(2);
      expect(gameContext.getTemporary('can-cast')).toBe(true);
      expect(gameContext.getTemporary('spell-damage')).toBe(12);
    });

    it('should preserve OSRIC ability score modifier calculations', async () => {
      class OSRICAbilityCheckRule extends BaseRule {
        readonly name = 'osric-ability-check-rule';
        readonly priority = 10;

        async execute(context: GameContext): Promise<RuleResult> {
          // Simulate OSRIC ability check with proper modifiers
          const strengthScore = 18;
          const roll = 12;

          // OSRIC strength modifiers
          let modifier = 0;
          if (strengthScore >= 18) modifier = 3;
          else if (strengthScore >= 16) modifier = 2;
          else if (strengthScore >= 15) modifier = 1;

          const totalCheck = roll + modifier;
          const success = totalCheck >= 15; // Example DC

          context.setTemporary('strength-score', strengthScore);
          context.setTemporary('ability-roll', roll);
          context.setTemporary('ability-modifier', modifier);
          context.setTemporary('total-check', totalCheck);
          context.setTemporary('check-success', success);

          return this.createSuccessResult(
            `Ability check: ${roll} + ${modifier} = ${totalCheck} (${success ? 'SUCCESS' : 'FAILURE'})`
          );
        }

        canApply(): boolean {
          return true;
        }
      }

      // Create a rule chain that preserves temporary calculations
      const osricAbilityChain = new RuleChain({ clearTemporary: false });
      osricAbilityChain.addRule(new OSRICAbilityCheckRule());

      const command = new TestCommand('osric-ability-test');
      const result = await osricAbilityChain.execute(command, gameContext);

      expect(result.success).toBe(true);
      expect(gameContext.getTemporary('strength-score')).toBe(18);
      expect(gameContext.getTemporary('ability-modifier')).toBe(3); // OSRIC 18 strength modifier
      expect(gameContext.getTemporary('total-check')).toBe(15); // 12 + 3
      expect(gameContext.getTemporary('check-success')).toBe(true);
    });
  });

  describe('Rule Chain Validation', () => {
    it('should validate that rules are properly configured', () => {
      ruleChain.addRule(new TestRule());
      ruleChain.addRule(new HighPriorityRule());

      const validation = ruleChain.validate();
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect empty rule chains', () => {
      const validation = ruleChain.validate();
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Rule chain is empty');
    });

    it('should detect duplicate rule names', () => {
      ruleChain.addRule(new TestRule());
      ruleChain.addRule(new TestRule()); // Duplicate name

      const validation = ruleChain.validate();
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Duplicate rule name: test-rule');
    });
  });

  describe('Performance and Metrics', () => {
    it('should track rule execution metrics', async () => {
      ruleChain.addRule(new TestRule());
      ruleChain.addRule(new HighPriorityRule());

      const command = new TestCommand('metrics-test');
      await ruleChain.execute(command, gameContext);

      const metrics = ruleChain.getMetrics();
      expect(metrics.totalExecutions).toBe(1);
      expect(metrics.averageExecutionTime).toBeGreaterThan(0);
      expect(metrics.ruleExecutionCounts['test-rule']).toBe(1);
      expect(metrics.ruleExecutionCounts['high-priority-rule']).toBe(1);
    });

    it('should reset metrics', async () => {
      ruleChain.addRule(new TestRule());

      const command = new TestCommand('metrics-reset-test');
      await ruleChain.execute(command, gameContext);

      let metrics = ruleChain.getMetrics();
      expect(metrics.totalExecutions).toBe(1);

      ruleChain.resetMetrics();

      metrics = ruleChain.getMetrics();
      expect(metrics.totalExecutions).toBe(0);
      expect(metrics.ruleExecutionCounts).toEqual({});
    });
  });

  describe('Error Handling', () => {
    it('should handle rule execution errors gracefully', async () => {
      class ErrorRule extends BaseRule {
        readonly name = 'error-rule';
        readonly priority = 10;

        async execute(): Promise<RuleResult> {
          throw new Error('Unexpected rule error');
        }

        canApply(): boolean {
          return true;
        }
      }

      ruleChain.addRule(new ErrorRule());

      const command = new TestCommand('error-test');
      const result = await ruleChain.execute(command, gameContext);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Error executing rule');
      expect(result.message).toContain('Unexpected rule error');
    });

    it('should continue with other rules after non-critical errors', async () => {
      class ErrorRule extends BaseRule {
        readonly name = 'error-rule';
        readonly priority = 10;

        async execute(): Promise<RuleResult> {
          throw new Error('Non-critical error');
        }

        canApply(): boolean {
          return true;
        }
      }

      const config: RuleChainConfig = {
        stopOnFailure: false,
        mergeResults: false,
        clearTemporary: false,
      };

      ruleChain = new RuleChain(config);
      ruleChain.addRule(new ErrorRule());
      ruleChain.addRule(new TestRule());

      const command = new TestCommand('error-continue-test');
      const result = await ruleChain.execute(command, gameContext);

      expect(result.success).toBe(false); // Overall failure due to error
      expect(gameContext.getTemporary('test-rule-executed')).toBe(true); // But other rules executed
    });
  });
});
