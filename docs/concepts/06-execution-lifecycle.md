# 6. Execution Lifecycle

Prior: Commands & Rules (5). Here we trace a single command invocation.

1. Invocation via `engine.command.<key>(...)` or `engine.execute(key, rawParams)`.
2. RNG advances once (even if no randomness used) to ensure per‑command divergence.
3. Params parsed with the command's Zod schema – failure returns an Engine failure (`PARAM_INVALID`).
4. Execution context is created: `{ command meta, params, store, acc={}, effects collector, rng, ok, fail }`.
5. Rules are topologically ordered. Each executes in sequence:
   - If a rule `apply` throws: Engine failure (`RULE_EXCEPTION`).
   - If rule returns a DomainFailure from `ctx.fail(...)`: domain failure result (short‑circuit, no further rules, no effect commit).
   - Rule output schema validates the delta. Failure => Engine failure (`RULE_EXCEPTION`).
   - Delta entries merged into accumulator.
6. After all rules succeed, effects collected are appended to an internal `events.effects` list (commit phase). (Future design: dispatch handlers.)
7. Success result returned: `{ ok: true, data: accumulator }`.

### Effect Collection
Rules call `ctx.effects.add(type, target, payload)`. Effects are stored transiently until commit. They do not mutate entities directly.

### Positional Parameter Sugar
The command proxy will map leading primitive arguments to schema fields when possible, allowing calls like `engine.command.gainExperience(characterId, { amount: 50 })` instead of passing an object with both fields explicitly. (Heuristic based on field order + known ID key names.)

Next: Errors & Result Model (7).
