import type { Command } from '@osric/core/Command';
import type { GameContext } from '@osric/core/GameContext';

import { BaseRule, type Rule, type RuleResult } from '@osric/core/Rule';
import type { Character } from '@osric/core/Types';
import { beforeEach, describe, expect, it, vi } from 'vitest';

class TestRule extends BaseRule {
  readonly name = 'TestRule';
  readonly priority = 100;

  async execute(_context: GameContext, _command: Command): Promise<RuleResult> {
    return this.createSuccessResult('Test rule executed successfully');
  }

  canApply(_context: GameContext, _command: Command): boolean {
    return true;
  }
}

class PriorityRule extends BaseRule {
  readonly name = 'PriorityRule';
  readonly priority = 200;

  async execute(_context: GameContext, _command: Command): Promise<RuleResult> {
    return this.createSuccessResult('Priority rule executed');
  }

  canApply(_context: GameContext, _command: Command): boolean {
    return true;
  }
}

class ConditionalRule extends BaseRule {
  readonly name = 'ConditionalRule';
  readonly priority = 150;

  async execute(_context: GameContext, command: Command): Promise<RuleResult> {
    if (command.type === 'test-command') {
      return this.createSuccessResult('Conditional rule applied', { commandType: command.type });
    }
    return this.createFailureResult('Rule does not apply to this command type');
  }

  canApply(_context: GameContext, command: Command): boolean {
    return command.type === 'test-command';
  }

  getPrerequisites(): string[] {
    return ['prerequisite-rule'];
  }
}

class TestableRule extends BaseRule {
  readonly name = 'TestableRule';

  async execute(_context: GameContext, _command: Command): Promise<RuleResult> {
    return this.createSuccessResult('Test execution');
  }

  canApply(): boolean {
    return true;
  }

  public testCreateSuccessResult(
    message: string,
    data?: Record<string, unknown>,
    effects?: string[],
    damage?: number[],
    stopChain = false
  ): RuleResult {
    return this.createSuccessResult(message, data, effects, damage, stopChain);
  }

  public testCreateFailureResult(
    message: string,
    data?: Record<string, unknown>,
    critical = false
  ): RuleResult {
    return this.createFailureResult(message, data, critical);
  }

  public testIsCommandType(command: Command, type: string): boolean {
    return this.isCommandType(command, type);
  }

  public testGetTemporaryData<T>(context: GameContext, key: string): T | null {
    return this.getTemporaryData<T>(context, key);
  }

  public testSetTemporaryData(context: GameContext, key: string, value: unknown): void {
    this.setTemporaryData(context, key, value);
  }

  public testExtractTypedParameters<T>(
    command: Command,
    validator: (params: unknown) => params is T
  ): T | null {
    return this.extractTypedParameters(command, validator);
  }
}

describe('Rule', () => {
  let mockContext: GameContext;
  let mockCommand: Command;

  beforeEach(() => {
    mockContext = {
      getTemporary: vi.fn(),
      setTemporary: vi.fn(),
    } as unknown as GameContext;

    mockCommand = {
      type: 'test-command',
    } as unknown as Command;
  });

  describe('RuleResult Interface', () => {
    it('should define success result structure', () => {
      const result: RuleResult = {
        success: true,
        message: 'Success',
        data: { value: 42 },
        effects: ['effect1', 'effect2'],
        damage: [8, 6],
      };

      expect(result.success).toBe(true);
      expect(result.message).toBe('Success');
      expect(result.data).toEqual({ value: 42 });
      expect(result.effects).toEqual(['effect1', 'effect2']);
      expect(result.damage).toEqual([8, 6]);
    });

    it('should define failure result structure', () => {
      const result: RuleResult = {
        success: false,
        message: 'Failure',
        critical: true,
        stopChain: true,
      };

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failure');
      expect(result.critical).toBe(true);
      expect(result.stopChain).toBe(true);
    });

    it('should support minimal result structure', () => {
      const result: RuleResult = {
        success: true,
        message: 'Simple success',
      };

      expect(result.success).toBe(true);
      expect(result.message).toBe('Simple success');
      expect(result.data).toBeUndefined();
      expect(result.effects).toBeUndefined();
    });
  });

  describe('Rule Interface', () => {
    it('should define required rule properties', () => {
      const rule = new TestRule();

      expect(rule.name).toBe('TestRule');
      expect(rule.priority).toBe(100);
      expect(typeof rule.execute).toBe('function');
      expect(typeof rule.canApply).toBe('function');
      expect(typeof rule.getPrerequisites).toBe('function');
    });

    it('should handle different priority values', () => {
      const testRule = new TestRule();
      const priorityRule = new PriorityRule();

      expect(testRule.priority).toBe(100);
      expect(priorityRule.priority).toBe(200);
      expect(priorityRule.priority).toBeGreaterThan(testRule.priority);
    });

    it('should support prerequisite specification', () => {
      const rule = new ConditionalRule();
      const prerequisites = rule.getPrerequisites();

      expect(prerequisites).toEqual(['prerequisite-rule']);
      expect(prerequisites.length).toBe(1);
    });
  });

  describe('BaseRule Implementation', () => {
    it('should execute successfully with basic implementation', async () => {
      const rule = new TestRule();
      const result = await rule.execute(mockContext, mockCommand);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Test rule executed successfully');
    });

    it('should check applicability correctly', () => {
      const conditionalRule = new ConditionalRule();

      expect(conditionalRule.canApply(mockContext, mockCommand)).toBe(true);

      const wrongCommand = { ...mockCommand, type: 'wrong-type' };
      expect(conditionalRule.canApply(mockContext, wrongCommand)).toBe(false);
    });

    it('should provide default empty prerequisites', () => {
      const rule = new TestRule();
      const prerequisites = rule.getPrerequisites();

      expect(prerequisites).toEqual([]);
      expect(prerequisites.length).toBe(0);
    });

    it('should handle conditional execution logic', async () => {
      const rule = new ConditionalRule();

      const validResult = await rule.execute(mockContext, mockCommand);
      expect(validResult.success).toBe(true);
      expect(validResult.data).toEqual({ commandType: 'test-command' });

      const invalidCommand = { ...mockCommand, type: 'invalid' };
      const invalidResult = await rule.execute(mockContext, invalidCommand);
      expect(invalidResult.success).toBe(false);
    });
  });

  describe('BaseRule Helper Methods', () => {
    let rule: TestableRule;

    beforeEach(() => {
      rule = new TestableRule();
    });

    it('should create success results correctly', () => {
      const result = rule.testCreateSuccessResult(
        'Success message',
        { key: 'value' },
        ['effect1'],
        [10],
        true
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Success message');
      expect(result.data).toEqual({ key: 'value' });
      expect(result.effects).toEqual(['effect1']);
      expect(result.damage).toEqual([10]);
      expect(result.stopChain).toBe(true);
    });

    it('should create failure results correctly', () => {
      const result = rule.testCreateFailureResult('Failure message', { error: 'test' }, true);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failure message');
      expect(result.data).toEqual({ error: 'test' });
      expect(result.critical).toBe(true);
      expect(result.stopChain).toBe(true);
    });

    it('should check command types correctly', () => {
      expect(rule.testIsCommandType(mockCommand, 'test-command')).toBe(true);
      expect(rule.testIsCommandType(mockCommand, 'wrong-type')).toBe(false);
    });

    it('should handle temporary data operations', () => {
      const mockGet = vi.fn().mockReturnValue('test-value');
      const mockSet = vi.fn();

      mockContext.getTemporary = mockGet;
      mockContext.setTemporary = mockSet;

      const value = rule.testGetTemporaryData(mockContext, 'test-key');
      expect(value).toBe('test-value');
      expect(mockGet).toHaveBeenCalledWith('test-key');

      rule.testSetTemporaryData(mockContext, 'test-key', 'new-value');
      expect(mockSet).toHaveBeenCalledWith('test-key', 'new-value');
    });

    it('should extract typed parameters correctly', () => {
      const validator = (params: unknown): params is { test: boolean } => {
        return typeof params === 'object' && params !== null && 'test' in params;
      };

      const commandWithParams = { ...mockCommand, params: { test: true } } as unknown as Command;
      const result = rule.testExtractTypedParameters(commandWithParams, validator);
      expect(result).toEqual({ test: true });

      const invalidCommand = { ...mockCommand, params: 'invalid' } as unknown as Command;
      const invalidResult = rule.testExtractTypedParameters(invalidCommand, validator);
      expect(invalidResult).toBeNull();
    });
  });

  describe('Rule Execution Flow', () => {
    it('should handle successful rule execution', async () => {
      const rule = new TestRule();

      if (rule.canApply(mockContext, mockCommand)) {
        const result = await rule.execute(mockContext, mockCommand);
        expect(result.success).toBe(true);
        expect(result.message).toBe('Test rule executed successfully');
      }
    });

    it('should handle rule chain termination', async () => {
      class StopChainRule extends BaseRule {
        readonly name = 'StopChainRule';

        async execute(): Promise<RuleResult> {
          return this.createSuccessResult('Stopping chain', {}, [], [], true);
        }

        canApply(): boolean {
          return true;
        }
      }

      const rule = new StopChainRule();
      const result = await rule.execute();

      expect(result.success).toBe(true);
      expect(result.stopChain).toBe(true);
    });

    it('should handle critical failure scenarios', async () => {
      class CriticalFailRule extends BaseRule {
        readonly name = 'CriticalFailRule';

        async execute(): Promise<RuleResult> {
          return this.createFailureResult('Critical failure occurred', {}, true);
        }

        canApply(): boolean {
          return true;
        }
      }

      const rule = new CriticalFailRule();
      const result = await rule.execute();

      expect(result.success).toBe(false);
      expect(result.critical).toBe(true);
      expect(result.stopChain).toBe(true);
    });
  });

  describe('OSRIC Compliance', () => {
    it('should implement authentic OSRIC/AD&D 1st Edition rule mechanics', async () => {
      class OSRICRule extends BaseRule {
        readonly name = 'OSRICRule';

        async execute(_context: GameContext, _command: Command): Promise<RuleResult> {
          const roll = Math.floor(Math.random() * 20) + 1;
          const savingThrow = 15;

          if (roll >= savingThrow) {
            return this.createSuccessResult('Saving throw succeeded', {
              roll,
              required: savingThrow,
            });
          }
          return this.createFailureResult('Saving throw failed', { roll, required: savingThrow });
        }

        canApply(): boolean {
          return true;
        }
      }

      const rule = new OSRICRule();
      const result = await rule.execute(mockContext, mockCommand);

      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      expect(result.data).toHaveProperty('roll');
      expect(result.data).toHaveProperty('required');
    });

    it('should support OSRIC damage and effect systems', async () => {
      class DamageRule extends BaseRule {
        readonly name = 'DamageRule';

        async execute(): Promise<RuleResult> {
          const damage = Math.floor(Math.random() * 8) + 1;

          return this.createSuccessResult(
            'Attack hits for damage',
            { weaponType: 'longsword' },
            ['weapon-damage'],
            [damage]
          );
        }

        canApply(): boolean {
          return true;
        }
      }

      const rule = new DamageRule();
      const result = await rule.execute();

      expect(result.success).toBe(true);
      expect(result.damage).toBeDefined();
      expect(result.damage?.length).toBe(1);
      expect(result.damage?.[0]).toBeGreaterThanOrEqual(1);
      expect(result.damage?.[0]).toBeLessThanOrEqual(8);
      expect(result.effects).toContain('weapon-damage');
    });

    it('should handle OSRIC spell casting rules', async () => {
      class SpellRule extends BaseRule {
        readonly name = 'SpellRule';

        async execute(_context: GameContext, command: Command): Promise<RuleResult> {
          if (command.type !== 'cast-spell') {
            return this.createFailureResult('Wrong command type');
          }

          return this.createSuccessResult(
            'Spell cast successfully',
            { spellLevel: 1, school: 'evocation' },
            ['spell-cast', 'magical-energy']
          );
        }

        canApply(_context: GameContext, command: Command): boolean {
          return command.type === 'cast-spell';
        }
      }

      const spellCommand = { type: 'cast-spell' } as unknown as Command;
      const rule = new SpellRule();

      expect(rule.canApply(mockContext, spellCommand)).toBe(true);

      const result = await rule.execute(mockContext, spellCommand);
      expect(result.success).toBe(true);
      expect(result.effects).toContain('spell-cast');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined contexts gracefully', async () => {
      const rule = new TestRule();

      const result = await rule.execute(null as unknown as GameContext, mockCommand);
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
    });

    it('should handle malformed commands', () => {
      const rule = new ConditionalRule();
      const malformedCommand = {} as Command;

      expect(() => rule.canApply(mockContext, malformedCommand)).not.toThrow();
      expect(rule.canApply(mockContext, malformedCommand)).toBe(false);
    });

    it('should handle empty prerequisite lists', () => {
      const rule = new TestRule();
      const prerequisites = rule.getPrerequisites();

      expect(Array.isArray(prerequisites)).toBe(true);
      expect(prerequisites.length).toBe(0);
    });

    it('should handle complex data structures in results', async () => {
      class ComplexDataRule extends BaseRule {
        readonly name = 'ComplexDataRule';

        async execute(): Promise<RuleResult> {
          return this.createSuccessResult('Complex data result', {
            nested: { value: 42 },
            array: [1, 2, 3],
            boolean: true,
            null: null,
          });
        }

        canApply(): boolean {
          return true;
        }
      }

      const rule = new ComplexDataRule();
      const result = await rule.execute();

      expect(result.data).toHaveProperty('nested');
      expect(result.data).toHaveProperty('array');
      expect(result.data?.nested).toEqual({ value: 42 });
      expect(result.data?.array).toEqual([1, 2, 3]);
    });
  });
});
