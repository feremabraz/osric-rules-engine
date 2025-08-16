# 01. Common Engine Re-Implementation Plan

Covers the concrete tasks and internal module contracts for the generic (common) engine.

## Goals
- Single execution path, minimal API.
- Deterministic, integrity-protected accumulator merging.
- Clear separation from any domain concerns.

## Modules
```
engine/
  core/
    command.ts      # CommandDescriptor & staging
    executor.ts     # runCommand pipeline
    hash.ts         # FNV-1a 64-bit + object hashing
    rng.ts          # RNG with state save/restore
    effects.ts      # EffectsBuffer
    freeze.ts       # deepFreeze utility
    integrity.ts    # computeHash / verifyHash
    batch.ts        # processBatch (atomic / non-atomic)
    result.ts       # Result & failure helpers
    types.ts        # EngineStore, MemoryStore, deep clone
  authoring/
    dsl.ts          # command() fluent builder (auto-register live descriptor)
  facade/
    engine.ts       # Engine (execute, simulate, batch)
    registry.ts     # Global CommandRegistry
    simulate.ts     # diffSnapshots + simulation diff logic
  index.ts          # Public barrel (CE-13)
```

## Core Types
```ts
export interface EngineConfig { seed?: number; store: EngineStore }
export type Stage = 'validate' | 'load' | 'calc' | 'mutate' | 'emit';
export type RuleFn = (acc: Readonly<Record<string, unknown>>, params: unknown, ctx: { rng: RNG; effects: EffectsBuffer; store: EngineStore }) => void | Record<string, unknown> | CommandOutcome;
export interface CommandDescriptor { key: string; stages: { [K in Stage]: RuleFn[] }; }
```

## Execution Algorithm (Pseudocode)
```ts
function runCommand(descriptor, params, ctx) {
  ctx.rng.float(); // deterministic divergence
  let acc = deepFreeze({});
  let hash = computeHash(acc);
  for (const stage of ['validate','load','calc','mutate','emit']) {
    for (const rule of descriptor.stages[stage]) {
      const before = hash;
      let out;
      try { out = rule(acc, params, ctx); } catch (e) { return engineFail('RULE_EXCEPTION', (e as Error).message); }
      if (computeHash(acc) !== before) return engineFail('INTEGRITY_MUTATION','acc mutated');
      if (out && typeof out === 'object' && 'ok' in out && out.ok === false) {
        if (out.type === 'domain-failure') { ctx.effects.drain(); return out; }
        return out;
      }
      if (out && typeof out === 'object') {
        for (const k of Object.keys(out)) if (k in acc) return engineFail('DUPLICATE_RESULT_KEY', k);
        acc = deepFreeze({ ...acc, ...out });
        hash = computeHash(acc);
      }
    }
  }
  return success(acc, ctx.effects.drain());
}
```

## Integrity Hash
- Root-level object stable order: gather keys, sort, fold hash.
- For nested objects/arrays: deterministic serialization walker.

## Store Interface
```ts
interface EngineStore { snapshot(): unknown; restore(snap: unknown): void }
```
A simple `MemoryStore` (deep clone snapshot) is provided for tests and lightweight usage.

## Simulation
1. Snapshot store + RNG state.
2. Execute command (rules can mutate store via `ctx.store`).
3. Snapshot store after.
4. Restore original snapshot & RNG.
5. Diff arrays of identifiable objects (`id` present) to classify created / deleted / mutated (shallow stable JSON of properties excluding `id`).
6. Return `{ result, diff, effects }` (effects only if success).

## Batch
Atomic:
* Snapshot store + RNG once. On first failure: rollback snapshots, return with `ok=false`, empty effects.
Non-Atomic:
* Execute sequentially; successes commit immediately; failures collected. `ok=true` if at least one success.

## Result Shapes
Success: `{ ok: true, data: AccumulatorObject, effects: Effect[] }`  
Domain failure: `{ ok: false, type: 'domain-failure', code, message }`  
Engine failure: `{ ok: false, type: 'engine-failure', code, message }`

## Testing Checklist
- Duplicate key detection
- Integrity mutation detection (tamper test)
- Deterministic outputs with fixed seed
- Simulation diff classification
- Atomic batch rollback (store + RNG)
- Non-atomic partial success semantics

## Hard Constraints
- No dynamic imports
- No user rule naming
- No optional flags toggling any part of executor

## Future-safe Extensibility (Documented Only)
- Optional param / fragment schema validation.
- Parallel stage execution (requires dependency metadata).
- Additional diff strategies (pluggable) if domains need richer simulation insights.

## Public API (CE-13)
`Engine`, `command`, `processBatch`, `success`, `domainFail`, `engineFail`, `computeHash`, `verifyHash`, `deepFreeze`, `createRng`, `diffSnapshots`, `MemoryStore`.
