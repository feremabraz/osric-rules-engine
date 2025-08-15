import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import type { CommandClass } from '../../osric/command/Command';
import { Rule } from '../../osric/command/Rule';
import { defineCommand } from '../../osric/command/define';
import { registerCommand, resetRegisteredCommands } from '../../osric/command/register';
import { Engine } from '../../osric/engine/Engine';

// Item 10: Integrity Guard tests

describe('Integrity Guard', () => {
  beforeEach(() => {
    resetRegisteredCommands();
    // Clear tamper hook between tests (assign undefined instead of delete for lint rule)
    (globalThis as unknown as { __osricIntegrityTamper?: undefined }).__osricIntegrityTamper =
      undefined;
  });

  it('freezes rule delta objects (mutation attempts have no effect)', async () => {
    class ProvideDelta extends Rule<{ foo: { bar: number } }> {
      static ruleName = 'ProvideDelta';
      static output = z.object({ foo: z.object({ bar: z.number() }) });
      apply() {
        const obj = { foo: { bar: 1 } }; // will be deepFrozen
        return obj;
      }
    }
    const Cmd = defineCommand({
      key: 'IntegrityFreeze',
      params: z.object({}),
      rules: [ProvideDelta],
    });
    registerCommand(Cmd as unknown as CommandClass);
    const engine = new Engine();
    await engine.start();
    const res = await engine.execute('IntegrityFreeze', {});
    expect(res.ok).toBe(true);
    const foo = (res as unknown as { data: { foo: { bar: number } } }).data.foo;
    expect(Object.isFrozen(foo)).toBe(true);
    // Attempt mutation
    try {
      (foo as { bar: number }).bar = 42;
    } catch {
      /* frozen throws in strict mode */
    }
    expect(foo.bar).toBe(1);
  });

  it('detects deliberate post-merge mutation via test tamper hook (INTEGRITY_MUTATION)', async () => {
    class ProvideDelta extends Rule<{ x: number }> {
      static ruleName = 'ProvideDelta';
      static output = z.object({ x: z.number() });
      apply() {
        return { x: 10 };
      }
    }
    const Cmd = defineCommand({
      key: 'IntegrityTamper',
      params: z.object({}),
      rules: [ProvideDelta],
    });
    registerCommand(Cmd as unknown as CommandClass);
    const engine = new Engine();
    await engine.start();
    // Install tamper hook to mutate accumulator after hash updates but before final verification.
    (
      globalThis as unknown as { __osricIntegrityTamper?: (acc: Record<string, unknown>) => void }
    ).__osricIntegrityTamper = (acc) => {
      // Introduce mutation (change key) which will alter hash
      (acc as { x: number }).x = 999; // parent acc not frozen
    };
    const res = await engine.execute('IntegrityTamper', {});
    expect(res.ok).toBe(false);
    expect((res as unknown as { error: { code: string } }).error.code).toBe('INTEGRITY_MUTATION');
  });
});
