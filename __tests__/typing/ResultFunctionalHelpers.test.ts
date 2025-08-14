import { describe, expect, it } from 'vitest';
import { chain, isOk, mapResult, tapResult } from '../../osric';
import type { DomainCode } from '../../osric';
import { domainFailResult, ok } from '../../osric/types/result';

describe('Result functional helpers (Item 4)', () => {
  it('mapResult maps success data', () => {
    const r = ok(2);
    const mapped = mapResult(r, (n) => n * 3);
    expect(isOk(mapped) && mapped.data).toBe(6);
  });
  it('mapResult preserves failure', () => {
    const code: DomainCode = 'ATTACK_NOT_HIT';
    const fail = domainFailResult(code, 'bad');
    const mapped = mapResult(fail, (n: number) => n * 2);
    expect(mapped).toBe(fail);
  });
  it('tapResult side-effects only on success', () => {
    let side = 0;
    const r = ok(5);
    const tapped = tapResult(r, (n) => {
      side = n;
    });
    expect(side).toBe(5);
    expect(tapped).toBe(r);
    const code: DomainCode = 'ATTACK_NOT_HIT';
    const fail = domainFailResult(code, 'bad');
    side = 0;
    tapResult(fail, () => {
      side = 10;
    });
    expect(side).toBe(0);
  });
  it('chain sequences successes', () => {
    const r = ok(2);
    const chained = chain(r, (n) => ok(n + 3));
    expect(isOk(chained) && chained.data).toBe(5);
  });
  it('chain short-circuits on failure', () => {
    const code: DomainCode = 'ATTACK_NOT_HIT';
    const fail = domainFailResult(code, 'bad');
    const chained = chain(fail, (n: number) => ok(n + 1));
    expect(chained).toBe(fail);
  });
});
