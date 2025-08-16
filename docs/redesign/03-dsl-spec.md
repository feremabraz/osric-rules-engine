# 03. DSL Specification (Authoring)

## Purpose
Provide a zero-boilerplate way to declare a command's staged rule pipeline with deterministic ordering and no manual naming.

## Import
Preferred: `import { command } from 'engine'` (public barrel). Direct path `engine/authoring/dsl` also works for internal refs.

## Signature
```ts
command(key: string, paramsSchema?: unknown) => CommandBuilder
```
`paramsSchema` is currently accepted but not interpreted (schema validation deferred; future extension can use same slot).  

## Builder Methods (All Chainable)
| Method    | Stage    | Return Type        | Notes |
|-----------|----------|--------------------|-------|
| `.validate(fn)` | validate | CommandBuilder | Precondition / param checks. |
| `.load(fn)`     | load     | CommandBuilder | Data retrieval / projections. |
| `.calc(fn)`     | calc     | CommandBuilder | Pure computations (RNG allowed). |
| `.mutate(fn)`   | mutate   | CommandBuilder | Store side-effects & result fragments. |
| `.emit(fn)`     | emit     | CommandDescriptor (frozen snapshot) | Final link in typical chain; may still return fragment. |

All methods may be called multiple times; ordering within stage = declaration order.

## Registration & Finalization
Descriptors auto-register on the first stage method call (no explicit `register`). The DSL keeps *live* stage arrays until an `.emit()` call returns an immutable snapshot. Additional stage method calls after `.emit()` are not supported (chain ends). No `.build()` method.

## Rule Function Shape
Implemented minimalist signature (positional parameters) instead of a single context object:
```ts
type RuleFn = (acc: Readonly<Record<string, unknown>>, params: unknown, ctx: ExecutionContext) => 
  void | Record<string, unknown> | DomainOrEngineFailure;

interface ExecutionContext {
  rng: RNG;
  effects: EffectsBuffer;
  store: EngineStore;
}
```
Return values:
- `undefined` → no fragment.
- Failure object (domain or engine) → short-circuits (domain failure drops effects).
- Plain object → treated as accumulator fragment (keys must be new).

Attempting to mutate `acc` directly triggers an integrity failure (`INTEGRITY_MUTATION`).

## Error Cases
| Condition | Engine Failure Code |
|-----------|---------------------|
| Duplicate result key | DUPLICATE_RESULT_KEY |
| Params parse fail | PARAM_INVALID |
| Thrown exception inside rule | RULE_EXCEPTION |
| Integrity hash mismatch | INTEGRITY_MUTATION |

## Domain Failure Construction
Domain failure helper currently implemented as returning an object via `domainFail(code, message?)` inside rule logic; returning that object from a rule short-circuits.

## Effects API
Effects collected via `ctx.effects.add(type, target, payload?)`. Effects commit only if the command (or atomic batch) succeeds. In non-atomic batches, effects from successful commands commit immediately.

## Accumulator Immutability
Each merged fragment is deep-frozen. Any attempt to mutate previously merged data surfaces as an `INTEGRITY_MUTATION` engine failure. No `draft` escape hatch is present (removed for minimalism).

## Type Inference
Current implementation is untyped / generic for rule parameters and accumulator fragments (future schema support can refine). Fragments still benefit from TypeScript inference at call sites when authored locally.

## Example
```ts
command('grantXp')
  .validate((_acc, params, ctx) => {
    const p = params as { characterId: string; amount: number };
    const character = (ctx.store as any).getCharacter?.(p.characterId);
    if (!character) return domainFail('CHARACTER_NOT_FOUND');
    return { character };
  })
  .mutate((acc, params, ctx) => {
    const p = params as { amount: number };
    const updated = (ctx.store as any).updateCharacter(acc.character.id, { xp: acc.character.xp + p.amount });
    return { newXp: updated.xp };
  })
  .emit((acc, _p, ctx) => { ctx.effects.add('xpGranted', acc.character.id, { amount: acc.newXp }); });
```

## Determinism Guarantee
Because stage ordering and declaration order are fixed, adding a new rule only at the end of a stage or adding a new later stage maintains predictable ordering; tests can snapshot the pipeline (derived list of auto IDs) if needed.

## Potential Future Additions (Documented Only)
- Optional explicit `.finalize()`.
- Optional parameter & fragment schema validation.
- Parallel rule execution (requires declaring inter-rule dependencies).

## Public API Surface (CE-13)
`Engine`, `command`, `processBatch`, `success`, `domainFail`, `engineFail`, `computeHash`, `verifyHash`, `deepFreeze`, `createRng`, `diffSnapshots`, `MemoryStore`.
