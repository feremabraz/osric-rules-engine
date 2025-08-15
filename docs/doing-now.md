## Current Alignment Plan (Verbatim Snapshot)

Understood: you want the audit buckets (“high‑probability unused / under‑exposed” and “low‑usage / possibly vestigial”) converted into a concrete alignment plan so the code surface mirrors the conceptual model with minimal drift (ergonomics, unified execution path, atomic + rollback semantics, delta deep‑freeze, clear intent).

Below is a focused, actionable consolidation.

### Alignment Objectives (derived from concepts doc)
1. Single mental model: command = DAG orchestration; batch = higher‑order composition using the same execution core.
2. Atomicity & rollback always explicit (single command implicit, batchAtomic explicit).
3. Deterministic structural surfaces (rule graph, command digest) are the only stability contracts; everything else internal.
4. Deltas immutable (except sanctioned draft escape hatch) and deep‑frozen; no silent mutation channels.
5. Minimal public API: only what an author needs to define commands, rules, invoke, preview/simulate, and inspect failures.
6. Diagnostics clearly separate domain vs structural; failedRule present for any hard stop.

### Gap→Action Map
**A. simulateCommand not exported (intent unclear)**
- Decide: Either (1) Export and document as “full run returning diff + diagnostics without commit” or (2) Keep internal and fold use‑cases into preview/transaction.  
Recommendation: Export with explicit name simulate (mirrors concepts: “replay deterministically without side‑effects”) and document differences from preview (preview returns merged result; simulate returns { result, diff, effects? }).

**B. autoDiscover (if present & thinly used)**
- If discovery is project‑specific scaffolding, move to example or docs snippet; keep engine API manual (register explicitly).
- If retained, mark as convenience wrapper in docs under “Startup ergonomics.”

**C. Ability utilities / rarely used helpers**
- Either promote to first‑class documented pattern (if domain‑general) or relocate under testing/ or examples/ to de‑signal core status.
- If they only wrap store lookups, delete until a real reuse pressure appears.

**D. Result functional helpers surface**
- Confirm only mapResult / chain / tap remain and they’re actually used; if marginal, inline call sites or mark as internal (reduce abstraction weight).

**E. Hash utilities now centralized**
- Add a short doc blurb (in authoring/ or internal design) stating structural stability relies on hashStrings/hashObject—authors should not roll their own.

**F. Diagnostics enrichment**
- Ensure docs reflect failedRule presence in failure diagnostics; add example snippet (structural vs domain failure payload).

**G. Batch semantics vs single command**
- Verify batch code path reuses ExecutionCapsule (no divergent logic). If any conditional branches unique to batch: refactor into shared internal executeGraph(ctx) primitive.

**H. Public exports audit**
- Produce single barrel (probably already `osric/index.ts`) that excludes: internal hashing, deepFreeze, capsule, low‑level integrity guard. Keep: defineCommand, rule base class, engine factory, preview/transaction/simulate, relevant types (CommandResult, DomainFailure, DiagnosticsSubset).
- Everything else becomes internal (enforced by removing from barrel).

**I. Structural regression tests intent**
- Already clarified; add a short comment header: “Changing snapshot requires deliberate structural review; update docs if intentional.”

**J. Draft escape hatch**
- Add explicit guard test asserting only key 'draft' bypasses deep freeze (prevents silent drift).

### Prioritized Execution Sequence
1. Export surface audit & pruning (H) (quick win, reduces cognitive load).
2. Simulate decision + implementation + docs (A).
3. Move/rename or remove discovery & ability helpers (B, C).
4. Result helper pruning or internalization (D).
5. Add draft deep‑freeze invariant test (J).
6. Add docs updates: hashing note, diagnostics failedRule, simulate vs preview (E, F).
7. Confirm batch path shares core executor; refactor if needed (G).
8. Commit doc clarifications & cross‑link concepts → authoring (tie objectives to actual API).

### Test Additions (lightweight)
- simulate: success, domain failure, structural failure includes failedRule.
- draft deep‑freeze: attempt post‑merge mutation throws/fails except inside sanctioned draft pipeline.
- Surface: expect only approved exports (runtime assertion in test enumerating Object.keys(require(main))).

### Acceptance Criteria
- No consumer test needs internal modules directly.
- All previous 112 tests still pass + new ones.
- Docs contain no references to removed helpers or ok().
- Snapshot tests unchanged (unless simulate export adds none—should not).

### Optional Nice‑To‑Haves
- Add minimal “Design Guarantees” section summarizing invariants (acyclic, disjoint keys, deterministic RNG, atomic effects).
- Provide a guided “Authoring Checklist” (params schema, rules with categories, declare dependencies, run structural snapshot).

Let me know if you’d like me to begin with Step 1 (surface audit & patch) now; otherwise I can stage docs first. Just say “proceed” (and note if you want simulate exported).
