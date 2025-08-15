import { describe, expect, it } from 'vitest';
import { testEngine } from '../../osric/testing/testEngine';
import '../../osric/commands/createCharacter';

import { z } from 'zod';
import type { RuleCtx } from '../../osric';
// Simple command producing randomness via a rule
import { Command } from '../../osric/command/Command';
import type { CommandClass } from '../../osric/command/Command';
import { Rule } from '../../osric/command/Rule';
import { registerCommand, resetRegisteredCommands } from '../../osric/command/register';

class RandomRule extends Rule<{ roll: number }> {
  static ruleName = 'Random';
  static output = z.object({ roll: z.number().int() });
  apply(ctx: unknown) {
    const c = ctx as RuleCtx<Record<string, never>, Record<string, never>> & {
      rng: { int: (a: number, b: number) => number };
    };
    return { roll: c.rng.int(1, 6) };
  }
}
class RandomCommand extends Command {
  static key = 'random';
  static params = z.object({});
  static rules = [RandomRule];
}

describe('RNG: sequence determinism', () => {
  it('two engines same seed produce identical sequences', async () => {
    resetRegisteredCommands();
    const e1 = testEngine({ seed: 123 })
      .register(RandomCommand as unknown as CommandClass)
      .finalize();
    const e2 = testEngine({ seed: 123 })
      .register(RandomCommand as unknown as CommandClass)
      .finalize();
    await e1.start();
    await e2.start();
    const r1 = await e1.engine.execute('random', {});
    const r2 = await e2.engine.execute('random', {});
    expect(r1.ok && r2.ok).toBe(true);
    if (r1.ok && r2.ok) expect(r1.data.roll).toBe(r2.data.roll);
  });

  it('rngOverride allows forcing state', async () => {
    resetRegisteredCommands();
    const forced = 99999999;
    const e = testEngine({ seed: 5, rngOverride: (rng) => rng.setState(forced) })
      .register(RandomCommand as unknown as CommandClass)
      .finalize();
    await e.start();
    const r = await e.engine.execute('random', {});
    expect(r.ok).toBe(true);
  });
});
