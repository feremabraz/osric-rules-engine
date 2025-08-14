# 3. Rule Design Guidelines

## Single Responsibility
Each rule should perform one cohesive step: validation, calculation, persistence, effect emission.

## Naming
`ruleName` must be unique within the command. Use imperative or descriptive forms: `ValidateLeader`, `CalcDuration`, `Persist`.

## Dependencies
Use `after` to declare prerequisites. Keep chains shallow; avoid large webs of interdependencies. A linear chain is often clearest.

## Output Schema Discipline
Every rule MUST declare an `output` schema—even if empty—to freeze the contract and feed composite result typing. Empty object: `z.object({})`.

## Accumulator Usage
- Read prior rule outputs via `ctx.acc`.
- Do not mutate objects from `ctx.acc` directly; produce new data if transformation needed.
- Keys must not collide across rules.

## Error Emission
- Domain issues: `return ctx.fail('CODE', 'message')` (stop execution gracefully).
- Developer errors (unexpected states) should throw; these surface as structural `RULE_EXCEPTION` failures.

## Effects
Emit effects only after validation/calculation steps pass (ideally in terminal rules). Engine buffers them; commit phase applies after success. This preserves atomicity and keeps snapshot digests deterministic.

## Determinism Notes
- RNG: Engine advances RNG once per command before rules; within rules use `ctx.rng`.
- IDs: Entity IDs are deterministic per seed (injected generator) so rules producing new entities can safely appear in snapshot tests.

Next: Error Semantics (4).
