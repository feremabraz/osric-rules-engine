# Divergences & Remediation Roadmap

Purpose: enumerate every identified gap between conceptual/authoring docs and the current `/osric` implementation, then define a strictly ordered remediation sequence. Each item assumes all prior items are already completed (cumulative plan). Decisions already made are embedded (marked DECISION).

Decisions (baseline commitments applied across items):
- DECISION: Zero‑rule commands are **not allowed**.
- DECISION: Freeze every rule delta (enforce immutability at merge boundary).
- DECISION: Provide a logger on rule context (opt‑in via engine config; default no‑op).
- DECISION: Remove `ok()` helper from execution context.
- DECISION: Remove legacy `types/ids.ts` in favor of consolidated `store/ids.ts` branding utilities.
- DECISION: Remove `produces` metadata from rules (single source of truth = `output` schema).
- DECISION: Standardize structural error wrapping with explicit codes.
- OPEN (deferred): Result schema snapshot utility (decide after core cleanups).

Legend: (D#) references the divergence number from the analysis; AC = Acceptance Criteria.

---

## Item 1 – Enforce Minimum One Rule Per Command (D1)
**Objective**: Align docs & engine: treat zero‑rule commands as invalid authoring.
**Steps**:
1. Update concept docs removing allowance for zero‑rule commands.
2. Add explicit runtime guard (already partly in `defineCommand`) for custom registration paths; emit standardized structural error code `COMMAND_NO_RULES`.
3. Add unit test asserting failure when registering a command with `rules: []`.
**Acceptance Criteria**:
- Attempt to register/define a zero‑rule command yields structural failure `COMMAND_NO_RULES`.
- Docs and examples contain no zero‑rule references.
**Risks**: None (already mostly enforced). 

## Item 2 – Remove `produces` Metadata & Validate Single Source (D5, D13 ancillary)
**Objective**: Eliminate duplication; rely solely on `output.shape` keys.
**Steps**:
1. Delete `produces` from `Rule` interface & all rule classes.
2. Adjust registry build not to look for it (currently unused).
3. Codemod or manual sweep to remove any lingering references.
4. Update rule design doc referencing only `output` for key list & collision.
**Acceptance Criteria**:
- Codebase compiles with no `produces` references.
- Rule design guide has no mention of `produces`.
**Risks**: Minimal; ensure no forgotten custom tooling uses it.

## Item 3 – Remove `ok()` Helper & Adjust Docs (D7)
**Objective**: Simplify rule authoring API; rules return object or domain failure sentinel only.
**Steps**:
1. Remove `ok` from `ExecutionContext` and all usages (search for `ctx.ok`).
2. Update docs: delete checklist line “No ok() calls.” (obsolete) and instead state “Return object or `ctx.fail(...)`.”
3. Add type guard tests to ensure return paths work without `ok`.
**Acceptance Criteria**:
- No references to `ok(` in codebase.
- Tests pass.
**Risks**: Low; ensure no dynamic invocation remains.

## Item 4 – Enforce Delta Immutability (Deep Freeze Boundary) (D2, D8)
**Objective**: Make merged accumulator fragments immutable to prevent temporal coupling.
**Steps**:
1. Implement `freezeDelta(out)` (shallow freeze plus recursively freeze nested plain objects/arrays up to a modest depth or full deep if performance acceptable).
2. Apply freeze before merging into `ctx.acc`.
3. Optionally freeze `ctx.acc` itself after each merge (or only at end) – choose strategy; document.
4. Add test: attempting to mutate a field after command execution throws.
**Acceptance Criteria**:
- All rule outputs frozen (verified by test).
- Performance baseline recorded (no >5% regression in micro benchmark or acceptable tradeoff documented).
**Risks**: Deep freeze overhead; can start shallow + doc guidance against mutating nested structures.

## Item 5 – Introduce Logger (Configurable) (D3)
**Objective**: Provide `ctx.logger` consistent with concept documentation.
**Steps**:
1. Extend `EngineConfig` with optional `logger` interface `{ debug/info/warn/error }` or adapter factory.
2. Inject no‑op logger when absent.
3. Add to execution context; update docs & examples using `ctx.logger`.
4. Add test capturing log calls with a mock logger for a sample rule.
**Acceptance Criteria**:
- Rule receives `ctx.logger` when engine started with config logger.
- Docs show usage patterns.
**Risks**: None significant.

## Item 6 – Structural Error Standardization (D5, D10)
**Objective**: Uniform structural error envelope & codes.
**Steps**:
1. Define expanded code list: `PARAM_INVALID`, `RULE_THROW`, `RULE_OUTPUT_INVALID`, `DUPLICATE_COMMAND_KEY`, `DUPLICATE_RULE_NAME`, `CONFLICTING_RESULT_KEY`, `DEPENDENCY_MISSING`, `CYCLE_DETECTED`, `COMMAND_NO_RULES`, `STORE_CONSTRAINT`.
2. Create centralized `makeStructuralError(code, details)`; details includes contextual metadata (command, rule, path, offendingKey).
3. Wrap: param parse, rule execution errors, output validation, registry build conflicts, topo cycle detection.
4. Convert thrown Errors during registration into structured objects (may still throw but enriched type used in tests).
5. Update tests to assert structural codes instead of raw messages.
6. Update docs with standardized list.
**Acceptance Criteria**:
- All previous ad‑hoc messages replaced or supplemented by codes; tests green.
- Cycle error surfaces `CYCLE_DETECTED` with cycle path.
**Risks**: Broad change touches many error call sites; stage carefully.

## Item 7 – Consolidate ID Branding (Remove `types/ids.ts`) (D6)
**Objective**: Single deterministic ID system.
**Steps**:
1. Delete `osric/types/ids.ts`.
2. Search & replace imports to `store/ids.ts` utilities.
3. Ensure deterministic seeding path used everywhere (tests verifying stable IDs with fixed seed).
4. Update docs removing any references to legacy file.
**Acceptance Criteria**:
- No imports from `types/ids`.
- Deterministic ID tests pass across multiple runs.
**Risks**: Overlooked import path; rely on type errors.

## Item 8 – Enhance / Clarify Atomic Batch Rollback (D4)
**Objective**: Align behavior & documentation on rollback semantics.
**Two Options** (choose one and document):
A. Implement full snapshot restoration (replace existing maps with snapshot clones, restoring mutated entities).
B. Document limitation: only newly created entities removed; existing entity mutations persist (rename feature to “partial atomic”).
**Steps**:
1. Decide A or B (default recommendation: A for semantic clarity).
2. If A: implement deep clone snapshot capture (store exposes internal maps or new `_export()` / `_import()` internal methods) and restore on failure.
3. If B: adjust docs to reflect partial rollback + add warning.
4. Add tests: mutation before failure reverted (if A) or persists (if B) -> assertion matches docs.
**Acceptance Criteria**:
- Behavior & docs consistent.
- Tests enforce chosen semantics.
**Risks**: Option A increases complexity; Option B reduces guarantees.

## Item 9 – Effects Log Alignment (D9)
**Objective**: Ensure effects for battle context are mirrored or clarify authorship responsibility.
**Steps**:
1. Decide: automatic engine-level mirroring vs rule-level responsibility (recommend rule-level with helper to reduce duplication).
2. If automatic: when committing effects, if an effect target corresponds to a battle participant and a battle is active, append to battle.effectsLog with round info.
3. Provide helper `effects.addBattle(type, target, payload)` that handles mirroring.
4. Update effects authoring doc with canonical approach.
5. Add tests for effect presence in both global `appliedEffects` and battle log (if chosen).
**Acceptance Criteria**:
- Single documented pattern; tests pass.
**Risks**: Over‑eager mirroring could pollute logs outside battle scenarios; guard with battle existence.

## Item 10 – Deterministic Integrity Guard (Optional Reinforcement of Immutability) (D2, D8)
**Objective**: Detect accidental post‑merge mutations early.
**Steps**:
1. Add development-mode (NODE_ENV !== 'production') proxy guard or hash snapshot of `ctx.acc` before returning result; compare after command returns in tests.
2. Provide config toggle `strictDeltas`.
3. Add test purposely mutating delta post‑merge to confirm error.
**Acceptance Criteria**:
- Guard triggers in dev; no overhead in production when disabled.
**Risks**: Overhead if hashing large objects; document constraints.

## Item 11 – Result Schema Snapshot Utility (Deferred) (D11) [PENDING DECISION]
**Objective**: Provide snapshot/digest of command result schemas for regression detection.
**Status**: Deferred until prior structural changes stabilize (reduces churn). This item will: generate simplified schema descriptor, integrate into tests, and document usage.
**Open Questions**:
- Format (JSON vs markdown table)?
- Include type simplification rules?

## Item 12 – Mutation Ordering Enforcement (D12)
**Objective**: Encourage validate → load → calculate → mutate → effects ordering.
**Steps**:
1. Introduce optional lint/test utility scanning rule names and dependency order to flag mutation/effect rules appearing before validation/load rules they rely on.
2. Heuristic: classify rule by `ruleName` prefix (`Validate/Load/Calc/Mutate/Emit`) or explicit static category.
3. Provide suppression escape hatch for justified exceptions.
4. Add doc section outlining categories & enforcement tool.
**Acceptance Criteria**:
- Lint/test fails when a `Mutate*` rule precedes a required `Validate*` dependency not declared.
- Documentation shows examples & suppression.
**Risks**: Heuristic misclassification; allow explicit `static category` to override.

## Item 13 – Documentation Synchronization (Cross-Cutting)
**Objective**: Ensure all guides reflect new invariants & APIs after preceding items.
**Steps**:
1. After Items 1–12 complete, do a doc diff pass.
2. Update: concepts (immutability wording), authoring overview (logger, delta freeze, structural codes), rule design (no `ok`, no `produces`).
3. Add changelog section enumerating breaking changes.
**Acceptance Criteria**:
- No outdated references (automated grep for removed symbols: `produces`, `ok(`, `types/ids`).
- Changelog published.
**Risks**: Drift if postponed—execute immediately after core changes.

---

## Dependency Graph (High-Level)
1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → (11 deferred) → 12 → 13.

## Quick Win Grouping (If Parallel Work Chosen)
- Low coupling: Items 1–3 can batch; 4 (freeze) should land before 10 (guard) & before adding snapshot utility; 6 (errors) should precede snapshot (11) to settle schema churn.

## Tracking & Metrics
- Add internal checklist test verifying all structural error codes exercised in at least one test (post Item 6).
- Benchmark before & after Item 4 (freeze) and Item 10 (guard) to quantify overhead.

## Open Decisions Summary
- Item 8 Option A vs B (rollback depth) – choose before implementing Item 8.
- Item 9 automatic vs helper mirroring – choose before implementing Item 9.
- Item 11 format & type abbreviation scheme – decide when un‑deferred.

(End of document)
