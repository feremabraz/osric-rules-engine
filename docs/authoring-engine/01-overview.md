# Common Engine Authoring Overview

This section documents ONLY the generic engine (`engine/` folder). It excludes any OSRIC domain specifics. Use it to understand how to add or modify engine primitives without leaking domain concerns.

## Scope
Included:
- Command DSL (`authoring/dsl.ts`)
- Command execution pipeline & stages
- Result & failure model
- Effects buffering & commit semantics
- Deterministic RNG & snapshot semantics
- Batch (atomic & non-atomic) execution
- Simulation & diff
- Integrity hashing & immutability enforcement
- Public API boundaries & barrel exports

Excluded (see domain docs):
- Domain entities or store shapes
- Domain-specific effects (e.g. battle mirroring)
- Scenario scripts & domain commands

## Mental Model
The engine orchestrates a single linear stage sequence per command: validate -> load -> calc -> mutate -> emit. Each stage can register multiple rule functions. Rule functions return disjoint object fragments merged into an immutable accumulator. Any fragment key collision is an engine failure (`DUPLICATE_RESULT_KEY`). Effects are staged in a buffer and only committed if the command (or atomic batch) succeeds.

## Public Surface (Core)
- `command(key)` DSL builder
- `Engine` facade exposing `execute`, `simulate`, `batch`
- Result helpers: `success`, `domainFail`, `engineFail`
- Types: `CommandOutcome`, `Effect`, etc.

## Determinism
- RNG seeded at engine construction; every command advances RNG once at start for sequence stability.
- Simulation and atomic rollback restore RNG state exactly.
- Hash-based integrity guard detects mutation of the accumulator.

## Batch Semantics
- Atomic: roll back store + RNG on first failure.
- Non-Atomic: retain successes; `ok` true if at least one success.
- Effects aggregated from successful commands only.

## Simulation
`simulate(key, params)` runs the identical pipeline against a deep-clone snapshot of the store and RNG state, returning `{ result, diff, effects }` with no persistence. Diff identifies created/mutated/deleted entities by sparse heuristic (arrays of objects with `id`).

## Adding a New Engine Feature
1. Define core primitive in `engine/core/*` with unit tests (CE-* style id optional if extending sequence).
2. Integrate into executor or facade as needed.
3. Expose via barrel only if intended for public consumption.
4. Update redesign docs if the conceptual surface expands.

## Non-Goals
- Generic plugin hooks
- Parallel rule execution (future possibility once dependency metadata warrants)
- Schema validation of params (current minimal approach uses manual validate rules)

See subsequent files for deeper dives:
- `01-dsl.md`
- `02-execution.md`
- `03-results-effects.md`
- `04-determinism-integrity.md`
- `05-batch-simulation.md`
