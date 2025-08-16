# Redesign Overview (Common Engine + OSRIC Domain)

This document captures the agreed architecture for a clean re‑implementation separating a *common generic engine* from the *OSRIC domain engine*, enforcing a single execution path, minimal surface, and strict layering.

---
## Final Pending Choices (Resolved)
1. Manual intra‑stage dependencies via handles: **Excluded** (rely purely on stage ordering + declaration order).
2. `emit` stage: **Kept** (distinct stage after `mutate`).
3. Per‑rule output schemas: **Dropped** (simplicity; integrity + immutability suffice initially).

---
## Layering Model
- **Common Engine (CE)**: Generic command–rule orchestrator. Stable minimal API. No domain knowledge.
- **Domain Engine (DE: OSRIC)**: Wraps CE. Provides domain store, entities, commands (rules co‑located in command files), and post‑processing (e.g. battle effect mirroring). DE never modifies CE code.
- **Future Domains**: Emulate OSRIC pattern; depend on CE; no changes inside CE.

### Invariants
- One execution pipeline (no feature flags).  
- Deterministic RNG + integrity guard always active.  
- Batching always present (atomic + non‑atomic).  
- Simulation/preview always available.  
- No hook/plugin system; domain customization via wrapper only.  

---
## Domain Customization Without Hooks
The OSRIC wrapper class/function owns:
1. Constructing CE with a domain store reference (store object is passed through the rule context).  
2. Calling `ce.execute` / `ce.executeBatch`.  
3. Post‑processing successful command results (e.g. mirroring effects into battle logs) before returning them.  
4. Aggregating & applying mirror logic once after atomic batches or per-success for non‑atomic batches.  

No generic hook arrays inside CE — wrapper composition only.

---
## Folder Structure (Single Repo Phase)
```
engine/
  index.ts
  core/
    command.ts
    rule.ts
    executor.ts
    dag.ts
    hash.ts
    rng.ts
    effects.ts
    freeze.ts
    integrity.ts
    batch.ts
    result.ts
    types.ts
  authoring/
    dsl.ts
  facade/
    engine.ts       # createEngine()
    registry.ts
    simulate.ts

osric-engine/
  engine.ts            # domain wrapper & effect mirroring
  memoryStore.ts       # domain store (characters, battles)
  domain/
    entities/
      battle.ts        # battle state + participant types
  commands/
    grantXp.ts
    createCharacter.ts
    inspireParty.ts
    startBattle.ts
    attackRoll.ts
  shared-rules/
    characterExist.ts  # reused character existence guard
  effects/
    mirrorBattleEffects.ts
  scenarios/
    determinism.ts     # DE-08 deterministic scenario script
  index.ts             # public barrel export
```

### Rule Location Policy
Implemented: rules co‑located in command files; only `characterExist` promoted (multi-command reuse). No other shared rules presently.

---
## DSL Specification (Minimal)
```
command(key: string, paramsSchema: ZodObject)
  .validate(fn)   // zero or more validate stage rules
  .load(fn)       // zero or more load stage rules
  .calc(fn)       // zero or more calc stage rules
  .mutate(fn)     // zero or more mutate stage rules
  .emit(fn)       // zero or more emit stage rules (side-effect emission)
// Chain end returns an immutable command descriptor
```

### Execution Ordering
Fixed stage sequence: `validate -> load -> calc -> mutate -> emit`.
Within each stage: the order rules are declared in the command file.  
No manual dependencies (no handles, no names).  

### Rule Naming & Identity
Auto-generated internal identifiers: `<Stage><Index>` (e.g. `Validate1`, `Load2`). Only used for diagnostics/introspection.

### Rule Return Values
- Return `undefined` or an object fragment `{ key: value, ... }`.
- Fragments shallow‑merged into accumulator (disjoint keys enforced; duplicate key => engine failure `DUPLICATE_RESULT_KEY`).
- All fragment values frozen (deep freeze) except those under a reserved `draft` key (escape hatch retained or can be removed later—decision deferred; currently: keep minimal or remove?).

### Effects
Rules (any stage, typically `emit`) can call `ctx.effects.add(type, target, payload?)`. Effects commit only on overall success (single command or atomic batch). Domain wrapper performs battle mirroring after commit.

---
## Integrity Guard
- Hash algorithm: single FNV‑1a (64-bit or 32-bit; choose implementation in `hash.ts`).
- After each merge: compute hash of accumulator (structural, deterministic).  
- After all rules: recompute; mismatch => fail with `INTEGRITY_MUTATION`.  
- Guarantees immutability / no out-of-band mutation.

---
## Batching
API (domain wrapper or CE facade):
```
executeBatch(commands: { key: string; params: unknown }[], options?: { atomic: boolean })
```
- Atomic: snapshot store + RNG once; rollback entirely on first failure. Effects aggregated then committed; domain post-processing once.
- Non‑atomic: each command executed & committed independently; failures collected; effects mirrored per success.

---
## Simulation
`simulate(commandKey, params)` executes inside a transactional snapshot; returns `{ result, diff, effects }` without persisting state or effects.

---
## Result & Failure Model
- Success: `{ ok: true, data: AccumulatorObject, effects }`.
- Domain failure (rule returned `fail(code, message?)`): `{ ok: false, type: 'domain', code, message }`.
- Engine failure (structural): `{ ok: false, type: 'engine', code, message }` with codes: `PARAM_INVALID`, `RULE_EXCEPTION`, `DUPLICATE_RESULT_KEY`, `INTEGRITY_MUTATION`.

---
## Determinism
- CE seeds RNG from engine construction config (optional seed).  
- Each command advances RNG at start to avoid insertion side effects on previous sequences.  
- Simulation/batch rollback restores RNG state.  

---
## Post‑Processing (OSRIC Example)
`mirrorBattleEffectsIfAny(effects, store)` scans active battles and appends round‑scoped unique effect entries. Called only after successful execution (or once per atomic batch).

---
## Future Domain Pattern (Soccer Example)
A soccer domain replicates OSRIC’s folder pattern: `soccer-engine/engine.ts`, its own `commands/`, optional `shared-rules/`, domain `store/`, and post‑processing (e.g. match event timelines). No changes to CE; only composition/wrapping.

---
## Open Deferred Decisions (Documented for Later)
- Retain `draft` mutable escape hatch? (TBD; can remove if not needed.)
- Add optional per-rule schema reintroduction if real-world drift appears.  
- Parallel execution of independent rules (future; requires stable dependency invariants).  

---
## Migration Outcome Summary
Legacy `osric/` directory removed (DE-09). Engine + domain structure above is authoritative; package root exports from `osric-engine/index.ts`. Deterministic scenario (DE-08) verifies reproducibility. Remaining evolution paths (new commands, additional shared rules) will follow the same policy.

---
## Rationale Recap
Eliminate optionality and plugin complexity; ensure at-a-glance clarity (command files are authoritative pipelines); enforce immutability and integrity centrally; keep generic engine stable and domain-agnostic; enable future domains through replication, not modification.

