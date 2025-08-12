## OSRIC Rules Engine — Architecture, Conventions, and Roadmap

This document is the canonical reference for how to extend the engine safely, plus a concise roadmap with clear status markers (Done, Pending, Planned).

Last updated: 2025-08-12 (Phase 1: completed; Phase 2: planned)


## Project overview

- Language: TypeScript (TS 5)
- Test runner: Vitest (type-checking enabled)
- Lint/format: Biome
- Package manager: pnpm
- Source layout:
  - `osric/core`: engine primitives (Command, Rule, RuleChain, RuleEngine, Dice, Grid/Movement, ValidationPrimitives, GameContext)
  - `osric/types`: canonical public types and constants (COMMAND_TYPES, RULE_NAMES, domain types, rules metadata)
  - `osric/entities`: thin OO wrappers/factories around typed entities
  - `osric/commands`: strongly-typed command classes (user intents)
  - `osric/rules`: rules that implement mechanics executed via RuleChain/RuleEngine
  - `__tests__`: unit tests


## How the engine fits together (quick refresher)

- Commands
  - Represent user intent. Implement `BaseCommand` with `type` and parameters. Keep mechanics out; delegate to rules via RuleEngine.
  - Runtime contract: Each command must validate its parameters using its co-located validator (e.g. `osric/commands/character/validators/CreateCharacterValidator`) inside `validateParameters()` before `execute` runs. Validators are NOT re‑exported through `@osric/types`; always import them directly.

- Rules
  - Implement mechanics. Must implement `BaseRule.apply(context, command)` and `canApply()`. Scheduled into `RuleChain`s and ordered by `priority` and/or prerequisites.

- RuleChain / RuleEngine
  - RuleChain is an ordered list of rules with policies (stop on failure, merge results, clear temp data). RuleEngine maps command types to chains and executes them.

- GameContext
  - Jotai-backed state for entities and a temporary scratchpad. Commands set structured data; rules consume and can publish intermediate results.

- Types and Entities
  - `osric/types/*` defines public shapes and constants; single source of truth. `osric/entities/*` wraps those shapes with helpers and factories.


## Development conventions

  - Prefer `@osric/*` namespaces. Avoid introducing new top-level aliases without a clear need.

## Type imports after the types refactor

We no longer use the legacy `osric/types/entities.ts`. Import types from their canonical domain modules:

- Character domain: `@osric/types/character`
- Monster domain: `@osric/types/monster`
- Item domain: `@osric/types/item`
- Spell domain: `@osric/types/spell`
- Shared/IDs/utilities: `@osric/types/shared`

Examples:

```ts
import type { Character, CharacterClass } from '@osric/types/character';
import type { Monster } from '@osric/types/monster';
import type { Weapon } from '@osric/types/item';
import type { Spell } from '@osric/types/spell';
import type { CharacterId, SavingThrowType, StatusEffect } from '@osric/types/shared';
```

Note: Use the canonical modules above exclusively. The legacy barrel `@osric/core/Types` has been removed.
- Rule naming and implementation
  - Rule names come from `RULE_NAMES` (no ad-hoc strings). All rules implement `apply(context, command)` and can report prerequisites.

- Commands
  - `getRequiredRules()` should return `RULE_NAMES` values. Validate parameters using the command’s co‑located validator inside `validateParameters()`; avoid ad-hoc checks. `execute` should set context and delegate to the engine.

- Temporary context keys
  - Namespaced keys: `domain:feature:detail` (e.g., `character:saving-throw:params`). Use `BaseRule.getRequiredContext()` and `setContext()`.
  - Character creation specifically:
    - `character:creation:context` holds only `{ characterId }`.
    - `character:creation:params` holds the input parameters used by rules.

- Errors and diagnostics
  - Prefer structured errors surfaced to users; reserve raw `Error` for internal faults and convert at boundaries.

- Testing
  - Keep tests deterministic (mock dice when needed). Mirror folder structure under `__tests__`.


## Current configuration status

- TypeScript: Node-first, no DOM libs, `baseUrl` set, bundler resolution.
- Vitest: Aliases aligned to the repo; dead aliases removed.
- Biome: Node-appropriate rules; web/a11y rules removed.
- Scripts: `pnpm check` runs tests + typecheck + lint.

All configs are green today.

## Phase status at a glance

- Phase 1 — API and Context Consistency: Done
  - Done
    - [x] Discriminated union results (kind); legacy boolean removed
    - [x] Ergonomic helpers isSuccess/isFailure adopted across engine/rules/commands
    - [x] Rule names via RULE_NAMES; validators co‑located and used from commands
    - [x] Quality gates green (typecheck, lint, tests)
    - [x] Typed ContextKey<T> accessors for temporary data (overloads + TypedContextKey)
    - [x] Generic BaseRuleResult<T> and typed createSuccessResult<T>()/createFailureResult<T>()
    - [x] Optional helpers added: matchResult/unwrapSuccess (adoption will be incremental)
  - Pending
    - (none)

- Phase 2 — Behavior and Structure Normalization: Planned
  - [ ] Keep commands thin; move mechanics into rules where needed (single responsibility)
  - [ ] Naming normalization: one file → one purpose (each rule file exports one rule)
  - [ ] Extract duplicated logic (dice/modifiers) into shared helpers
  - [ ] Error model: converge on a simple DomainError (code/message/details)

- Phase 3 — Public Surface Pruning: Planned
  - [ ] Replace export * barrels with explicit exports or internalize
  - [ ] Remove unused or alias-only types; keep the most descriptive name
  - [ ] Ensure validators are not exported via @osric/types
  - [ ] Verify tree‑shaking friendliness (no side‑effects at module top level)

- Phase 4 — Developer Experience: Planned
  - [ ] Add small command guard helpers (ensureEntitiesExist/ensureConscious)

---

## Phases & Improvements

The focus remains internal clarity and consistency. No new gameplay features are in scope unless needed to eliminate duplication or ambiguity.

### Phase 1: API and Context Consistency (Done)

Objective: Make the core APIs consistent, strongly typed, and ergonomic.

Deliverables / Checklist
1. Context keys
  - [x] Consolidate all temporary keys under `ContextKeys`
  - [x] Introduce `ContextKey<T>` and typed accessors: `getTemporary<T>(key)`, `setTemporary<T>(key, value)`
2. Results
  - [x] Common `kind` discriminant everywhere
  - [x] `BaseRuleResult<T>` generic with typed `data?: T`
  - [x] `createSuccessResult<T>(msg, data?: T)` propagates types
3. Helpers
  - [x] `isSuccess` / `isFailure`
  - [x] Optional: `matchResult`, `unwrapSuccess` (helpers added; adopt where they clearly improve readability)

Exit Criteria
- Temp context accesses no longer use ad‑hoc string keys
- Rule results are generically typed where a stable data shape exists
- All quality gates green

### Phase 2: Behavior and Structure Normalization (Planned)

Objective: Ensure single responsibility and remove duplication.

Deliverables / Checklist
1. Commands vs Rules
  - [ ] Commands validate and set context; mechanics live in rules
2. Files and naming
  - [ ] One file → one rule class; consistent naming via `RULE_NAMES`
3. Duplicate logic
  - [ ] Extract shared dice/modifier routines used 2+ times
4. Error model
  - [ ] Introduce simple `DomainError` (code/message/details) and use where it helps clarity

Exit Criteria
- Thin commands, focused rules
- Reused helpers for common calculations
- Minimal, consistent error surface

### Phase 3: Public Surface Pruning (Planned)

Objective: Keep the public API as small and coherent as possible.

Deliverables / Checklist
1. Exports
  - [ ] Replace `export *` barrels with explicit exports or internalize
  - [ ] Remove unused exports and alias-only types
2. Boundaries
  - [ ] No validators exported via `@osric/types`
  - [ ] No side‑effects at module top level

Exit Criteria
- `pnpm typecheck` shows no references to removed symbols
- Search for `export *` yields only justified cases (ideally none)
- Public surface = core primitives + domain types

### Phase 4: Developer Experience (Planned)

Objective: Make tests and authoring smoother without changing behavior.

Deliverables / Checklist
1. Testing
  - [ ] Seedable `DiceEngine` for deterministic tests
  - [ ] Tiny factories for Character/Monster/Item (`__tests__/helpers`)
2. Command guards (optional)
  - [ ] `ensureEntitiesExist(ctx, ids)` and `ensureConscious(ctx, ids)` helpers

Exit Criteria
- Tests are easier to author and maintain with fewer fixtures and stubs

---
