# 3. Rule Design Guidelines

## Single Responsibility
Each rule should perform one cohesive step: validation, calculation, persistence, effect emission, effect emission, or loading. Split when a rule starts doing two distinct things (e.g. validation + mutation).

## Naming
`ruleName` must be unique within the command. Use imperative or descriptive forms: `ValidateLeader`, `CalcDuration`, `Persist`. If you split a concern, reflect it (`LoadCharacter` vs `ValidateCharacter`).

## Dependencies
Declare prerequisites with static `after = ['SomeRule']`.
* Do not list transitive dependencies (depending on `Load` implies prior `Validate` already ran).
* Keep chains shallow; prefer a linear or lightly branched sequence.
* Cycles or duplicate keys cause startup failure.

## Typing (RuleCtx & Outputs)
Use `apply(ctx: RuleCtx<Params, PrevOut>)` rather than `ctx: unknown`.
* Define `Params` via branded schemas (`characterIdSchema`, `battleIdSchema`, `itemIdSchema`, etc.) so ID casts are unnecessary.
* Each rule’s generic parameter (`Rule<Delta>`) is the shape it returns; expose small, purposeful objects (avoid dumping full entities unless needed).
* Treat `ctx.acc` as effectively read‑only; never mutate objects you previously placed there—produce new deltas.

## Output Schema Discipline
Every rule MUST declare an `output` schema (even if empty) to freeze the contract and feed composite result typing.
Empty object: `z.object({})`.
Avoid reusing the same key across rules; each key space is global within the command.

## Accumulator Usage
* Read prior rule outputs via `ctx.acc`.
* Narrow stored entity slices to only required fields to minimize coupling.
* If you need a fuller shape later, introduce a separate load rule.

## Error Emission
* Domain issues: `return ctx.fail('CODE', 'message')` to stop execution gracefully. This returns a sentinel (currently typed as a value, not `never`).
* Developer errors (unexpected states) should throw; surfaces as structural `RULE_EXCEPTION`.
* Avoid mixing partial mutations with failures; validate first, mutate later rules.

Return objects directly. `{}` is valid for empty output (must match schema).

## Effects
Emit effects only after validation & calculation steps succeed (ideally terminal or near‑terminal rules).
Engine buffers effects; they commit after successful completion.
Tests should inspect effects via helpers, not internal buffers.

## RNG & Determinism
* Engine can seed RNG; prefer dice helpers, use `ctx.rng` for deterministic testability.
* Advance RNG only when needed; avoid hidden randomness inside pure validation rules.
* Branded IDs + seeded RNG make snapshot results stable.

## Parameter & ID Branding
Always use provided branded schemas:
* `characterIdSchema`, `battleIdSchema`, `itemIdSchema`, `monsterIdSchema`, etc.
Prevents accidental mixing of ID types and removes `(id as CharacterId)` noise.

## Splitting Validate vs Load
You may:
* Use a single rule that validates and loads, OR
* Split into `Validate*` (empty output) and `Load*` (introduces data).
Choose clarity: splitting can aid reuse and targeted dependencies.

## Mutation Rules
Rules that persist changes (e.g. updating XP) should:
1. Depend on all prerequisite validation/load rules.
2. Perform minimal mutation.
3. Return a concise summary (e.g. `{ newXp }`).

## Performance Notes
Prefer small targeted loads (id + needed scalar fields) over whole entity blobs.
Batch expensive lookups into one load rule if later rules all require them.

## Consistency Checklist (Authoring)
- Params use branded schemas.
- Each rule: unique `ruleName`, `output` schema declared.
- `apply` typed with `RuleCtx`.
- No `any` / broad `unknown` casts except the single narrowing at function boundary (if needed).
- No `ok()` calls.
- Fail fast before mutation.
- Effects emitted only after successful validation.

Next: Error Semantics (4).
