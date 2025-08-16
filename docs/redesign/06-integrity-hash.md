# 06. Integrity Hash Specification

Defines the algorithm and structural rules ensuring accumulator immutability.

## Purpose
Detect any post-merge mutation (accidental or malicious) of previously accumulated fragments.

## Scope
- Hash is computed over the entire accumulator object after each merge and at the end.
- If final recomputed hash != last stored hash => engine failure `INTEGRITY_MUTATION`.

## Algorithm Choice
- FNV-1a 64-bit (folded to BigInt or two 32-bit halves). Chosen for: simplicity, speed, stable output across platforms.

## Serialization Rules
Traverse accumulator deterministically:
1. Collect keys of current object, sort lexicographically.
2. For each key append key name bytes; then value encoding:
   - Primitives: type tag + string/number/boolean textual form.
   - Null / undefined: distinct tags.
   - Arrays: tag + length + each element recursively.
   - Objects: tag + recursive application.
   - Dates (if appear): numeric timestamp.
   - Other types (functions, symbols) are disallowed / converted to string tag (should not exist in accumulator; treat as engine failure if encountered in development build).

## Pseudocode
```ts
function hashValue(h, v) {
  switch (typeof v) {
    case 'string': h = mix(h, 'S'); for(c of v) h = mix(h, c); break;
    case 'number': return hashValue(h, 'N'+v.toString());
    case 'boolean': return hashValue(h, 'B'+(v?'1':'0'));
    case 'object':
      if (v === null) return hashValue(h, 'L');
      if (Array.isArray(v)) { h = mix(h, 'A'+v.length); for (e of v) h = hashValue(h, e); return h; }
      const keys = Object.keys(v).sort();
      h = mix(h, 'O'+keys.length);
      for (k of keys) { h = hashValue(h, k); h = hashValue(h, v[k]); }
      return h;
    default: return hashValue(h, 'U');
  }
}
```
`mix` applies FNV-1a step.

## Freeze Interaction
Before merging into accumulator, each fragment value is deep-frozen (unless key is reserved `draft` if that escape hatch remains). Mutation then reliably triggers either:
- Immediate throw when writing to frozen object (in strict mode), OR
- Silent change producing different final hash => integrity failure.

## Performance Considerations
- Shallow accumulator with many small primitives: minimal overhead.
- Large nested structures: cost proportional to size each rule merge (acceptable given typical command rule counts are low). Optimization (memoizing subtree hashes) deferred until real profile evidence.

## Testing
- Tamper Test: after execution but before final integrity check, mutate a nested value; expect `INTEGRITY_MUTATION`.
- Stability Test: identical accumulator objects produce identical hashes across runs/platforms.
- Collision Smoke: generate random small objects; ensure low accidental collision rate (not strict proof, just guard against trivial bug).

## Future (Document Only)
- Optional switch to a stronger algorithm (e.g. xxHash) if needed; would require coordinated version bump.
