# 1. Authoring Overview

This track assumes you know all core concepts (see `../concepts`). It focuses on how to extend the engine codebase or your local project with new commands, rules, entities, and tests.

## Authoring Goals (Current Implementation)
- Minimal boilerplate (co‑located rule classes + single registration call)
- Fail fast at startup (dependency & schema validation, rule graph checks)
- Deterministic execution (seeded RNG + per‑command RNG advance + deterministic ID generator hook)
- Effect isolation (effects buffered then committed once)
- Lightweight observability (events.trace + metrics counts + recent history only)

### Deterministic IDs
At engine `start()` a deterministic ID generator is injected so entity IDs become stable across runs for a given seed. This lets snapshot / digest tests assert on IDs without flakiness.

### Metrics (Slimmed)
Earlier drafts exposed average duration; this was removed. Use `engine.metricsSnapshot()` which returns:
```
{ commandsExecuted: number; commandsFailed: number; recent: { command; ok; durationMs; at }[] }
```
Durations and richer traces remain available via `engine.events.trace`.

### Snapshot / Digest Tests
End‑to‑end tests can snapshot a minimized digest (e.g. characters + trace + metrics) to guard regressions. Prefer omitting volatile or overly detailed fields (like HP if prone to iteration changes). Use snapshots sparingly; unit tests should still assert specific invariants directly.

Subsequent chapters dive into command structure, rule design, error semantics, and testing patterns (all updated to reflect Phase 05 completion: saving throws, damage status thresholds, morale triggers, deterministic IDs, slim metrics).

Next: Command File Template (2).
