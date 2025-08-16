import { describe, expect, it } from 'vitest';
import { command } from '../../engine/authoring/dsl';
import { EffectsBuffer } from '../../engine/core/effects';
import { runCommand } from '../../engine/core/executor';
import { domainFail } from '../../engine/core/result';
import { createRng } from '../../engine/core/rng';
import { CommandRegistry } from '../../engine/facade/registry';

interface ExecCtx {
  rng: ReturnType<typeof createRng>;
  effects: EffectsBuffer;
  [k: string]: unknown;
}
function ctx(): ExecCtx {
  return { rng: createRng(1), effects: new EffectsBuffer() };
}

describe('CE-08 Executor', () => {
  it('success path collects fragments and effects', () => {
    CommandRegistry.clear();
    const d = command<unknown, Record<string, unknown>, ExecCtx>('exec1')
      .validate((_acc) => ({ v: 1 }))
      .calc(() => ({ w: 2 }))
      .emit((_acc, _p, c) => {
        c.effects.add('E', 'T');
        return {};
      }); // returns descriptor
    const result = runCommand(d, {}, ctx());
    expect(result.ok).toBe(true);
    if (result.ok) {
      const data = result.data as Record<string, unknown>;
      expect(data.v).toBe(1);
      expect(data.w).toBe(2);
      expect(result.effects.length).toBe(1);
    }
  });

  it('duplicate result key yields engine failure', () => {
    CommandRegistry.clear();
    const d = command('dupKey')
      .validate(() => ({ a: 1 }))
      .calc(() => ({ a: 2 }))
      .emit(() => ({}));
    const r = runCommand(d, {}, ctx());
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.type).toBe('engine-failure');
      if (r.type === 'engine-failure') expect(r.code).toBe('DUPLICATE_RESULT_KEY');
    }
  });

  it('rule exception mapped to RULE_EXCEPTION', () => {
    CommandRegistry.clear();
    const d = command('boom')
      .validate(() => {
        throw new Error('boom');
      })
      .emit(() => ({}));
    const r = runCommand(d, {}, ctx());
    expect(r.ok).toBe(false);
    if (!r.ok && r.type === 'engine-failure') expect(r.code).toBe('RULE_EXCEPTION');
  });

  it('domain failure short-circuits and drops effects', () => {
    CommandRegistry.clear();
    const d = command('domainFail')
      .validate(() => domainFail('X'))
      .emit((_a, _p, c) => {
        (c as ExecCtx).effects.add('E', 'T');
        return {};
      });
    const r = runCommand(d, {}, ctx());
    expect(r.ok).toBe(false);
    if (!r.ok && r.type === 'domain-failure') {
      expect(r.code).toBe('X');
      expect(r.effects.length).toBe(0);
    }
  });

  it('integrity mutation detected when rule mutates accumulator', () => {
    CommandRegistry.clear();
    const d = command<unknown, Record<string, unknown>, ExecCtx>('mutateAcc')
      .validate((acc) => {
        (acc as Record<string, unknown>).illegal = 1;
        return {};
      })
      .emit(() => ({}));
    const r = runCommand(d, {}, ctx());
    expect(r.ok).toBe(false);
    if (!r.ok && r.type === 'engine-failure') expect(r.code).toBe('INTEGRITY_MUTATION');
  });
});
