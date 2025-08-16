# Domain Engine Authoring (OSRIC Example)

This section explains how to build a domain layer atop the common engine. OSRIC (`osric-engine/`) is the exemplar: it supplies a domain store, entities, commands, shared rules, post-processing, and a scenario script.

## Layer Responsibilities
- Provide store implementing EngineStore interface semantics.
- Define domain entities & helpers.
- Implement commands via the common DSL (importing `command` from engine package root re-export).
- Post-process successful effects (battle mirroring) in wrapper.
- Supply deterministic scenario(s) for regression & reproducibility.

## Folder Structure (Current)
```
osric-engine/
  engine.ts
  memoryStore.ts
  domain/entities/battle.ts
  commands/*.ts
  shared-rules/characterExist.ts
  effects/mirrorBattleEffects.ts
  scenarios/determinism.ts
  index.ts
```

## Wrapper Pattern
`DomainEngine` composes core `Engine` and, after each successful execution / batch, augments effects via `mirrorBattleEffects` (idempotent). It never mutates core engine internals.

## Command Implementation Style
Commands declare params interface + result interface (for consumers) and register rule functions across stages. Shared logic (character existence) extracted to `shared-rules` only after reuse threshold.

## Shared Rules Policy
Promote only when:
1. Pure relative to provided ctx (except sanctioned store reads)
2. Used by ≥2 commands
3. Stable semantic (unlikely to diverge across commands)

## Determinism Scenario
`scenarios/determinism.ts` runs a fixed command sequence and returns `{ seed, outcomes, effects, finalState }`. Test ensures same seed -> identical JSON.

## Adding a New Command
1. Create `commands/yourCommand.ts` importing `command` DSL.
2. Define params/result interfaces.
3. Add stage rules (validate/load/calc/mutate/emit) in logical order.
4. Reuse shared rules if criteria met.
5. Add unit test under `__tests__/domain/` verifying success/failure + determinism if RNG used.

## Adding Post-Processing
Extend wrapper only (e.g., new effect transformation). Keep pure: accept previous effects, return appended list.

## Store Extensions
Add new entity arrays & helpers inside `memoryStore.ts`. Ensure snapshot-friendly (plain objects, no functions).

## Release Considerations
- Update domain barrel `index.ts` if exposing new types.
- Extend scenario if new behavior materially changes aggregated output (or create a second scenario file).
