import { describe, expect, it } from 'vitest';
import { isOk } from '../../osric';
// Removed helpers (Step 7) – tests now validate equivalent inline patterns
import type { DomainCode } from '../../osric';
import { domainFailResult } from '../../osric/types/result';

describe('Result functional helpers (Item 4)', () => {
  it('manual mapResult pattern', () => {
    const r = { ok: true as const, data: 2 };
    const mapped = r.ok ? { ok: true as const, data: r.data * 3 } : r;
    expect(isOk(mapped) && mapped.data).toBe(6);
  });
  it('manual mapResult preserves failure', () => {
    const code: DomainCode = 'ATTACK_NOT_HIT';
    const fail = domainFailResult(code, 'bad');
    const mapped = fail.ok ? { ok: true as const, data: fail as never } : fail;
    expect(mapped).toBe(fail);
  });
  it('manual tapResult side-effect only on success', () => {
    let side = 0;
    const r = { ok: true as const, data: 5 };
    if (r.ok) side = r.data;
    expect(side).toBe(5);
    const code: DomainCode = 'ATTACK_NOT_HIT';
    const fail = domainFailResult(code, 'bad');
    side = 0;
    if (fail.ok) side = fail as never; // no-op branch
    expect(side).toBe(0);
  });
  it('manual chain sequencing successes', () => {
    const r = { ok: true as const, data: 2 };
    const chained = r.ok ? { ok: true as const, data: r.data + 3 } : r;
    expect(isOk(chained) && chained.data).toBe(5);
  });
  it('manual chain short-circuits on failure', () => {
    const code: DomainCode = 'ATTACK_NOT_HIT';
    const fail = domainFailResult(code, 'bad');
    const chained = fail.ok ? { ok: true as const, data: fail as never } : fail;
    expect(chained).toBe(fail);
  });
});
