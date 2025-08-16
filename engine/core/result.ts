// CE-02 Result & Failure Types
// Unified discriminated union for command outcomes.

export interface Effect {
  type: string;
  target: string;
  payload?: unknown;
}

export type EngineFailureCode =
  | 'PARAM_INVALID'
  | 'RULE_EXCEPTION'
  | 'DUPLICATE_RESULT_KEY'
  | 'INTEGRITY_MUTATION'
  | 'UNKNOWN_COMMAND';

export interface SuccessResult<T = unknown> {
  ok: true;
  type: 'success';
  data: T;
  effects: Effect[];
}

export interface DomainFailureResult {
  ok: false;
  type: 'domain-failure';
  code: string; // domain-specific code
  message?: string;
  effects: Effect[]; // usually empty; included for completeness / future use
}

export interface EngineFailureResult {
  ok: false;
  type: 'engine-failure';
  code: EngineFailureCode;
  message?: string;
  effects: Effect[]; // engine failures should not normally have effects
}

export type CommandOutcome<T = unknown> =
  | SuccessResult<T>
  | DomainFailureResult
  | EngineFailureResult;

// Helper constructors (frozen to discourage mutation of return objects)
export function success<T>(data: T, effects: Effect[] = []): SuccessResult<T> {
  const r: SuccessResult<T> = { ok: true, type: 'success', data, effects: effects.slice() };
  return Object.freeze(r);
}

export function domainFail(
  code: string,
  message?: string,
  effects: Effect[] = []
): DomainFailureResult {
  const r: DomainFailureResult = {
    ok: false,
    type: 'domain-failure',
    code,
    message,
    effects: effects.slice(),
  };
  return Object.freeze(r);
}

export function engineFail(
  code: EngineFailureCode,
  message?: string,
  effects: Effect[] = []
): EngineFailureResult {
  const r: EngineFailureResult = {
    ok: false,
    type: 'engine-failure',
    code,
    message,
    effects: effects.slice(),
  };
  return Object.freeze(r);
}

// Type guards (optional convenience)
export function isSuccess<T>(o: CommandOutcome<T>): o is SuccessResult<T> {
  return o.ok;
}
export function isDomainFailure(o: CommandOutcome): o is DomainFailureResult {
  return !o.ok && o.type === 'domain-failure';
}
export function isEngineFailure(o: CommandOutcome): o is EngineFailureResult {
  return !o.ok && o.type === 'engine-failure';
}
