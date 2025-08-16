// Stable hashing utilities (unified for accumulator integrity & command schema digests)

const MIX_CONST = 0x9e3779b1; // golden ratio derived prime-ish constant

function mixChar(hIn: number, code: number): number {
  let h = (hIn ^ code) >>> 0;
  h = Math.imul(h, MIX_CONST) >>> 0;
  return h >>> 0;
}

export function hashStrings(parts: string[]): string {
  let h = 0 >>> 0;
  for (const p of parts) {
    for (let i = 0; i < p.length; i++) {
      h = mixChar(h, p.charCodeAt(i));
    }
  }
  const hex = h.toString(16);
  return `${'00000000'.slice(hex.length)}${hex}`;
}

export function hashObject(obj: Record<string, unknown>): number {
  const stack: unknown[] = [obj];
  const seen = new WeakSet<object>();
  let h = 0 >>> 0;
  while (stack.length) {
    const current = stack.pop();
    if (current === null || current === undefined) continue;
    const t = typeof current;
    if (t !== 'object') {
      const prim = String(current);
      for (let i = 0; i < prim.length; i++) h = mixChar(h, prim.charCodeAt(i));
      continue;
    }
    const objCur = current as object;
    if (seen.has(objCur)) continue; // cycle / shared ref guard
    seen.add(objCur);
    const entries = Object.entries(current as Record<string, unknown>).sort((a, b) =>
      a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0
    );
    for (const [k, v] of entries) {
      for (let i = 0; i < k.length; i++) h = mixChar(h, k.charCodeAt(i));
      stack.push(v);
    }
  }
  return h >>> 0;
}
