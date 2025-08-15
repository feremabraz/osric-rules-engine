import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { Command, Engine, registerCommand, resetRegisteredCommands } from '../../osric';
import type { RuleCtx } from '../../osric';

describe('Error model & domain failures', () => {
  it('domain failure short-circuits with specific domain code and prevents later rules', async () => {
    resetRegisteredCommands();
    const C = class extends Command {
      static key = 'dom';
      static params = z.object({});
      static rules = [
        class StartRule extends class {} {
          static ruleName = 'Start';
          static output = z.object({ begun: z.boolean().optional() });
          apply(_ctx: unknown) {
            return { begun: true };
          }
        },
        class FailRule extends class {} {
          static ruleName = 'Fail';
          static after = ['Start'];
          static output = z.object({});
          apply(ctx: unknown) {
            return (
              ctx as { fail: (code: 'NO_LEADER', msg: string) => Record<string, unknown> }
            ).fail('NO_LEADER', 'No party leader set');
          }
        },
        class NeverRule extends class {} {
          static ruleName = 'Never';
          static after = ['Fail'];
          static output = z.object({ shouldNot: z.boolean().optional() });
          apply(_ctx: unknown) {
            return { shouldNot: true };
          }
        },
      ];
    };
    registerCommand(C);
    const engine = new Engine();
    await engine.start();
    const res = await engine.execute('dom', {});
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe('NO_LEADER');
      expect(res.error.message).toContain('No party leader set');
    }
  });
});
