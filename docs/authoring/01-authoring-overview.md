# 1. Authoring Overview

This track assumes you know all core concepts (see `../concepts`). It focuses on how to extend the engine codebase or your local project with new commands, rules, entities, and tests.

## Authoring Goals (Current Implementation)
- Minimal boilerplate (co‑located rule classes + single registration call – internal contributors use `registerCommand`; external consumers currently rely on built-ins + future extension API).
- Fail fast at startup (dependency & schema validation, rule graph checks, frozen accumulator enforcement).
- Deterministic execution (seeded RNG + per‑command RNG advance + deterministic ID generator hook).
- Effect isolation (effects buffered then committed once).
- Lightweight observability (events.trace + metrics counts + recent history only) plus per-command diagnostics (timings, entity diff, rng draws, failedRule).
- Structural regression guards (rule graph snapshot + command digest).
- Safe speculative execution via `simulate` (non‑committing diff + diagnostics).

### Deterministic IDs
At engine `start()` a deterministic ID generator is injected so entity IDs become stable across runs for a given seed. This lets snapshot / digest tests assert on IDs without flakiness.

### Metrics (Slimmed)
Earlier drafts exposed average duration; this was removed. Use `engine.metricsSnapshot()` which returns:
```
{ commandsExecuted: number; commandsFailed: number; recent: { command; ok; durationMs; at }[] }
```
Durations and richer traces remain available via `engine.events.trace`.

### Snapshot / Digest Tests
Two structural surfaces are intentionally stable:
- Rule graph snapshot via `explainRuleGraph(commandKey)`.
- Command digest via `getCommandDigests()` (hash of rule names, categories, output keys).
Use selective snapshots for core procedural commands only; avoid snapshot overload. Prefer targeted assertions else.

### Simulation vs Execution
`simulate(engine, key, params)` executes the same pipeline inside an automatic transaction, yields `{ result, diff, diagnostics }`, and always rolls back. Use it to inspect accumulator outputs or new rule effects without mutating state.

### Result Helpers Simplified
Legacy functional helpers (`mapResult`, `tapResult`, `chain`) were removed. Inline transformations with `isOk` guards instead.

Subsequent chapters dive into command structure, rule design, error semantics, and testing patterns. See also:
- `12-structural-contracts.md` for structural surfaces & simulation guidance.
- `09-registry-and-discovery.md` for auto discovery ergonomics.

Next: Command File Template (2).
