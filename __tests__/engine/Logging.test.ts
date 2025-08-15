import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { Rule } from '../../osric/command/Rule';
import { defineCommand } from '../../osric/command/define';
import { registerCommand, resetRegisteredCommands } from '../../osric/command/register';
import { Engine } from '../../osric/engine/Engine';

class LogRule extends Rule<{ value: number }> {
  static ruleName = 'LogRule';
  static output = z.object({ value: z.number() });
  apply(ctx: unknown) {
    const c = ctx as { logger: { info: (...a: unknown[]) => void } };
    c.logger.info('inside rule', 1);
    return { value: 42 };
  }
}
const params = z.object({});
const TestCmd = defineCommand({ key: 'logTest', params, rules: [LogRule] });

describe('Logging integration', () => {
  it('injects logger and records log calls', async () => {
    const calls: { level: string; args: unknown[] }[] = [];
    type TL = {
      debug: (...a: unknown[]) => void;
      info: (...a: unknown[]) => void;
      warn: (...a: unknown[]) => void;
      error: (...a: unknown[]) => void;
      child: (bindings: Record<string, unknown>) => TL;
    };
    const testLogger: TL = {
      debug: (...args: unknown[]) => calls.push({ level: 'debug', args }),
      info: (...args: unknown[]) => calls.push({ level: 'info', args }),
      warn: (...args: unknown[]) => calls.push({ level: 'warn', args }),
      error: (...args: unknown[]) => calls.push({ level: 'error', args }),
      child(bindings: Record<string, unknown>): TL {
        return {
          debug: (...a: unknown[]) => calls.push({ level: 'debug', args: [...a, bindings] }),
          info: (...a: unknown[]) => calls.push({ level: 'info', args: [...a, bindings] }),
          warn: (...a: unknown[]) => calls.push({ level: 'warn', args: [...a, bindings] }),
          error: (...a: unknown[]) => calls.push({ level: 'error', args: [...a, bindings] }),
          child: (this as TL).child.bind(this),
        } as TL;
      },
    };
    resetRegisteredCommands();
    registerCommand(TestCmd as unknown as typeof TestCmd);
    const engine = new Engine({ logger: testLogger, seed: 1 });
    await engine.start();
    const res = await engine.execute('logTest', {});
    expect(res.ok).toBe(true);
    const levels = calls.map((c) => c.level);
    expect(levels.includes('debug')).toBe(true); // lifecycle
    expect(levels.includes('info')).toBe(true); // rule body
  });
});
