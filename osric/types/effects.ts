// Phase 03: Effect descriptor and collector types
export interface Effect<Payload = unknown> {
  type: string;
  target: string; // entity id or other target identifier
  payload?: Payload;
}

export interface EffectCollector {
  readonly all: ReadonlyArray<Effect>;
  add: (type: string, target: string, payload?: unknown) => void;
  size: () => number;
}

export function createEffectCollector(): EffectCollector {
  const internal: Effect[] = [];
  return Object.freeze({
    get all() {
      return internal as ReadonlyArray<Effect>;
    },
    add(type: string, target: string, payload?: unknown) {
      internal.push({ type, target, payload });
    },
    size() {
      return internal.length;
    },
  });
}
