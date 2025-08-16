# 04. Migration Plan

Transition from legacy `osric/` implementation to redesigned `engine/` + `osric-engine/` without breaking active development velocity.

## Phases
### Phase 1: Scaffolding
- Add `engine/` and `osric-engine/` folders with placeholder README or TODO markers.
- Introduce redesign docs (this folder) to main branch for shared visibility.

### Phase 2: Core Engine Minimal Implementation
- Implement `engine/core` primitives: hash, freeze, rng, effects, result.
- Implement DSL (`authoring/dsl.ts`) returning internal `CommandDescriptor`.
- Implement executor with integrity hashing and duplicate key guard.
- Implement registry + engine facade + simulate + batch.
- Add unit tests for: param fail, success, duplicate key, tamper mutation, batch atomic rollback.

### Phase 3: First Domain Command Port
- Implement minimal domain store (`osric-engine/domain/store/memoryStore.ts`).
- Port `gainExperience` (grant XP) as `commands/grantXp.ts`.
- Implement `osric-engine/engine.ts` wrapper calling common engine.
- Test single command end-to-end (execute + simulate + batch of one).

### Phase 4: Incremental Command Ports
- Port remaining commands one by one:
  1. createCharacter
  2. inspireParty
  3. attackRoll
  4. savingThrow
  5. startBattle + battle flow commands
- Co-locate rules; only extract shared functions after ≥2 usages.

### Phase 5: Battle Effects Mirroring
- Implement `mirrorBattleEffectsIfAny` and integrate into wrapper post-success logic.
- Add tests for uniqueness per round + batch atomic integration.

### Phase 6: Simulation & Diff Enhancements
- Add entity diff (created/mutated/deleted) using domain store snapshot comparator.
- Extend simulate tests.

### Phase 7: Decommission Legacy (Completed)
- Parity confirmed (all tests green under new engine paths).
- Legacy `osric/` folder removed; docs & exports updated.

### Phase 8: Cleanup & Hardening (Completed)
- Public barrel now `osric-engine/index.ts` minimal.
- Deterministic replay scenario implemented (DE-08).
- API surface validated via existing public API test (CE-13) plus domain barrel inclusion.

### Phase 9: Pre-Split Readiness (Optional)
- Ensure `engine/` can be copied standalone (no relative imports to `osric-engine/`).
- Ensure `osric-engine/` only imports from `engine/` and relative domain files.

## Test Coverage Targets
| Area | Must-Have |
|------|-----------|
| Executor | duplicate key, integrity mutation, exception handling |
| DSL | multi-stage ordering, zero-stage (invalid), multiple rules per stage |
| Batch | atomic rollback, non-atomic partial success, effect aggregation |
| Simulation | no store change, correct diff, deterministic RNG |
| Domain | XP grant, battle flow, effect mirroring uniqueness |

## Rollback Strategy
If a migration phase uncovers blocking issue:
- Revert to prior commit (docs remain).
- Branch off hotfix for legacy code if needed.

## Success Criteria
- All original behavioral tests replaced by redesigned equivalents (or intentionally dropped) pass.
- Public API reduced to agreed minimal set.
- Domain wrapper composes without CE modifications.
- Integrity guard detects tamper test reliably.

