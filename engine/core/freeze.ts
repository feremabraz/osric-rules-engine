export type DeepReadonly<T> = T extends (...args: unknown[]) => unknown
  ? T
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

/** Deeply freezes an object graph (plain objects & arrays). */
export function deepFreeze<T>(value: T): DeepReadonly<T> {
  if (value === null) return value as DeepReadonly<T>;
  if (typeof value !== 'object') return value as DeepReadonly<T>;
  const seen = new WeakSet<object>();
  const stack: object[] = [value as unknown as object];
  while (stack.length) {
    const current = stack.pop();
    if (!current || seen.has(current)) continue;
    seen.add(current);
    Object.freeze(current);
    if (Array.isArray(current)) {
      for (const v of current)
        if (v && typeof v === 'object' && !seen.has(v)) stack.push(v as object);
    } else {
      for (const k of Object.keys(current as Record<string, unknown>)) {
        const v = (current as Record<string, unknown>)[k];
        if (v && typeof v === 'object' && !seen.has(v)) stack.push(v as object);
      }
    }
  }
  return value as DeepReadonly<T>;
}
