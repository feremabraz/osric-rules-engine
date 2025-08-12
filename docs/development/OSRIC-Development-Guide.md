## OSRIC Rules Engine — Architecture, Conventions, and Unified Roadmap

This document is the canonical reference for the repository’s structure, how to extend it safely, and what’s next. It focuses on the unified model (Option A) and only lists active or upcoming work; completed phases are summarized briefly.

Last updated: 2025-08-12 (Phases 5–6 complete; Phase 7–8 planning drafted)


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

The next work is strictly about internal clarity and consistency. No new gameplay feature scope (items expansion, loot generation, crafting, performance profiling, etc.) is part of these phases unless required to eliminate duplication or ambiguity.

### Phase 7: Pattern Unification & Single Responsibility Pass

Objective: Ensure every file/module has one purpose and that there is exactly one blessed pattern for each architectural concern (commands, validators, rules, context usage, IDs, error handling).

Key Goals:
- Identify and refactor any modules doing more than one thing (split or extract helpers).
- Eliminate divergent patterns for: command validation, rule registration, ID creation, result typing.
- Normalize naming conventions (e.g., `<Domain><Concept><Suffix>`). No mixed suffix styles.
- Co-locate all validators (already mostly done) and remove any lingering shared validator logic that is domain-specific.
- Centralize cross-domain constants into `osric/types/constants.ts` only when truly shared; otherwise keep domain-local.
- Remove dead or redundant helper functions / types uncovered during pass.

Deliverables / Checklist:
1. Inventory: Automated or manual list of patterns & outliers (added to this doc under an "Inconsistencies Report" subsection).
2. Validators: Confirm every command has exactly one validator file named `<CommandName>Validator.ts` with a consistent exported symbol.
3. Commands: Ensure uniform structure order: imports, types, validator import, class, validateParameters, execute.
4. Rules: Standardize rule file naming `<Domain><RuleName>Rule.ts` (or keep existing if already consistent) and ensure each exports exactly one rule class + rule name constant reference.
5. Context Keys: Add a small `ContextKeys` (type-only) map or literal union centralizing existing keys; eliminate ad-hoc strings.
6. Results: Ensure discriminated result types share a common `kind` field pattern; remove alternative naming (`type`, `resultType`, etc. if any exist).
7. Errors: Provide a single `DomainError` shape or enum-driven variant; remove duplicate error utility functions.
8. Duplicate Logic: Extract repeated dice / movement / modifier calculations into a single helper if they appear 2+ times.
9. Remove Legacy: Delete any commented or unused exports that survived prior phases.
10. Update Docs: This guide gains an "Unified Patterns" section enumerating the final canonical shapes.

Exit Criteria:
- No TODO comments referencing “unify later” remain in touched areas.
- Grep for alternative patterns (e.g. `resultType:`) yields zero matches once normalized.
- Tests, typecheck, lint all green.

### Phase 8: Public Surface Pruning (Code-Only)

Objective: Strip exports to the smallest coherent set. Rely on TypeScript types and inline JSDoc for discoverability—no separate docs, tables, or changelog generation.

Scope (code actions only):
- Inline review of each top-level exported symbol; remove or rename in-place.
- Collapse duplicate type aliases (keep the most descriptive name).
- Delete shim / transitional barrels; favor direct module imports.
- Ensure validators stay unexported from public type barrels.
- Remove dead constants or re-export chains that point to a single symbol.
- Add minimal JSDoc only where a type’s intent is not obvious from its name.

Minimal Checklist:
1. Grep for `export \*` barrels and replace with explicit exports or internalize.
2. Grep for duplicate alias patterns (e.g. `type X = Y`) and eliminate redundant layer if X adds no semantic value.
3. Remove unused exports (verified by TypeScript errors after deletion).
4. Ensure no command or validator is exported through `@osric/types` (commands are consumed internally; external API remains types + core engine primitives only).
5. Confirm tree-shaking friendliness: no side-effect code at module top-level beyond constant declarations.

Exit Criteria:
- Running `pnpm typecheck` after removals yields zero references to removed symbols.
- Searching for `export *` in repo returns only intentionally retained cases (ideally zero or a justified small set).
- Public surface = core primitives + domain types; nothing else.

### Phase 9 (Optional Cleanup — Only If Gaps Remain)

Only executed if Phase 7/8 leave residual inconsistencies:
- Final micro-splits of any remaining multi-purpose files.
- Consolidate error handling if still fragmented.
- Optional codemod(s) for future large-scale refactors.

---

## Inconsistencies Report (Populate During Phase 7)

Use this section as a living scratchpad. Keep only active discrepancies; remove rows once fixed.

| Category | Instance | Issue | Planned Fix | Done? |
|----------|----------|-------|------------|-------|
| Command | AttackCommand | Raw rule name strings | Switched to RULE_NAMES | Done |
| Command | CreateCharacterCommand | Legacy getValidationRules method | Removed method | Done |
| Core | * | OSRICError complex system unused | Removed exports & file | Done |
| Context | Multiple rules | Ad-hoc temp keys (wildMagicSurge, etc.) | Introduce ContextKeys + rename (pending) | Pending |
| Command | AttackCommand | Domain validation logic inside command | Move to rule or guard pattern | Pending |
| Results | BaseCommand / Rule | Dual success + kind fields | Removed success field; unified on 'kind' | Done |
| Rules | Various | dataKind inconsistently used | Removed dataKind; rely on 'kind' + domain data | Done |

---

## Unified Patterns (Finalize End of Phase 7)

Command skeleton:
```ts
// imports
import { RULE_NAMES } from '@osric/types/rules';
import { validateAttack } from './validators/AttackCommandValidator';

export class AttackCommand extends BaseCommand<AttackParams, AttackResult> {
  readonly type = COMMAND_TYPES.ATTACK;
  validateParameters() { return validateAttack(this.params); }
  getRequiredRules() { return [RULE_NAMES.ATTACK_SEQUENCE]; }
  execute(ctx: GameContext) { /* set context keys, no mechanics */ }
}
```

Validator skeleton:
```ts
import { validateObject, rules } from '@osric/core/ValidationPrimitives';
export function validateAttack(p: AttackParams) {
  return validateObject(p, {
    attackerId: [rules.required('attackerId')],
    targetId: [rules.required('targetId')],
    weaponId: [rules.required('weaponId')],
  });
}
```

Rule skeleton:
```ts
export class AttackRollRule extends BaseRule<AttackCommand> {
  name = RULE_NAMES.ATTACK_ROLL;
  apply(ctx, command) { /* pure mechanics, returns result fragment */ }
}
```

Result type pattern:
```ts
export type AttackResult =
  | { kind: 'attack:hit'; damage: number }
  | { kind: 'attack:miss'; reason: 'AC' | 'FUMBLE' };
```

Error pattern:
```ts
export interface DomainError { code: string; message: string; details?: unknown }
```

No alternative field names (`resultType`, `status`) are allowed; always use `kind` for discriminants.

---

