# Doing Now Plan (Execution Sequence Toward Alignment Objectives)

Goal: Implement all "Alignment Objectives" from `doing-now.md` while applying stated decisions:
- Export simulation helper as `simulate`.
- Retain auto discovery convenience.
- Remove/empty truly unused internal modules (and their tests).
- Delete ability utilities / rarely used helpers.
- Prune vestigial result helpers if not justified by usage.

Alignment Objectives (for reference during execution)
1. Unified mental model: command (DAG) + batch reuse identical core executor.
2. Explicit atomicity & rollback (implicit single command atomicity; explicit `batchAtomic`).
3. Only structural contracts (rule graph snapshot + command digest); rest internal.
4. Immutable deltas (deep‑frozen) except sanctioned `draft` key escape hatch.
5. Minimal ergonomic public API (authoring, invocation, preview, simulate, diagnostics on failures).
6. Clear diagnostics separation (domain vs structural) including `failedRule` on hard stops.

---
## Step 1: Baseline Public Surface Audit
Purpose: Capture current exported symbols and classify keep/remove.
Actions:
- Enumerate exports from barrel (`osric/index.ts`) and any direct consumer entrypoints.
- Categorize: KEEP (core authoring/execution), RENAME (if needed), INTERNALIZE (stop exporting), DELETE (unused/vestigial), REEVALUATE (needs usage scan).
- Produce a temporary checklist inside a dev note (not committed yet) to guide pruning.
Success Criteria:
- Comprehensive list with disposition for each symbol.

## Step 2: Usage Scan & Confirmation
Purpose: Prevent accidental removal of still‑used helpers.
Actions:
- Grep codebase (including tests) for each symbol marked INTERNALIZE/DELETE.
- If only referenced in its own test file and not conceptually essential, mark DELETE.
- If referenced by multiple production modules but conceptually not part of minimal API, mark INTERNALIZE instead of DELETE.
Success Criteria:
- Updated disposition list referencing counts & file examples.

## Step 3: Introduce `simulate` Public Export
Purpose: Provide explicit deterministic non‑committing execution with diff.
Actions:
- Ensure internal implementation exists (reuse existing `simulateCommand` logic).
- Rename internal symbol to `simulate` if needed; export via barrel.
- Define contract: input (command key + params, optional seed overrides) → output { result, diff (entity/effects), diagnostics }.
- Add lightweight unit tests: success path, domain failure, structural failure (assert `failedRule` presence).
Success Criteria:
- Tests green; `simulate` appears in exported surface; docs stub prepared.

## Step 4: Refactor Batch to Use Unified Core Executor
Purpose: Guarantee single execution path for command & batch (Objective 1).
Actions:
- Extract shared internal function (e.g., `executeCommandGraph`) if not already.
- Batch operations (atomic & non‑atomic) call same function; ensure rollback hooks identical.
- Add test asserting identical diagnostics & effects ordering between a direct command and same command inside single‑item batch.
Success Criteria:
- No duplicated logic blocks; tests pass; diff of execution function shows single implementation.

## Step 5: Prune Unused / Vestigial Internals
Purpose: Remove dead weight (Objectives 3 & 5).
Actions:
- Delete ability utilities & their test files.
- Delete or empty (turn into no‑export placeholder + comment) any internal modules marked DELETE.
- Remove related snapshot or unit tests referencing deleted code.
- Run full test suite; update snapshots only if unrelated breakage (should be none if deletions isolated).
Success Criteria:
- Zero references to deleted symbols; test suite green.

## Step 6: Internalize Non‑Essential Helpers
Purpose: Reduce public surface without losing needed internal reuse.
Actions:
- For items marked INTERNALIZE: stop exporting from barrel; update import sites to use relative paths (inside `osric/` only).
- Add `@internal` JSDoc to clarify status.
- Add a test enumerating allowed public exports (whitelist) to guard regression.
Success Criteria:
- Public export list matches curated whitelist test; build & tests pass.

## Step 7: Result Helper Reevaluation
Purpose: Minimize abstraction overhead.
Actions:
- Verify usage of `mapResult`, `chain`, `tap` (or similar). If usage count below threshold & in trivial contexts, inline and delete helper.
- Otherwise mark with `@internal` and ensure not exported publicly unless essential.
Success Criteria:
- Either helpers removed with replacements committed OR internalized with justification comment.

## Step 8: Deep‑Freeze Draft Guard Test
Purpose: Enforce invariants on deltas (Objective 4).
Actions:
- Add test: produce command with multiple deltas; attempt to mutate a non‑`draft` field post‑execution → expect throw or unchanged (depending on freeze semantics).
- Add test: `draft` key object remains mutable across designated rules (simulate incremental build) and final merge preserves final state; ensure only `draft` escapes freeze.
Success Criteria:
- Tests assert immutability & exclusive escape hatch.

## Step 9: Diagnostics Coverage & `failedRule` Verification
Purpose: Ensure clarity of failure reporting (Objective 6).
Actions:
- Add structural failure test (duplicate key or param schema fail) verifying `diagnostics.failedRule` is set.
- Add domain failure test verifying domain failure does NOT escalate but includes `failedRule`.
- Update existing diagnostics snapshot tests if necessary (add non‑snapshot assertions for `failedRule`).
Success Criteria:
- Distinct tests for domain vs structural failures; all assertions pass.

## Step 10: Hashing & Structural Contract Documentation
Purpose: Document only the two stable structural surfaces (Objective 3).
Actions:
- Add section to authoring docs describing rule graph snapshot & command digest as intentional regression guards.
- Brief note: hashing centralized in utility; extension authors should not replicate.
Success Criteria:
- Docs updated; references point to new `simulate` instead of internal names.

## Step 11: Auto Discovery Documentation
Purpose: Retain while positioning as optional ergonomics.
Actions:
- Add a short "Startup Ergonomics" doc section explaining auto discovery, its trade‑offs, and how to disable for explicit registration.
- Mark it as non‑critical; reference manual alternative.
Success Criteria:
- Clear narrative in docs with example snippet.

## Step 12: Public API Reference Refresh
Purpose: Ensure minimal curated surface (Objective 5).
Actions:
- Generate updated list of exports after pruning.
- Add or update `README` / dedicated API doc enumerating only supported exports; link to concept sections.
- Remove any mention of deleted helpers.
Success Criteria:
- Public API doc matches whitelist test from Step 6.

## Step 13: Authoring Checklist & Design Guarantees Addendum
Purpose: Provide ergonomic onboarding & invariants summary.
Actions:
- Create concise checklist (params schema → rules w/ categories → dependencies → run structural tests → add command digest snapshot if new command → optional preview/simulate for verification).
- Add Design Guarantees section (acyclic graph, deterministic RNG, atomic deltas/effects, immutable outputs, structural digests stable).
Success Criteria:
- New doc section present; internal review for clarity.

## Step 14: Final Verification & Regression Guard
Purpose: Lock in alignment.
Actions:
- Run full test suite + export whitelist test.
- Optionally produce a lightweight script to print command digest map & rule graph counts—commit only if stable.
- Open a tracking issue for any deferred refactors uncovered during pruning.
Success Criteria:
- All tests green; no unexpected export creep; structural snapshots unchanged aside from intentional simulate addition.

## Step 15: Clean Up & Tag
Purpose: Mark a stable alignment point.
Actions:
- Update version (minor bump) reflecting API change (simulate export, removed helpers).
- Add CHANGELOG entry summarizing removals, new `simulate` export, documentation updates.
- Create a git tag (e.g., `vX.Y.0-alignment`) for traceability.
Success Criteria:
- Tag pushed; CHANGELOG clear; consumers can adopt with documented migration notes.

---
### Rollback / Risk Mitigation Notes
- Each destructive step (5, 6, 7) should be a separate commit for easy revert.
- Export whitelist test prevents accidental API expansion in future PRs.
- Simulation tests validate non‑committing path remains parity with real execution.

### Out-of-Scope / Deferred (Track Separately)
- Parallel rule execution (future optimization, not required for alignment).
- Caching of pure rule outputs.
- Advanced effect routing or scheduling.

End of plan.
