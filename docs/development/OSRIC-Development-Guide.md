## OSRIC Rules Engine — Architecture, Conventions, and Unified Roadmap

This document is the canonical reference for the repository’s structure, how to extend it safely, and what’s next. It focuses on the unified model (Option A) and only lists active or upcoming work; completed phases are summarized briefly.

Last updated: 2025-08-11 (Phase 4 in progress)


## Project overview

- Language: TypeScript (TS 5)
- Test runner: Vitest (type-checking enabled)
- Lint/format: Biome
- Package manager: pnpm
- Source layout:
  - `osric/core`: engine primitives (Command, Rule, RuleChain, RuleEngine, Dice, Grid/Movement, ValidationEngine, GameContext)
  - `osric/types`: canonical public types and constants (COMMAND_TYPES, RULE_NAMES, entities, rules metadata)
  - `osric/entities`: thin OO wrappers/factories around typed entities
  - `osric/commands`: strongly-typed command classes (user intents)
  - `osric/rules`: rules that implement mechanics executed via RuleChain/RuleEngine
  - `__tests__`: unit tests


## How the engine fits together (quick refresher)

- Commands
  - Represent user intent. Implement `BaseCommand` with `type` and parameters. Keep mechanics out; delegate to rules via RuleEngine.

- Rules
  - Implement mechanics. Must implement `BaseRule.apply(context, command)` and `canApply()`. Scheduled into `RuleChain`s and ordered by `priority` and/or prerequisites.

- RuleChain / RuleEngine
  - RuleChain is an ordered list of rules with policies (stop on failure, merge results, clear temp data). RuleEngine maps command types to chains and executes them.

- GameContext
  - Jotai-backed state for entities and a temporary scratchpad. Commands set structured data; rules consume and can publish intermediate results.

- Types and Entities
  - `osric/types/*` defines public shapes and constants; single source of truth. `osric/entities/*` wraps those shapes with helpers and factories.


## Development conventions

- Imports and aliases
  - Prefer `@osric/*` namespaces. Avoid introducing new top-level aliases without a clear need.

- Rule naming and implementation
  - Rule names come from `RULE_NAMES` (no ad-hoc strings). All rules implement `apply(context, command)` and can report prerequisites.

- Commands
  - `getRequiredRules()` should return `RULE_NAMES` values. Validate parameters (ValidationEngine or explicit checks). `execute` should set context and delegate to the engine.

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
  - `osric/core/ValidationEngine.ts`, `osric/core/Dice.ts`, `osric/core/GameContext.ts`
  - `osric/core/GridSystem.ts`, `osric/core/MovementCalculator.ts`

- Types/constants
  - `osric/types/constants.ts`, `osric/types/entities.ts`, `osric/types/rules.ts`, `osric/types/errors.ts`

- Entities
  - `osric/entities/*` — helpers/factories that stay in sync with types

- Commands
  - `osric/commands/*` — prepare context for rules

- Rules

---

## Upcoming Phases & Improvements

### Phase 5: Types and Structure Refactor

- **Split monolithic files:** Break up `osric/types/entities.ts` into domain-specific files (e.g., `character.ts`, `monster.ts`, `item.ts`, `spell.ts`, `shared.ts`).
- **Consistent file naming:** Rename `SpellTypes.ts` to `spell-types.ts` for consistency; use kebab-case for all type files.
- **Separation of concerns:** Move branded ID types and helpers to a single file (`id-utils.ts`).
- **Non-mixing:** Ensure utility functions are not mixed with type definitions; keep helpers/utilities in their own files.
- **Consistent export style:** Use named exports everywhere; avoid default exports and mixed export styles.
- **Domain-driven organization:** Ensure each file covers a single domain or concern.

### Phase 6: Validation Architecture

- **Centralized contract validation:** Move all contract validation logic to a dedicated file (e.g., `validation.ts` in `core/` or `types/`).
- **Validator interface:** Define and adopt a `Validator` interface for reusable validation logic across rules and commands.
- **Unified ValidationResult:** Use a single `ValidationResult` type everywhere; remove ad-hoc validation result shapes.
- **Shared validation helpers:** Ensure all rules and commands use shared validation helpers, not custom logic.
- **Document validation flow:** Clearly document validation phases (pre-validation, main execution, post-processing).


### Phase 7: Additional Separation of Concerns and Domain-Driven Refactors

- Further split and reorganize code to ensure every module/file has a single responsibility and clear domain boundaries.
- Refactor any remaining cross-domain logic into dedicated modules.
- Review and update folder structure to match domain-driven design principles.

### Phase 8: Enhanced Error Handling and Diagnostics

- Standardize error handling across all layers (core, rules, commands, entities).
- Expand and unify error types, error factories, and error reporting.
- Improve diagnostics and error context for debugging and user feedback.
- Add structured logging and tracing for rule/command execution.

### Phase 9: API Surface Review and Simplification

- Audit all public APIs (types, classes, functions) for clarity and minimalism.
- Remove legacy or redundant APIs, types, and exports.
- Simplify and document the canonical API surface for engine extension and integration.
- Ensure all exports are intentional and domain-appropriate.

### Phase 10+: More robust test coverage and property-based testing (and future improvements)

- TBD
