// Result discriminated union (Phase 6 refined)
import type {
  CommandErrorCode,
  DomainCode,
  DomainFailure,
  EngineErrorCode,
  EngineStructuralCode,
  isStructuralCode,
} from '../errors/codes';

// Phase 08 refined Result discriminants
export type EngineFailure = {
  ok: false;
  kind: 'engine';
  error: { code: EngineStructuralCode; message: string };
};
export type DomainFailureResult = {
  ok: false;
  kind: 'domain';
  error: { code: DomainCode; message: string };
};
export type Result<Ok> = { ok: true; data: Ok } | EngineFailure | DomainFailureResult;

export const ok = <T>(data: T): Result<T> => ({ ok: true, data });
export const engineFail = (code: EngineStructuralCode, message: string): EngineFailure => ({
  ok: false,
  kind: 'engine',
  error: { code, message },
});
export const domainFailResult = (code: DomainCode, message: string): DomainFailureResult => ({
  ok: false,
  kind: 'domain',
  error: { code, message },
});

export function isEngineFailure<T>(r: Result<T>): r is EngineFailure {
  return !r.ok && r.kind === 'engine';
}
export function isDomainFailure<T>(r: Result<T>): r is DomainFailureResult {
  return !r.ok && r.kind === 'domain';
}

// Phase 06 Item 1: Result type guards & helpers
export function isOk<T>(r: Result<T>): r is { ok: true; data: T } {
  return r.ok === true;
}
export function isFail<T>(r: Result<T>): r is EngineFailure | DomainFailureResult {
  return r.ok === false;
}
export function assertOk<T>(r: Result<T>): T {
  if (isOk(r)) return r.data;
  const code = r.error.code;
  throw new Error(`Result not ok (code=${code})`);
}
export function unwrap<T>(r: Result<T>, fallback?: T): T {
  if (isOk(r)) return r.data;
  if (fallback !== undefined) return fallback;
  const code = r.error.code;
  throw new Error(`Result not ok and no fallback provided (code=${code})`);
}

// Phase 06 Item 4: Functional helpers
export function mapResult<A, B>(r: Result<A>, fn: (a: A) => B): Result<B> {
  if (isOk(r)) return ok(fn(r.data));
  return r as unknown as Result<B>; // failure branches carry through unchanged
}
export function tapResult<A>(r: Result<A>, side: (a: A) => void): Result<A> {
  if (isOk(r)) side(r.data);
  return r;
}
export function chain<A, B>(r: Result<A>, next: (a: A) => Result<B>): Result<B> {
  if (!isOk(r)) return r as unknown as Result<B>;
  return next(r.data);
}
