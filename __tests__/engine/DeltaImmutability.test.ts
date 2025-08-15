import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { Rule } from '../../osric/command/Rule';
import { defineCommand } from '../../osric/command/define';
import { registerCommand, resetRegisteredCommands } from '../../osric/command/register';
import { Engine } from '../../osric/engine/Engine';
import type { RuleCtx } from '../../osric/execution/context';

// Simple command producing nested structure to test deep freeze.
const params = z.object({});
class ProduceNested extends Rule<{ top: { nested: { value: number }[] } }> {
  static ruleName = 'ProduceNested';
  static output = z.object({
    top: z.object({
      nested: z.array(z.object({ value: z.number() })),
    }),
  });
  apply(ctx: unknown) {
    void ctx;
    return { top: { nested: [{ value: 1 }, { value: 2 }] } };
  }
}
const TestCommand = defineCommand({ key: 'deltaFreezeTest', params, rules: [ProduceNested] });
type TestResult = { top: { nested: { value: number }[] } };

describe('Delta immutability enforcement', () => {
  it('freezes nested delta objects and arrays', async () => {
    resetRegisteredCommands();
    registerCommand(TestCommand as unknown as typeof TestCommand);
    const engine = new Engine({ seed: 42 });
    await engine.start();
    const res = await engine.execute('deltaFreezeTest', {});
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const result = res.data as TestResult;
    const top = result.top;
    expect(Object.isFrozen(top)).toBe(true);
    expect(Object.isFrozen(top.nested)).toBe(true);
    expect(Object.isFrozen(top.nested[0])).toBe(true);
    // Attempt mutation; should fail silently (no change) or throw in strict mode
    try {
      (top.nested[0] as unknown as { value: number }).value = 999;
    } catch {
      /* ignore */
    }
    expect(top.nested[0].value).toBe(1);
  });
});
