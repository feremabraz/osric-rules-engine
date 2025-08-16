import { describe, expect, it } from 'vitest';
import {
  domainFail,
  engineFail,
  isDomainFailure,
  isEngineFailure,
  isSuccess,
  success,
} from '../../engine/core/result';
import type {
  CommandOutcome,
  DomainFailureResult,
  EngineFailureResult,
  SuccessResult,
} from '../../engine/core/result';

describe('CE-02 Result & Failure Types', () => {
  it('constructs success', () => {
    const r = success({ value: 1 }, [{ type: 't', target: 'x' }]);
    expect(r.ok).toBe(true);
    expect(r.type).toBe('success');
    expect(r.data.value).toBe(1);
    expect(Object.isFrozen(r)).toBe(true);
  });
  it('constructs domain failure', () => {
    const r = domainFail('NOT_FOUND', 'missing');
    expect(r.ok).toBe(false);
    expect(r.type).toBe('domain-failure');
    expect(r.code).toBe('NOT_FOUND');
    expect(Object.isFrozen(r)).toBe(true);
  });
  it('constructs engine failure', () => {
    const r = engineFail('UNKNOWN_COMMAND', 'bad');
    expect(r.ok).toBe(false);
    expect(r.type).toBe('engine-failure');
    expect(r.code).toBe('UNKNOWN_COMMAND');
  });
  it('type narrowing via guards', () => {
    const outcomes: CommandOutcome[] = [success(5), domainFail('X'), engineFail('PARAM_INVALID')];
    const summary = outcomes
      .map((o) => {
        if (isSuccess(o)) return 'S';
        if (isDomainFailure(o)) return 'D';
        if (isEngineFailure(o)) return 'E';
        return 'U';
      })
      .join('');
    expect(summary).toBe('SDE');
  });
  it('guards refine types', () => {
    const r: CommandOutcome = success<{ a: number }>({ a: 1 });
    if (isSuccess(r)) {
      const v = r as SuccessResult<{ a: number }>; // refined assertion
      expect(v.data.a).toBe(1);
    }
    const d: CommandOutcome = domainFail('X');
    if (isDomainFailure(d)) {
      const v: DomainFailureResult = d;
      expect(v.code).toBe('X');
    }
    const e: CommandOutcome = engineFail('PARAM_INVALID');
    if (isEngineFailure(e)) {
      const v: EngineFailureResult = e;
      expect(v.code).toBe('PARAM_INVALID');
    }
  });
  it('effects arrays are cloned', () => {
    const arr = [{ type: 'a', target: 't' as const }];
    const r = success({}, arr);
    expect(r.effects).not.toBe(arr);
  });
});
