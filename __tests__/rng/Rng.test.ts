import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { Command, Engine } from '../../osric';
import type { RuleCtx } from '../../osric';
import { registerCommand, resetRegisteredCommands } from '../../osric/command/register';

class RandCommand extends Command {
  static key = 'rand';
  static params = z.object({});
  static rules = [
    class R1 extends class {} {
      static ruleName = 'R1';
      static output = z.object({ roll: z.number().int() });
      apply(ctx: unknown) {
        const c = ctx as RuleCtx<Record<string, never>, Record<string, never>> & {
          rng: { int: (a: number, b: number) => number };
        };
        return { roll: c.rng.int(1, 6) };
      }
    },
  ];
}

describe('RNG: basic determinism', () => {
  it('same seed deterministic first roll', async () => {
    resetRegisteredCommands();
    registerCommand(RandCommand);
    const a = new Engine({ seed: 100 });
    await a.start();
    const b = new Engine({ seed: 100 });
    await b.start();
    const r1 = await a.execute('rand', {});
    const r2 = await b.execute('rand', {});
    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    if (r1.ok && r2.ok) {
      expect(r1.data.roll).toBe(r2.data.roll);
      expect(typeof r1.data.roll).toBe('number');
    }
  });
});
