## OSRIC Rules Engine — Architecture, Conventions, and Unified Roadmap

This document is the canonical reference for the repository’s structure, how to extend it safely, and what’s next. It focuses on the unified model (Option A) and only lists active or upcoming work; completed phases are summarized briefly.

Last updated: 2025-08-12 (Phases 5–6 complete)


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
  - Runtime contract: Each command must validate its parameters using its specific validator in `validateParameters()` before `execute` runs (validators are imported from `@osric/types`).

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
  - `getRequiredRules()` should return `RULE_NAMES` values. Validate parameters using the command’s specific validator (from `@osric/types`) inside `validateParameters()`; avoid ad-hoc checks. `execute` should set context and delegate to the engine.

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


### Branded IDs usage examples

- Constructing IDs
  - `const charId = createCharacterId('char-001')`
  - `if (isCharacterId(maybeId)) { /* safe as CharacterId */ }`
- Using with GameContext
  - `context.setEntity(charId, character)`
  - `const exists = context.hasEntity(charId)`
  - `const got = context.getEntity(charId)`


## Quality gates

- Build/type: `pnpm typecheck`
- Unit tests: `pnpm test`
- Lint/format: `pnpm lint`
- All-in-one: `pnpm check`

Only merge when all gates pass. Keep a minimal smoke path (command → chain → rules) healthy after each change.


## Appendix — File map highlights

- Core engine
  - `osric/core/Command.ts`, `osric/core/Rule.ts`, `osric/core/RuleChain.ts`, `osric/core/RuleEngine.ts`
  - `osric/core/ValidationPrimitives.ts`, `osric/core/Dice.ts`, `osric/core/GameContext.ts`
  - `osric/core/GridSystem.ts`, `osric/core/MovementCalculator.ts`

- Types/constants
  - `osric/types/constants.ts`, `osric/types/character.ts`, `osric/types/monster.ts`, `osric/types/item.ts`, `osric/types/spell.ts`, `osric/types/shared.ts`, `osric/types/rules.ts`, `osric/types/errors.ts`

- Entities
  - `osric/entities/*` — helpers/factories that stay in sync with types

- Commands
  - `osric/commands/*` — prepare context for rules

- Rules

---

## Upcoming Phases & Improvements

### Phase 7: Additional Separation of Concerns and Domain-Driven Refactors

- Further split and reorganize code to ensure every module/file has a single responsibility and clear domain boundaries.
- Refactor any remaining cross-domain logic into dedicated modules.
- Review and update folder structure to match domain-driven design principles.

### Phase 8: API Surface Review and Simplification

- Audit all public APIs (types, classes, functions) for clarity and minimalism.
- Remove legacy or redundant APIs, shims, types, and exports.
- Simplify and document (JSDoc) the canonical API surface for engine extension and integration.
- Ensure all exports are intentional and domain-appropriate.

### Phase 9+: TBD

- Standardize error handling across all layers (core, rules, commands, entities).
- Expand and unify error types, error factories, and error reporting.
- Improve diagnostics and error context for debugging and user feedback.
- Add structured logging and tracing for rule/command execution.
- TBD
