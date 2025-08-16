// CE-10 Store Interface & Snapshot utilities
// Defines EngineStore used by the Engine facade. Snapshot strategy: deep structural
// clone of plain objects / arrays / primitives. Functions & symbols are unsupported
// and will throw to surface non-plain data early.

export interface EngineStore {
  snapshot(): unknown;
  restore(snapshot: unknown): void;
}

// Deep clone for plain JSON-like structures plus BigInt support. Throws on functions / symbols.
export function deepClonePlain<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Date) return new Date(value.getTime()) as unknown as T; // date support (stable)
  if (Array.isArray(value)) return value.map((v) => deepClonePlain(v)) as unknown as T;
  if (value instanceof Map || value instanceof Set) {
    // Not supported per minimal spec – surface early.
    throw new Error('Unsupported store value type (Map/Set) in snapshot');
  }
  const out: Record<string | symbol, unknown> = {};
  for (const k of Reflect.ownKeys(value as object)) {
    if (typeof k === 'symbol') throw new Error('Unsupported symbol key in store snapshot');
    const v = (value as Record<string, unknown>)[k];
    if (typeof v === 'function') throw new Error('Unsupported function value in store snapshot');
    if (typeof v === 'symbol') throw new Error('Unsupported symbol value in store snapshot');
    out[k] = deepClonePlain(v as unknown);
  }
  return out as T;
}

// Simple in-memory store implementation for engine tests.
export class MemoryStore<TState extends object = Record<string, unknown>> implements EngineStore {
  private state: TState;
  constructor(initial: TState) {
    this.state = deepClonePlain(initial);
  }
  snapshot(): unknown {
    return deepClonePlain(this.state);
  }
  restore(snapshot: unknown): void {
    this.state = deepClonePlain(snapshot) as TState;
  }
  // Test helper accessors
  getState(): TState {
    return this.state;
  }
  mutate(mutator: (state: TState) => void): void {
    mutator(this.state);
  }
}
