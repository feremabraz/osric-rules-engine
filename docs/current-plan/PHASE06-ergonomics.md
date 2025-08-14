# Phase 06 – Ergonomics & Authoring Quality

Goal: Add small, incremental quality-of-life helpers and guardrails to make command authoring, testing, and runtime usage smoother without expanding core feature scope. Ordered for incremental, low‑risk adoption (each item may depend on previous infrastructure where noted).

## Adoption Policy
Certain ergonomics represent how existing code would have been authored if the helper had existed originally. When such an item lands it MUST retrofit current usages (search & replace patterns) so the codebase stays consistent. Other helpers are additive sugar and can be adopted opportunistically.

Legend:
- Adoption Mode: Replace = implement helper AND refactor existing code to use it in same PR.
- Adoption Mode: Additive = helper introduced for brand‑new capability (no existing ad‑hoc pattern to replace).
- Guard = introduces enforcement (tests/lints) preventing regression to legacy style.

Refactor Rule:
If an item was initially marked Additive but equivalent ad‑hoc patterns already exist, treat it as Replace: the introducing PR must retrofit those occurrences. Only items introducing net‑new capability (no prior pattern) remain Additive (e.g. Item 12 command factory, Item 13 graph visualization, Item 14 batch orchestration).

## Item 1: Result Type Guards & Unwrap Helpers
Purpose: Simplify consumer code handling `Result` unions.
Dependencies: Existing `Result` type.
Specification:
- `isOk(res)`, `isFail(res)` type guards.
- `assertOk(res)` returning data or throwing standard error.
- `unwrap(res, fallback?)` convenience (returns data or fallback / throws if none).
Adoption Mode: Replace (retrofit existing manual `res.ok ? res.data : ...` narrowing patterns where feasible without obscuring logic).
Acceptance: Tests show narrowed types without casts; representative refactors committed.

## Item 2: ID Runtime Type Guards & Parsers
Purpose: Provide standard runtime validation & parsing for branded IDs (now mandatory) beyond zod parsing contexts.
Dependencies: Branded ID types & schemas.
Specification:
- `isCharacterId`, `isMonsterId`, `isItemId`, `isBattleId` prefix + shape checks.
- `parseCharacterId` (throwing) and `tryParseCharacterId` (null on invalid) patterns; generic factory to avoid duplication.
Adoption Mode: Replace (refactor ad‑hoc prefix checks / manual casts in rules & tests).
Acceptance: Guards refine types; legacy inline regex checks removed where not in schema definitions.

## Item 3: Generic ID Utilities & Discriminator
Purpose: Uniform handling for mixed ID values.
Dependencies: Item 2.
Specification:
- `idKind(value): 'character'|'monster'|'item'|'battle'|'unknown'`.
- `ensureCharacterId(value)` asserts or throws.
Adoption Mode: Additive (introduce; refactor only hot spots needing branching on mixed IDs).
Acceptance: Unit tests for each prefix & unknown case.

## Item 4: Command Result Functional Helpers
Purpose: Enable lightweight functional chaining without verbose conditionals.
Dependencies: Item 1.
Specification:
- `mapResult(res, fn)`.
- `tapResult(res, sideEffect)`.
- `chain(res, nextFn)`.
Adoption Mode: Additive (used in new code / selective refactors where clarity improves).
Acceptance: Tests show preservation of failure results and transformed success.

## Item 5: Effects & Event Accessors
Purpose: Easier introspection of effects emitted by last commands for tooling & tests.
Dependencies: Existing `engine.events`.
Specification:
- `getEffects(engine, filter?)`.
- `effectStats(engine)`.
Adoption Mode: Replace (refactor existing manual filtering of `effectsLog` in tests and helper utilities).
Acceptance: Tests confirm counts update.

## Item 6: Battle Convenience Helpers
Purpose: Simplify common battle queries.
Dependencies: Battle state shape.
Specification:
- `getBattle(engine, battleId)`.
- `activeCombatant(engine, battleId)`.
- `listBattleOrder(engine, battleId)`.
Adoption Mode: Replace (update recurring direct `engine.store.getBattle(...)?...` property access in commands/tests to helpers; isolated one-off accesses may remain).
Acceptance: Tests using startBattle & nextTurn validate helpers.

## Item 7: Composite Combat Convenience
Purpose: One-call attack + conditional damage.
Dependencies: Items 1 & 6.
Specification:
- `applyAttackAndDamage(engine, { attacker, target })`.
Adoption Mode: Replace (refactor all repeated attack+conditional damage sequences; keep single illustrative manual sequence only if pedagogical).
Acceptance: Parity test vs manual sequence.

## Item 8: Testing Shortcuts
Purpose: Reduce boilerplate in test setup.
Dependencies: Items 1–3.
Specification:
- `testExpectOk(promise)`.
- `fastCharacter(engine, overrides?)`.
- `snapshotWorld(engine)`.
Adoption Mode: Replace (all repetitive character setup & ok assertion boilerplate migrated).
Acceptance: Refactored sample tests; no flakiness.

## Item 9: RNG & Dice Utilities
Purpose: Centralize dice patterns.
Dependencies: None.
Specification:
- `rollDie(rng, sides)`.
- `rollDice(rng, spec)`.
- `withTempSeed(rng, seed, fn)`.
Adoption Mode: Replace (refactor existing inline die rolls / damage or morale dice logic that manually uses rng.next / custom loops into `rollDie` / `rollDice`).
Acceptance:
- Utilities unit‑tested (parse, determinism).
- All inline patterns like `rng()` / manual summing of multiple dice replaced (enumerate in PR description).
- No residual ad‑hoc dice expression parsing in commands.

## Item 10: Store Entity Access Helpers
Purpose: Stronger typing & reduced repetition.
Dependencies: Branded IDs.
Specification:
- `getCharacter` / `requireCharacter` / `updateCharacter`.
- `listCharacters`, `queryFaction`.
Adoption Mode: Replace (high‑traffic call sites mandatory; low‑frequency sites may defer but should be listed in PR TODO).
Acceptance: Helper tests + a few refactors.

## Item 11: Authoring Consistency Guards
Purpose: Prevent regression to legacy patterns.
Dependencies: Existing output enforcement; Item 2.
Specification:
- Test ensuring branded ID schemas in command params (no raw regex).
- Optional runtime `assertParamSchemasUseBrandedIds()`.
Adoption Mode: Guard (enforcement).
Acceptance: Failing test if legacy pattern reintroduced.

## Item 12: Command Definition Sugar (Low Magic)
Purpose: Reduce boilerplate for new commands.
Dependencies: Items 1 & 11.
Specification:
- `defineCommand({ key, params, rules })`.
- `emptyOutput` constant.
Adoption Mode: Additive (no prior ad‑hoc factory pattern to replace; migrate only one existing command as exemplar).
Acceptance: Parity test; doc example updated.

## Item 13: Rule Dependency Visualization (Tooling)
Purpose: Aid debugging and documentation.
Dependencies: Registry introspection.
Specification:
- `explainRuleGraph(commandKey)`.
Adoption Mode: Additive (pure tooling; no legacy pattern).
Acceptance: Snapshot test of graph JSON.

## Item 14: High-Level Batch & Atomic Execution
Purpose: Orchestrate multiple commands.
Dependencies: Items 1 & 4.
Specification:
- `batch(engine, steps)`.
- `batchAtomic(engine, steps)`.
Adoption Mode: Additive (new orchestration capability; no legacy equivalent).
Acceptance: Early-stop test for atomic variant.

## Item 15: Future Guardrails (Deferred)
Purpose: Document ideas not entering 06 unless capacity remains.
- `validateRegistry`, `diffWorld`, `enforceHpBounds` helper.
Adoption Mode: Deferred.
Acceptance: N/A.

## Completion Criteria
- All Replace-mode items: helper implemented + identified legacy patterns refactored in same PR (PR description lists files touched).
- Guard items: tests/lints fail if legacy pattern reintroduced.
- Additive items: helper/tool + tests + exemplar usage (where specified).
- No domain feature expansion.

## Out-of-Scope
- Persistence adapters.
- AI / complex morale extensions.
- Plugin system or dynamic entity registration.
