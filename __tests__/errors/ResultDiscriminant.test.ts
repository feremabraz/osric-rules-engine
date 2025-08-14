import { describe, expect, it } from 'vitest';
import { Engine } from '../../osric';
import type { Result } from '../../osric/types/result';
import { isDomainFailure, isEngineFailure } from '../../osric/types/result';

// Phase 08 tests for discriminated Result helpers

describe('Result discriminants (Phase 08)', () => {
  it('PARAM_INVALID is an engine failure', async () => {
    const engine = new Engine();
    await engine.start();
    // Missing required param fields to trigger PARAM_INVALID (e.g. createCharacter needs race/class/name)
    interface ExecIfc {
      execute(k: string, p: unknown): Promise<Result<Record<string, unknown>>>;
    }
    const execRaw = (engine as unknown as ExecIfc).execute.bind(engine as unknown as ExecIfc);
    const res = await execRaw('createCharacter', { bogus: true });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.kind).toBe('engine');
      expect(res.error.code).toBe('PARAM_INVALID');
      expect(isEngineFailure(res)).toBe(true);
      expect(isDomainFailure(res)).toBe(false);
    }
  });

  it('Character not found path is a domain failure', async () => {
    const engine = new Engine();
    await engine.start();
    // gainExperience with unknown id
    interface ExecIfc {
      execute(k: string, p: unknown): Promise<Result<Record<string, unknown>>>;
    }
    const execRaw = (engine as unknown as ExecIfc).execute.bind(engine as unknown as ExecIfc);
    const res = await execRaw('gainExperience', {
      characterId: 'char_missing',
      amount: 10,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.kind).toBe('domain');
      expect(res.error.code).toBe('CHARACTER_NOT_FOUND');
      expect(isDomainFailure(res)).toBe(true);
      expect(isEngineFailure(res)).toBe(false);
    }
  });
});
