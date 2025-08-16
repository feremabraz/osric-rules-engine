import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { Command, Engine, assertOk, isFail, isOk } from '../../osric';
import type { RuleCtx } from '../../osric';
import { registerCommand, resetRegisteredCommands } from '../../osric/command/register';

class R1 extends class {} {
  static ruleName = 'Validate';
  static output = z.object({ valid: z.boolean() });
  apply() {
    return { valid: true };
  }
}
class R2 extends class {} {
  static ruleName = 'AfterValidate';
  static after = ['Validate'];
  static output = z.object({ total: z.number().int() });
  apply(ctx: unknown) {
    const c = ctx as RuleCtx<{ a: number }, { valid: boolean }> & { acc: { valid: boolean } };
    return { total: c.acc.valid ? 1 : 0 };
  }
}
class SampleCommand extends Command {
  static key = 'sample';
  static params = z.object({ a: z.number().int() });
  static rules = [R1, R2];
}

describe('Engine execution & proxy', () => {
  it('executes command returning accumulator', async () => {
    resetRegisteredCommands();
    registerCommand(SampleCommand);
    const engine = new Engine();
    await engine.start();
    const res = await engine.execute('sample', { a: 1 });
    expect(isOk(res)).toBe(true);
    expect(assertOk(res)).toEqual({ valid: true, total: 1 });
  });
  it('param invalid returns failure result', async () => {
    resetRegisteredCommands();
    registerCommand(SampleCommand);
    const engine = new Engine();
    await engine.start();
    const res = await engine.execute('sample', { a: 'x' });
    expect(isFail(res)).toBe(true);
    if (isFail(res)) expect(res.error.code).toBe('PARAM_INVALID');
  });
  it('command proxy invokes execute', async () => {
    resetRegisteredCommands();
    registerCommand(SampleCommand);
    const engine = new Engine();
    await engine.start();
    // @ts-ignore dynamic command injected
    const res = (await engine.command.sample({ a: 5 })) as import('../../osric').Result<{
      valid: boolean;
      total: number;
    }>;
    expect(isOk(res)).toBe(true);
    if (isOk(res)) expect(res.data.total).toBe(1);
  });
  it('rejects commands whose rules duplicate a result key (strict mode)', async () => {
    resetRegisteredCommands();
    const C1 = class extends Command {
      static key = 'c1';
      static params = z.object({});
      static rules = [
        class R1a extends class {} {
          static ruleName = 'R1';
          static output = z.object({ x: z.number().int() });
          apply() {
            return { x: 1 };
          }
        },
        class R2a extends class {} {
          static ruleName = 'R2';
          static after = ['R1'];
          static output = z.object({ x: z.number().int() });
          apply() {
            return { x: 2 };
          }
        },
      ];
    };
    registerCommand(C1);
    const engine = new Engine();
    await expect(engine.start()).rejects.toThrow(
      /CONFLICTING_RESULT_KEY: Duplicate result key 'x'/
    );
  });
});
