# Wrapper & Store

## Domain Store
`DomainMemoryStore` extends a generic in-memory store with arrays for `characters` and `battles` plus helper getters/mutators. Entities remain plain objects to keep snapshots simple.

## Wrapper (`engine.ts`)
Wraps core `Engine` methods:
- `execute`: run -> mirror effects -> return outcome
- `simulate`: run -> mirror effects (simulation) -> return
- `batch`: run -> mirror effects once (atomic) or per-success (non-atomic)

Mirroring logic adds unique round-scoped battle effects (`mirrorBattleEffects`). Idempotent across invocations.

## Adding New Effect Post-Processing
1. Implement pure transformation function in `effects/`.
2. Invoke it in wrapper after core engine call when `result.ok` (or after batch finalize).
3. Merge appended effects immutably.

## Snapshot Safety
All new store properties must be serializable JSON structures; avoid Maps/Sets/functions to preserve deep-clone snapshot correctness.
