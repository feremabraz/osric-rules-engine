# 3. Rule Design Guidelines

## Single Responsibility
Each rule should perform one cohesive step: validation, calculation, persistence, effect emission.

## Naming
`ruleName` must be unique within the command. Use imperative or descriptive forms: `ValidateLeader`, `CalcDuration`, `Persist`.

## Dependencies
Use `after` to declare prerequisites. Keep chains shallow; avoid large webs of interdependencies. A linear chain is often clearest.

## Output Schema Discipline
Every rule MUST declare an `output` schema—even if empty—to freeze the contract and feed composite result typing.

Empty object: `z.object({})` (or conceptually the shape represented by the shared `emptyOutput` constant).

## Accumulator Usage
* Read prior rule outputs via `ctx.acc`.
* Avoid mutating nested objects pulled from `ctx.acc`; create new objects or rely on store update helpers (`updateCharacter`, etc.).
* Keys must not collide across rules (duplicate key = startup failure).

## Error Emission
- Domain issues: `return ctx.fail('CODE', 'message')` (stop execution gracefully).
- Developer errors (unexpected states) should throw; these surface as structural `RULE_EXCEPTION` failures.

## Effects
Emit effects only after validation/calculation steps pass (ideally in terminal rules). Engine buffers them; commit phase applies after success. Use `getEffects(engine)` / `effectStats(engine)` in tests instead of poking internal logs.

## Determinism Notes
* RNG: Engine advances RNG once per command before rules; within rules use `ctx.rng` or dice helpers (`rollDie`, `rollDice`).
* IDs: Entity IDs are deterministic per seed; safe for snapshot tests.
* Batch: For multi-step orchestration prefer `batch` / `batchAtomic` rather than scripting in one bespoke mega-rule.

Next: Error Semantics (4).
