// 64-bit FNV-1a constants (BigInt)
const FNV_OFFSET_64 = 0xcbf29ce484222325n;
const FNV_PRIME_64 = 0x100000001b3n;

function mix64(h: bigint, byte: number): bigint {
  const x = (h ^ BigInt(byte & 0xff)) * FNV_PRIME_64;
  return x & 0xffffffffffffffffn;
}

function* utf8(str: string): Generator<number> {
  for (let i = 0; i < str.length; ) {
    const cp = str.codePointAt(i);
    if (cp === undefined) break;
    if (cp <= 0x7f) yield cp;
    else if (cp <= 0x7ff) {
      yield 0xc0 | (cp >> 6);
      yield 0x80 | (cp & 0x3f);
    } else if (cp <= 0xffff) {
      yield 0xe0 | (cp >> 12);
      yield 0x80 | ((cp >> 6) & 0x3f);
      yield 0x80 | (cp & 0x3f);
    } else {
      yield 0xf0 | (cp >> 18);
      yield 0x80 | ((cp >> 12) & 0x3f);
      yield 0x80 | ((cp >> 6) & 0x3f);
      yield 0x80 | (cp & 0x3f);
    }
    i += cp > 0xffff ? 2 : 1; // advance surrogate pair correctly
  }
}

function hashString64(h: bigint, s: string): bigint {
  let acc = h;
  for (const b of utf8(s)) acc = mix64(acc, b);
  return acc;
}

function hashPrimitive64(h: bigint, v: unknown): bigint {
  switch (typeof v) {
    case 'string':
      return hashString64(mix64(h, 0x73), v);
    case 'number':
      return hashString64(mix64(h, 0x6e), Number.isNaN(v) ? 'NaN' : v === 0 ? '0' : String(v));
    case 'boolean':
      return mix64(h, v ? 0x54 : 0x46);
    case 'undefined':
      return mix64(h, 0x75);
    case 'bigint':
      return hashString64(mix64(h, 0x62), v.toString());
    case 'function':
      throw new Error('hash: function unsupported');
    case 'symbol':
      throw new Error('hash: symbol unsupported');
    case 'object':
      if (v === null) return mix64(h, 0x30);
      break;
  }
  return h;
}

function hashAny64(h: bigint, v: unknown, seen: WeakSet<object>): bigint {
  if (v === null || typeof v !== 'object') return hashPrimitive64(h, v);
  if (seen.has(v as object)) throw new Error('hash: circular reference');
  seen.add(v as object);
  if (Array.isArray(v)) {
    let acc = mix64(h, 0x5b);
    for (const el of v) acc = hashAny64(acc, el, seen);
    return mix64(acc, 0x5d);
  }
  const obj = v as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  let acc = mix64(h, 0x7b);
  for (const k of keys) {
    acc = hashString64(acc, k);
    acc = mix64(acc, 0x3a);
    acc = hashAny64(acc, obj[k], seen);
    acc = mix64(acc, 0x2c);
  }
  return mix64(acc, 0x7d);
}

export function fnv1a64(value: unknown): bigint {
  return hashAny64(FNV_OFFSET_64, value, new WeakSet());
}
export function hashValue(value: unknown): bigint {
  return fnv1a64(value);
}
export function hashHex(value: unknown): string {
  return fnv1a64(value).toString(16).padStart(16, '0');
}
export function combineHash(a: bigint, b: bigint): bigint {
  return (a ^ (b + 0x9e3779b97f4a7c15n + (a << 6n) + (a >> 2n))) & 0xffffffffffffffffn;
}
