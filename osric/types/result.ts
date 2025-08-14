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
