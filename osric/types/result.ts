import type { DomainCode, EngineStructuralCode } from '../errors/codes';

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

export interface Diagnostics {
  command?: string;
  rules?: { name: string; durationMs: number }[];
  entityDiff?: { created: number; mutated: number; deleted: number };
  effects?: { emitted: number; mirrored?: number };
  rng?: { draws: number };
  failedRule?: string;
}

export type Result<Ok> =
  | { ok: true; data: Ok; diagnostics?: Diagnostics }
  | (EngineFailure & { diagnostics?: Diagnostics })
  | (DomainFailureResult & { diagnostics?: Diagnostics });

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
