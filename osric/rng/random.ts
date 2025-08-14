// Phase 7: Deterministic RNG (simple LCG)
export interface Rng {
  int(min: number, max: number): number; // inclusive
  float(): number; // [0,1)
  clone(): Rng;
  getState(): number; // expose internal state for testing determinism
  setState(n: number): void; // controlled override (test only)
}

export function createRng(seed?: number): Rng {
  let state = (seed ?? 1) >>> 0;
  const a = 1664525;
  const c = 1013904223;
  const m = 0xffffffff;
  function next(): number {
    state = (Math.imul(state, a) + c) & m;
    return state >>> 0;
  }
  const api: Rng = {
    int(min: number, max: number) {
      let aMin = min;
      let aMax = max;
      if (aMax < aMin) {
        const tmp = aMin;
        aMin = aMax;
        aMax = tmp;
      }
      const span = aMax - aMin + 1;
      return aMin + (next() % span);
    },
    float() {
      return next() / 0xffffffff;
    },
    clone() {
      return createRng(state);
    },
    getState() {
      return state;
    },
    setState(n: number) {
      state = n >>> 0;
    },
  };
  return api;
}
