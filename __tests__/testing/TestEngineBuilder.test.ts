import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { Command } from '../../osric';
import type { RuleCtx } from '../../osric';
import { registerCommand, resetRegisteredCommands } from '../../osric/command/register';
import { testEngine } from '../../osric/testing/testEngine';

class EchoCommand extends Command {
  static key = 'echo';
  static params = z.object({ msg: z.string() });
  static rules = [
    class EmitRule extends class {} {
      static ruleName = 'Emit';
      static output = z.object({ echoed: z.string() });
      apply(ctx: unknown) {
        const c = ctx as RuleCtx<{ msg: string }, Record<string, never>>;
        return { echoed: c.params.msg };
      }
    },
  ];
}

describe('Testing harness: testEngine builder', () => {
  it('creates engine, registers command, seeds character', async () => {
    resetRegisteredCommands();
    const builder = testEngine({ seed: 5 })
      .register(EchoCommand)
      .withCharacter('hero', 'human', 'fighter', { name: 'Hero' });
    const inst = builder.finalize();
    const { engine } = inst;
    const { ids } = await inst.start();
    expect(Object.keys(ids)).toContain('hero'); // created via generic setEntity
    const res = await engine.execute('echo', { msg: 'hi' });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.echoed).toBe('hi');
    expect(engine.events.trace.length).toBeGreaterThan(0);
  });
});
