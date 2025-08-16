import { beforeEach, describe, expect, it } from 'vitest';
import { command } from '../../engine/authoring/dsl';
import { MemoryStore } from '../../engine/core/types';
import { Engine } from '../../engine/facade/engine';
import { CommandRegistry } from '../../engine/facade/registry';

// MemoryStore implementing EngineStore
const makeStore = () => new MemoryStore({});

describe('CE-09 Engine Facade', () => {
  beforeEach(() => {
    CommandRegistry.clear();
  });

  it('executes a known command', () => {
    command('facadeTest')
      .validate(() => ({ value: 10 }))
      .emit(() => ({}));
    const engine = new Engine({ store: makeStore(), seed: 123 });
    const r = engine.execute('facadeTest', {});
    expect(r.ok).toBe(true);
    if (r.ok) expect((r.data as Record<string, unknown>).value).toBe(10);
  });

  it('unknown command produces engine failure', () => {
    const engine = new Engine({ store: makeStore(), seed: 1 });
    const r = engine.execute('missing', {});
    expect(r.ok).toBe(false);
    if (!r.ok && r.type === 'engine-failure') expect(r.code).toBe('UNKNOWN_COMMAND');
  });

  it('batch aggregates results & effects (non-atomic placeholder)', () => {
    command('cmdA')
      .validate(() => ({ a: 1 }))
      .emit(() => ({}));
    command('cmdB')
      .validate(() => ({ b: 2 }))
      .emit(() => ({}));
    command('failCmd')
      .validate(() => ({}))
      .calc(() => {
        throw new Error('boom');
      })
      .emit(() => ({}));
    const engine = new Engine({ store: makeStore(), seed: 42 });
    const batch = engine.batch([
      { key: 'cmdA', params: {} },
      { key: 'failCmd', params: {} },
      { key: 'cmdB', params: {} },
    ]);
    expect(batch.results.length).toBe(3);
    const successCount = batch.results.filter((r) => r.ok).length;
    expect(successCount).toBe(2); // failCmd fails
    expect(batch.effects.length).toBe(0); // no rule emitted effects
  });
});
