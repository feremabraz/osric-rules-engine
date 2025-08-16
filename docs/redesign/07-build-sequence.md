# 07. Build Sequence (Numbered, Dependency-Ordered)

Authoritative incremental implementation plan for the redesign. Each item depends strictly on previous items' acceptance criteria. Commands auto-register at definition time. Batch result shape chosen as a single aggregated object (details below). No draft escape hatch (removed for minimalism). Store snapshots use a deep structural clone (single strategy).

---
## Conventions
- ID format: CE-* for Common Engine, DE-* for Domain Engine.
- Each item produces code + tests; no forward references.
- All commands auto-register when their builder is evaluated.
- Batch result shape: `{ ok: boolean; results: CommandOutcome[]; effects: Effect[]; failed?: CommandOutcome[] }` where `ok` means all succeeded (atomic) or at least one succeeded (non-atomic) — see CE-11.
- No `draft` key behavior (simplifies integrity and merge logic). If future need arises, will reintroduce under a new ID (CE-EXT-01) with explicit rationale.

---
## Common Engine Sequence

### CE-01 Hash & Freeze
**Depends:** none
**Deliverables:** `core/hash.ts`, `core/freeze.ts`
**Details:** Implement FNV-1a 64-bit (`fnv1a64(data: Uint8Array|string|object)` with deterministic traversal) and `deepFreeze` (recursively freeze objects & arrays). Avoid handling functions/symbols beyond throwing engine failure if encountered during traversal.  
**Acceptance:**
- Hash of identical objects (order-different key insertion) matches.
- Tamper test (modify frozen object) throws or prevented.

### CE-02 Result & Failure Types
**Depends:** CE-01
**Deliverables:** `core/result.ts`
**Details:** Discriminated union: `SuccessResult`, `DomainFailureResult`, `EngineFailureResult`; helpers `success(data, effects)`, `domainFail(code, message?)`, `engineFail(code, message?)`.
**Acceptance:** Unit tests asserting shapes & type narrowing.

### CE-03 RNG
**Depends:** CE-02
**Deliverables:** `core/rng.ts`
**Details:** Seeded PRNG (e.g. Mulberry32 or XorShift) with `float()`, `int(min,max)`, `getState()`, `setState()`.
**Acceptance:** Identical seed → identical first N numbers; state restore test.

### CE-04 Effects Buffer
**Depends:** CE-02
**Deliverables:** `core/effects.ts`
**Details:** Class with `add(type,target,payload?)`, internal array, `drain()` returning frozen snapshot and clearing.  
**Acceptance:** Order preserved; drain empties buffer.

### CE-05 Command Descriptor & Registry
**Depends:** CE-04
**Deliverables:** `core/command.ts`, `facade/registry.ts`
**Details:** Internal `CommandDescriptor` with `stages: { validate: RuleFn[]; load: ... }`. Global registry supporting `register(descriptor)`; duplicate key throws.
**Acceptance:** Duplicate key test; zero-rules command forbidden.

### CE-06 DSL Builder
**Depends:** CE-05
**Deliverables:** `authoring/dsl.ts`
**Details:** `command(key, paramsSchema)` returning a proxy/chain object with `.validate()`, `.load()`, `.calc()`, `.mutate()`, `.emit()`. Each call pushes rule function to stage array. On first call to any stage, builder stores descriptor. Auto-register descriptor immediately after first stage method call (or at chain completion; choose immediate to simplify). Returns final descriptor object (frozen) at end of chain (return value of last method). No `.build()`.
**Acceptance:** Test multi-stage ordering & auto-registration.

### CE-07 Integrity Guard Execution Merge
**Depends:** CE-06, CE-01
**Deliverables:** `core/integrity.ts`, integrated into executor later (placeholder API `computeHash(acc)` + `verifyHash(oldHash, acc)`).
**Details:** Provide functions for hashing accumulator. Not yet wired into execution (that occurs CE-08) but independently tested.
**Acceptance:** Hash stable across reorder of key insert order.

### CE-08 Executor
**Depends:** CE-07, CE-03
**Deliverables:** `core/executor.ts`
**Details:** `runCommand(descriptor, rawParams, ctx)` pipeline: parse params, stage loop, call rule fns; handle domain failure sentinel; duplicate key detection; deep freeze merge; integrity hash after each merge & final recompute; collect effects via buffer; RNG initial advance at start.
**Acceptance:** Duplicate key → engine fail; thrown error → RULE_EXCEPTION; integrity tamper test (simulate post-merge mutation) → INTEGRITY_MUTATION; domain failure short-circuits with no effects.

### CE-09 Engine Facade
**Depends:** CE-08, CE-05
**Deliverables:** `facade/engine.ts`
**Details:** Class `Engine` with constructor(config: { seed?: number; store: EngineStore }) and methods: `execute(key, params)`, `simulate(key, params)`, `batch(list, options)`. Maintains RNG & wraps `runCommand`.
**Acceptance:** Basic execute success/failure tests; unknown command throws (or engine fail — choose engine fail for consistency) with code `UNKNOWN_COMMAND`.

### CE-10 Store Interface & Snapshot
**Depends:** CE-09
**Deliverables:** `core/types.ts` defining `EngineStore { snapshot(): unknown; restore(snap: unknown): void; }`; test memory store for engine unit tests.
**Snapshot Strategy:** Deep structural clone via JSON-like traversal (single code path) ensuring deterministic restore. (Complex references not supported; domain layer responsible for plain-object entities.)
**Acceptance:** After modify + restore, state equals pre-snapshot, RNG state unaffected.

### CE-11 Simulation & Diff
**Depends:** CE-10
**Deliverables:** `facade/simulate.ts` implementation & diff logic inside engine simulate. Diff heuristic: compare snapshot arrays of objects with `id` field; classify created (in after only), deleted (in before only), mutated (in both with differing shallow hash of object JSON). Domain store must expose arrays enumerably.
**Acceptance:** Test created/mutated/deleted classification.

### CE-12 Batch (Atomic & Non-Atomic)
**Depends:** CE-11
**Deliverables:** `core/batch.ts` integrated into Engine; batch result shape unified.
**Details:**
- Input: `[{ key, params }, ...]`.
- Return: `{ ok, results: CommandOutcome[], effects, failed?: CommandOutcome[] }`.
- Atomic: if any failure → rollback store+RNG; results contains failures; `ok=false`; effects empty.
- Non-Atomic: success results committed; failures collected; `ok=true` only if at least one success (keeps simple semantic). Effects = concatenation of successful command effects.
**Acceptance:** Atomic rollback test; non-atomic partial success test; effect aggregation.

### CE-13 Public Barrel & API Snapshot
**Depends:** All prior CE
**Deliverables:** `index.ts` exporting: `command, Engine, simulate, batch, types`; test capturing `Object.keys(require('...'))` snapshot.
**Acceptance:** Snapshot stable.

### CE-14 Documentation Sync
**Depends:** CE-13
**Deliverables:** Update `03-dsl-spec.md` & `01-common-engine-plan.md` with any divergences discovered; mark CE sequence complete.
**Acceptance:** Docs reflect actual exported symbols.

---
## Domain Engine (OSRIC) Sequence

### DE-01 Domain Store & Entities (Minimal)
**Depends:** CE-10
**Deliverables:** `osric-engine/domain/entities/*`, `memoryStore.ts` implementing EngineStore + entity ops.
**Acceptance:** create/update/query tests.

### DE-02 Wrapper & Single Command (grantXp)
**Depends:** DE-01, CE-13
**Deliverables:** `osric-engine/engine.ts`, `commands/grantXp.ts`.
**Acceptance:** Execute + simulate deterministic; xp increments; not-found failure.

### DE-03 createCharacter & inspireParty
**Depends:** DE-02
**Acceptance:** Added behavior passes adapted legacy tests.

### DE-04 Battle Entities & startBattle
**Depends:** DE-03
**Acceptance:** startBattle initializes expected battle state.

### DE-05 attackRoll (RNG Usage)
**Depends:** DE-04
**Acceptance:** Seed repeatability; snapshot of attack result stable with fixed seed.

### DE-06 Effects Mirroring
**Depends:** DE-05
**Deliverables:** `mirrorBattleEffectsIfAny` integrated into wrapper post-success & atomic batch end.
**Acceptance:** Uniqueness per (round,type,target,payload); idempotent across batch.

### DE-07 Remaining Commands & Shared Rule Extraction
**Depends:** DE-06
**Acceptance:** Only reused logic appears in `shared-rules/`; duplication removed.

### DE-08 Scenario Determinism Script
**Depends:** DE-07
**Acceptance:** Running scenario twice with same seed yields identical aggregated result/effects JSON.

### DE-09 Legacy Removal
**Depends:** DE-08
**Acceptance:** No references to `osric/`; tests green.

### DE-10 Domain Docs Sync
**Depends:** DE-09
**Deliverables:** Update redesign docs referencing final command list, new public barrel `osric-engine/index.ts`, removal of legacy path aliases, and inclusion of scenario determinism script.
**Final Command List (public):** grantXp, createCharacter, inspireParty, startBattle, attackRoll.
**Shared Rules:** `shared-rules/characterExist.ts` only (others inlined per policy).
**Scenario Script:** `osric-engine/scenarios/determinism.ts` (exposed via barrel) proves determinism.
**Exports:** Package root now maps to `osric-engine/index.ts`.
**Acceptance:** Docs reflect current folders & exports; no stale references to removed `osric/` directory or path aliases.

---
## Rationale for Decisions Captured Here
- **Auto-Register Commands:** Minimizes forgetting registration; single path, less boilerplate.
- **Aggregated Batch Result:** Consumers get all per-command outcomes + unified effects without needing to manually sum.
- **Removed draft Key:** Avoids special-case mutable key path; enforces uniform immutability & integrity flow.
- **Deep Clone Snapshot:** Single strategy ensures atomic batch & simulation consistency; avoids complexity of differential strategies.

---
## Open (Deferred) Items (Explicitly Not in Sequence)
- Parallel rule execution (requires dependency metadata beyond stage ordering).
- Per-rule schema validation (could be CE-EXT-02 later, optional overlay).
- Streaming/partial effects consumption (not needed for current domain size).

---
## Acceptance Gate for Moving from CE to DE Work
All CE-* items through CE-13 must be green (tests + snapshot) before starting DE-01. CE-14 doc sync can occur in parallel with early DE tasks if no API changes arise, but any CE change resets the gate.

---
## Glossary (Quick Reference)
- **CommandOutcome:** A single command's success or failure result object from CE.
- **Effect:** `{ type: string; target: string; payload?: unknown }`.
- **Accumulator:** Unified result object produced by merging rule return fragments.

End of build sequence.
