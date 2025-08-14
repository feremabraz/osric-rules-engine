import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { Command, Engine, registerCommand, resetRegisteredCommands } from '../../osric';

// Cyclic dependency rules
class A extends class {} {
  static ruleName = 'A';
  static after = ['B'];
  static output = z.object({});
  // This will never run due to cycle; implementation minimal
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  apply(_ctx: unknown) {
    return {};
  }
}
class B extends class {} {
  static ruleName = 'B';
  static after = ['A'];
  static output = z.object({});
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  apply(_ctx: unknown) {
    return {};
  }
}
class CyclicCommand extends Command {
  static key = 'cycle';
  static params = z.object({});
  static rules = [A, B];
}

// Command to test positional adaptation misuse (passing primitive when first field isn't primitive)
const WeirdParams = z.object({ nested: z.object({ value: z.number() }) });
class WeirdRule extends class {} {
  static ruleName = 'Weird';
  static output = z.object({ seen: z.number().int() });
  apply(ctx: unknown) {
    const c = ctx as {
      params: { nested: { value: number } };
      ok: (d: Record<string, unknown>) => unknown;
    };
    c.ok({ seen: c.params.nested.value });
    return { seen: c.params.nested.value };
  }
}
class WeirdCommand extends Command {
  static key = 'weird';
  static params = WeirdParams;
  static rules = [WeirdRule];
}

describe('Integration: stabilization edge cases', () => {
  it('engine.start throws on cyclic dependency', async () => {
    resetRegisteredCommands();
    registerCommand(CyclicCommand as unknown as typeof Command);
    const engine = new Engine();
    await expect(engine.start()).rejects.toThrow(/Cyclic dependency/);
  });

  // Duplicate result keys with identical schemas are now allowed; conflict test removed.

  it('positional adaptation does not incorrectly coerce nested param objects', async () => {
    resetRegisteredCommands();
    registerCommand(WeirdCommand as unknown as typeof Command);
    const engine = new Engine();
    await engine.start();
    // Passing only a primitive should fail param validation since schema expects object with nested
    const bad = await engine.execute('weird', 123 as unknown as { nested: { value: number } });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error.code).toBe('PARAM_INVALID');
    // Proper invocation
    const good = await engine.execute('weird', { nested: { value: 7 } });
    expect(good.ok).toBe(true);
    if (good.ok) expect(good.data.seen).toBe(7);
  });
});
