# NOW Plan – Active Roadmap (Items 1–7 Completed)

Purpose: Focus only on remaining work after completion of Divergences Items 1–7 (minimum rule, `produces` removal, `ok()` removal, logger, structural error baseline, ID consolidation already DONE). Fixed semantics; no configuration toggles.

Legend: (DONE) already delivered; ACTIVE = upcoming implementation slice.

---

## 8. Execution Capsule Scaffold (ACTIVE)
Goal: Single unified internal execution object for command & batch.
Actions:
- Introduce `ExecutionCapsule` handling rule loop, effect buffering, result assembly (behavior parity with current execution).
- Refactor `Engine.execute` & `batchAtomic` to delegate to capsule (no semantic change yet).
AC:
- Tests green; no behavior deviation.

## 9. Full Transactional Rollback (Lazy Snapshot)
Goal: True all‑or‑nothing state semantics.
Actions:
- Implement lazy snapshot (materialize on first mutation) capturing entities, indexes, ID counters, RNG state, effects start index.
- On any failure restore snapshot & RNG/IDs; discard effects.
- Throw `NESTED_TRANSACTION_UNSUPPORTED` if capsule active recursively.
- Tests: mutation revert; creation+reference revert; RNG determinism.
AC:
- Rollback tests pass; old partial rollback tests adjusted.

## 10. Delta Deep Freeze & Integrity Guard
Goal: Enforce immutability + detect post-merge mutation.
Actions:
- Deep-freeze each rule delta (recursive plain objects/arrays).
- Maintain running hash of merged accumulator; verify unchanged at end; throw `INTEGRITY_MUTATION` if mismatch.
- Tests: deliberate mutation triggers error.
AC:
- Integrity tests green; no spurious failures.

## 11. Rule Categories & Ordering Enforcement
Goal: Structural ordering discipline (Validate→Load→Calc→Mutate→Emit).
Actions:
- Add optional static `category`; infer from prefix when absent.
- Validate ordering at registration; throw `ORDERING_VIOLATION` with details.
- Tests for valid pipeline, invalid early mutation, invalid early emit.
AC:
- Violations blocked, valid commands unaffected.

## 12. Effects Mirroring (Battle Context)
Goal: Automatic battle log mirroring for participant-targeted effects.
Actions:
- In commit phase, mirror eligible effects to `battle.effectsLog` (dedupe per round/type/target/payload).
- Tests: mirrored once; absent outside battle.
AC:
- Mirror tests pass; no extraneous entries.

## 13. Always-On Diagnostics
Goal: Uniform introspection payload.
Actions:
- Capsule records: rule timings, entity diff (created/mutated/deleted counts), effects counts (committed/mirrored), RNG draws, failing rule.
- Extend Result shape with `diagnostics` (document).
- Test ensures presence & shape.
AC:
- Diagnostics always included; test green.

## 14. Schema & Graph Digest Snapshot
Goal: Structural drift detection.
Actions:
- Compute stable digest at registration: hash of ordered tuples [ruleName, category, sorted output keys].
- Expose `getCommandDigests()`.
- Snapshot test harness file for regression.
AC:
- Digest consistent across runs barring changes; snapshot test passes.

## 15. Preview & Simulation Helpers
Goal: Author ergonomics for speculative runs.
Actions:
- Implement `engine.preview(fn)` (guaranteed rollback) & `engine.transaction(fn)` (commit on success) over capsule.
- Add `simulateCommand(key, params)` returning { result, diagnostics, diff } (rollback).
- Tests: preview leaves store unchanged.
AC:
- Helper tests green; no leak of state.

## 16. Prune Legacy/Dead Paths
Goal: Single execution path only.
Actions:
- Remove any obsolete conditional branches / config scaffolding replaced by capsule invariants.
- Static analysis / grep to confirm absence.
AC:
- Codebase free of old execution branches.

## 17. Documentation Synchronization
Goal: Reflect final semantics.
Actions:
- Update concept & authoring docs: atomic rollback, categories, immutability, mirroring, diagnostics, structural codes.
- Add changelog summarizing breaking changes (ordering enforcement, diagnostics field, structural codes expansion).
AC:
- No stale references (grep for produces, ok(), partial rollback wording).

## 18. Structural Error Codes Coverage Test
Goal: Ensure every structural code triggered in at least one test.
Actions:
- Enumerate expected codes; assert coverage.
- Add minimal synthetic test cases if domain path absent.
AC:
- Coverage test passes; fails if missing scenario for added code.

## 19. Final Clean & Informational Benchmark (Optional)
Goal: Record post-refactor baseline (for future awareness, not optimization).
Actions:
- Measure representative command execution time & snapshot memory overhead.
- Store metrics note in repo docs (internal section).
AC:
- Metrics documented.

---

## Ordering Overview
8 Capsule scaffold → 9 rollback → 10 freeze+integrity → 11 ordering → 12 mirroring → 13 diagnostics → 14 digests → 15 helpers → 16 prune → 17 docs → 18 code coverage → 19 metrics.

## Guiding Rules
Single invariant path, no feature flags. Each item must land fully (tests & docs) before moving to next.

## Immediate Next Step
Implement Item 8 (capsule scaffold) without semantic changes.

(End of NOW Plan)
