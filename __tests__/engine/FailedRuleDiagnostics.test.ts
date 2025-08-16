import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { Rule } from '../../osric/command/Rule';
import { defineCommand } from '../../osric/command/define';
import { registerCommand, resetRegisteredCommands } from '../../osric/command/register';
import { Engine } from '../../osric/engine/Engine';

// Step 9: diagnostics coverage for failedRule on structural (engine) and domain failures.

describe('failedRule diagnostics population', () => {
  beforeEach(() => resetRegisteredCommands());

  it('sets failedRule on domain failure without subsequent rules executing', async () => {
    class StartRule extends Rule<{ started: boolean }> {
      static ruleName = 'StartRule';
      static output = z.object({ started: z.boolean() });
      apply() {
        return { started: true };
      }
    }
    class DomainFailRule extends Rule<Record<string, never>> {
      static ruleName = 'DomainFailRule';
      static after = ['StartRule'];
      static output = z.object({});
      apply(ctx: unknown) {
        const f = (ctx as { fail: (code: 'NO_LEADER', msg: string) => { __fail: true } }).fail(
          'NO_LEADER',
          'Missing leader'
        );
        return f as unknown as Record<string, never>;
      }
    }
    class LaterRule extends Rule<{ shouldNot?: boolean }> {
      static ruleName = 'LaterRule';
      static after = ['DomainFailRule'];
      static output = z.object({ shouldNot: z.boolean().optional() });
      apply() {
        return { shouldNot: true };
      }
    }
    const Cmd = defineCommand({
      key: 'DomainFailDiag',
      params: z.object({}),
      rules: [StartRule, DomainFailRule, LaterRule],
    });
    registerCommand(Cmd as unknown as typeof Cmd);
    const engine = new Engine();
    await engine.start();
    const res = await engine.execute('DomainFailDiag', {});
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe('NO_LEADER');
      const fr = (res as { diagnostics?: { failedRule?: string } }).diagnostics?.failedRule;
      expect(fr).toBe('DomainFailRule');
    }
  });

  it('sets failedRule on structural validation failure (RULE_EXCEPTION)', async () => {
    class BadRule extends Rule<{ value: number }> {
      static ruleName = 'BadRule';
      static output = z.object({ value: z.number().int() });
      apply() {
        return { value: 'oops' } as unknown as { value: number };
      }
    }
    const Cmd = defineCommand({ key: 'StructFailDiag', params: z.object({}), rules: [BadRule] });
    registerCommand(Cmd as unknown as typeof Cmd);
    const engine = new Engine();
    await engine.start();
    const res = await engine.execute('StructFailDiag', {});
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe('RULE_EXCEPTION');
      const fr = (res as { diagnostics?: { failedRule?: string } }).diagnostics?.failedRule;
      expect(fr).toBe('BadRule');
    }
  });
});
