import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { RuleCtx } from '../../osric';
import { Command } from '../../osric/command/Command';
import { Rule } from '../../osric/command/Rule';
import { defineCommand, emptyOutput } from '../../osric/command/define';
import { registerCommand, resetRegisteredCommands } from '../../osric/command/register';
import { Engine } from '../../osric/engine/Engine';

class ManualEchoCommand extends Command {
  static key = 'manualEcho';
  static params = z.object({ value: z.number().int() });
  static rules = [
    class EchoRule extends Rule<{ echoed: number }> {
      static ruleName = 'Echo';
      static output = z.object({ echoed: z.number().int() });
      apply(ctx: unknown) {
        const c = ctx as RuleCtx<{ value: number }, Record<string, never>>;
        return { echoed: c.params.value };
      }
    },
  ];
}

const SugarEchoRule = class extends Rule<{ echoed: number }> {
  static ruleName = 'Echo';
  static output = z.object({ echoed: z.number().int() });
  apply(ctx: unknown) {
    const c = ctx as RuleCtx<{ value: number }, Record<string, never>>;
    return { echoed: c.params.value };
  }
};

const SugarEchoCommand = defineCommand({
  key: 'sugarEcho',
  params: z.object({ value: z.number().int() }),
  rules: [SugarEchoRule],
});

describe('defineCommand sugar (Item 12)', () => {
  it('parity with manual command', async () => {
    resetRegisteredCommands();
    registerCommand(ManualEchoCommand as unknown as typeof Command);
    registerCommand(SugarEchoCommand as unknown as typeof Command);
    const engine = new Engine({ autoDiscover: false });
    await engine.start();
    const manualRes = await engine.command.manualEcho({ value: 7 });
    const sugarRes = await engine.command.sugarEcho({ value: 7 });
    expect(manualRes.ok).toBe(true);
    expect(sugarRes.ok).toBe(true);
    if (manualRes.ok && sugarRes.ok) {
      const mData = manualRes.data as { echoed: number };
      const sData = sugarRes.data as { echoed: number };
      expect(mData.echoed).toBe(7);
      expect(sData.echoed).toBe(7);
    }
  });
  it('emptyOutput constant is frozen', () => {
    expect(Object.isFrozen(emptyOutput)).toBe(true);
    expect(emptyOutput).toEqual({});
  });
});
