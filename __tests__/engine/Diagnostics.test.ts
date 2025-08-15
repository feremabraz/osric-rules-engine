import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { CommandClass } from '../../osric/command/Command';
import { Rule } from '../../osric/command/Rule';
import { defineCommand } from '../../osric/command/define';
import { registerCommand, resetRegisteredCommands } from '../../osric/command/register';
import { Engine } from '../../osric/engine/Engine';

class ValidateRule extends Rule<{ alpha: number }> {
  static ruleName = 'ValidateRule';
  static output = z.object({ alpha: z.number() });
  apply() {
    return { alpha: 1 };
  }
}
(ValidateRule as unknown as { category?: string }).category = 'validate';
class CalcRule extends Rule<{ beta: number }> {
  static ruleName = 'CalcRule';
  static output = z.object({ beta: z.number() });
  apply() {
    return { beta: 2 };
  }
}
(CalcRule as unknown as { category?: string }).category = 'calc';
const Cmd = defineCommand({
  key: 'DiagCmd',
  params: z.object({}),
  rules: [ValidateRule, CalcRule],
});

describe('Diagnostics (Item 13)', () => {
  it('attaches diagnostics to success result', async () => {
    resetRegisteredCommands();
    registerCommand(Cmd as unknown as CommandClass);
    const engine = new Engine();
    await engine.start();
    const res = await engine.execute('DiagCmd', {});
    expect(res.ok).toBe(true);
    const diag = (
      res as {
        diagnostics?: {
          command: string;
          rules: unknown[];
          entityDiff: { created: number; mutated: number; deleted: number };
          effects: { emitted: number };
          rng: { draws: number };
        };
      }
    ).diagnostics;
    expect(diag).toBeTruthy();
    if (!diag) return;
    expect(diag.command).toBe('DiagCmd');
    expect(Array.isArray(diag.rules)).toBe(true);
    expect(diag.rules.length).toBe(2);
    expect(diag.entityDiff.created >= 0).toBe(true);
    expect(diag.effects.emitted).toBe(0);
    expect(typeof diag.rng.draws).toBe('number');
  });
});
