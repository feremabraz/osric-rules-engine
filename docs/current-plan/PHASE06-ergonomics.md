# Phase 06 – Ergonomics & Authoring Quality

Goal: Add small, incremental quality-of-life helpers and guardrails to make command authoring, testing, and runtime usage smoother without expanding core feature scope. Ordered for incremental, low‑risk adoption (each item may depend on previous infrastructure where noted).

## Item 1: Result Type Guards & Unwrap Helpers
Purpose: Simplify consumer code handling `Result` unions.
Dependencies: Existing `Result` type.
Specification:
- `isOk(res)`, `isFail(res)` type guards.
- `assertOk(res)` returning data or throwing standard error.
- `unwrap(res, fallback?)` convenience (returns data or fallback / throws if none).
Acceptance: Tests show narrowed types without casts.

## Item 2: ID Runtime Type Guards & Parsers
Purpose: Provide standard runtime validation & parsing for branded IDs (now mandatory) beyond zod parsing contexts.
Dependencies: Branded ID types & schemas.
Specification:
- `isCharacterId`, `isMonsterId`, `isItemId`, `isBattleId` prefix + shape checks.
- `parseCharacterId` (throwing) and `tryParseCharacterId` (null on invalid) patterns; generic factory to avoid duplication.
Acceptance: Guards refine types in conditional blocks; invalid parse throws consistent message.

## Item 3: Generic ID Utilities & Discriminator
Purpose: Uniform handling for mixed ID values.
Dependencies: Item 2.
Specification:
- `idKind(value): 'character'|'monster'|'item'|'battle'|'unknown'` via prefix.
- `ensureCharacterId(value)` asserts or throws.
Acceptance: Unit tests for each prefix & unknown case.

## Item 4: Command Result Functional Helpers
Purpose: Enable lightweight functional chaining without verbose conditionals.
Dependencies: Item 1.
Specification:
- `mapResult(res, fn)` transforms success payload.
- `tapResult(res, sideEffect)` returns original result after side effect on success.
- `chain(res, nextFn)` sequential composition (short-circuits on failure).
Acceptance: Tests show preservation of failure results and transformed success.

## Item 5: Effects & Event Accessors
Purpose: Easier introspection of effects emitted by last commands for tooling & tests.
Dependencies: Existing `engine.events` structure.
Specification:
- `getEffects(engine, filter?)` returns flattened list.
- `effectStats(engine)` summarises counts by type.
Acceptance: Tests confirm counts update after executing commands.

## Item 6: Battle Convenience Helpers
Purpose: Simplify common battle queries.
Dependencies: Battle state shape.
Specification:
- `getBattle(engine, battleId)` typed accessor (wraps store).
- `activeCombatant(engine, battleId)` returns `CharacterId | null`.
- `listBattleOrder(engine, battleId)` returns array of CharacterIds.
Acceptance: Tests using startBattle & nextTurn validate helpers.

## Item 7: Composite Combat Convenience
Purpose: Provide single-call high-level operation for common pattern (attack then damage if hit).
Dependencies: Items 1 & 6.
Specification:
- `applyAttackAndDamage(engine, { attacker, target })` internally runs `attackRoll` then conditionally `dealDamage`; returns combined structured result including both payloads or early failure.
Acceptance: Test ensures equivalence to manual two-step invocation.

## Item 8: Testing Shortcuts
Purpose: Reduce boilerplate in test setup.
Dependencies: Items 1–3.
Specification:
- `testExpectOk(promise)` resolves & asserts ok returning data.
- `fastCharacter(engine, overrides?)` creates minimal viable character (using `createCharacter`).
- `snapshotWorld(engine)` (alias of existing normalization) for stable diff.
Acceptance: Tests refactored to use helpers without increasing flakiness.

## Item 9: RNG & Dice Utilities
Purpose: Centralize dice patterns to prevent ad-hoc implementations.
Dependencies: None (independent).
Specification:
- `rollDie(rng, sides)`.
- `rollDice(rng, spec)` parse simple forms (d4,d6,d8,d10; NdX(+/-)M) returning `{ total, rolls[], bonus }`.
- `withTempSeed(rng, seed, fn)` executes fn with forked deterministic sequence.
Acceptance: Parsing tests; deterministic with seed.

## Item 10: Store Entity Access Helpers
Purpose: Stronger typing & reduced repetition when accessing characters.
Dependencies: Branded IDs.
Specification:
- `getCharacter(store, id)` / `requireCharacter(store, id)` / `updateCharacter(store, id, patch)`.
- `listCharacters(store)` and `queryFaction(store, faction)` convenience queries.
Acceptance: Unit tests + small internal refactor (optional) to use helpers in one command as exemplar.

## Item 11: Authoring Consistency Guards
Purpose: Prevent regression to legacy patterns (e.g., raw regex for IDs, z.any rule outputs).
Dependencies: Existing enforcement test for `z.any` in rule outputs; Item 2.
Specification:
- New test scanning command param schemas to ensure they use exported branded schemas (not raw regex).
- Optional runtime `assertParamSchemasUseBrandedIds()` for diagnostic mode.
Acceptance: Failing test if a command reintroduces `z.string().regex(/^char_/)` patterns.

## Item 12: Command Definition Sugar (Low Magic)
Purpose: Reduce boilerplate for new commands while staying explicit.
Dependencies: Items 1 & 11 (guards ensure sugar still produces branded schema usage).
Specification:
- `defineCommand({ key, params, rules })` returns generated subclass registering itself.
- `emptyOutput` exported constant (`z.object({})`).
Acceptance: One existing trivial command (e.g., inspireParty) migrated in branch to prove parity.

## Item 13: Rule Dependency Visualization (Optional Tooling)
Purpose: Aid debugging and documentation.
Dependencies: Registry introspection.
Specification:
- `explainRuleGraph(commandKey)` returns `{ order: string[]; edges: [from,to][] }`.
- CLI/dev helper to print simple ASCII or JSON.
Acceptance: Snapshot test comparing graph for a known command.

## Item 14: High-Level Batch & Atomic Execution
Purpose: Orchestrate multiple commands with consistent error propagation.
Dependencies: Items 1 & 4.
Specification:
- `batch(engine, steps: [key, params][])` sequentially executes returning array of results.
- `batchAtomic(engine, steps)` aborts at first failure and returns structured outcome `{ ok: boolean; results[] }`.
Acceptance: Test scenarios with mid-sequence failure confirm early stop in atomic variant.

## Item 15: Future Guardrails (Deferred / Nice-to-have)
Purpose: Document ideas not entering 06 unless capacity remains.
- `validateRegistry(engine)` summary.
- `diffWorld(before, after)` structural diff.
- `enforceHpBounds(entity)` singular helper (currently inline logic suffices).
Acceptance: N/A (documentation only this phase).

## Completion Criteria
- All implemented helpers fully unit-tested with deterministic behavior where applicable.
- No expansion of core domain rules; only ergonomics & guardrails.
- Updated docs (design + authoring) referencing new helpers where they materially improve examples.

## Out-of-Scope
- Persistence adapters.
- AI / complex morale extensions.
- Plugin system or dynamic entity registration.
