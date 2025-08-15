// Shared deepFreeze utility for execution immutability enforcement.
// Extracted from previous inline implementation in Engine.ts (Roadmap Item 8 scaffold).
export function deepFreeze<T>(value: T, seen: WeakSet<object> = new WeakSet()): T {
  if (value === null) return value;
  const t = typeof value;
  if (t !== 'object' && t !== 'function') return value;
  if (t === 'function') return value; // do not traverse functions
  const obj = value as unknown as object;
  if (seen.has(obj)) return value; // cycle guard
  seen.add(obj);
  if (Object.isFrozen(obj)) return value;
  const proto = Object.getPrototypeOf(obj);
  const isPlain = proto === Object.prototype || proto === Array.prototype;
  if (isPlain) {
    for (const key of Object.keys(obj) as (keyof typeof obj)[]) {
      const child = (obj as Record<string, unknown>)[key as string];
      if (child && typeof child === 'object') deepFreeze(child as unknown as object, seen);
    }
  }
  try {
    Object.freeze(obj);
  } catch {
    /* ignore */
  }
  return value;
}
