# Phase 2: Behavior and Structure Normalization

Comprehensive task list to complete Phase 2.

## Architecture and Wiring (Chains)

- [ ] Make chains mandatory
  - [ ] ↳ Remove legacy builders and aliases
  - [ ] ↳ Use `buildRuleEngine` as the only entry point
- [ ] Ensure every command type has a registered chain under `osric/chains` by domain
  - [ ] ↳ Domains: combat, character, exploration, npc, spells, system
- [ ] Align `RuleContractValidator` with actual chains
  - [ ] ↳ Update contracts or chains to match (no adapters)
- [ ] Verify rule order and stop-on-failure semantics per command
  - [ ] ↳ Fix priorities if needed

## Commands (Thinness and Delegation)

- [ ] Ensure all commands validate/delegate and contain no mechanics
  - [ ] ↳ Validate params via co-located validators
  - [ ] ↳ Delegate execution to the `RuleEngine`
  - [ ] ↳ No dice, no direct HP mutation, no internal resolution
- [ ] Normalize temporary inputs into `ContextKeys` before delegation

## Rules (Single Responsibility, Naming, Layout)

- [ ] One file → one rule; split any multi-export files
- [ ] Use `RULE_NAMES` only; no ad-hoc strings
- [ ] Remove “adapter” rules by aligning real rule names to contract names
- [ ] Centralize shared helpers (dice done); add modifiers/util calcs if duplicated

## Context Keys and Flow

- [ ] Replace remaining raw string context keys with `ContextKeys`
- [ ] Standardize per-flow context shapes and usage
  - [ ] ↳ Combat: `COMBAT_ATTACK_CONTEXT`, `COMBAT_ATTACK_ROLL_RESULT`, `COMBAT_DAMAGE_RESULT`, `COMBAT_DAMAGE_APPLIED`
  - [ ] ↳ Aerial: all `COMBAT_AERIAL_*` keys
  - [ ] ↳ Two-weapon: `COMBAT_MAIN_HAND_WEAPON`, `COMBAT_OFF_HAND_WEAPON`
  - [ ] ↳ Character creation: `CHARACTER_CREATION_DATA`, `CHARACTER_CREATION_PARAMS`
  - [ ] ↳ Initiative: `COMBAT_INITIATIVE_CONTEXT`, `COMBAT_INITIATIVE_RESULTS`, `COMBAT_INITIATIVE_ORDER`
  - [ ] ↳ Exploration: movement/search/terrain/foraging parameter keys
- [ ] Ensure rules publish/consume context consistently; remove orphan keys

## Randomness and Dice

- [ ] Enforce `DiceEngine.roll(notation)` everywhere
  - [ ] ↳ No `rollD20`/`rollExpression`/percentile wrappers
  - [ ] ↳ No `Math.random`
- [ ] Remove deprecated dice wrappers if no longer referenced

## Combat Pipeline Polish

- [ ] Confirm ATTACK chain
  - [ ] ↳ `AttackRoll` → `DamageCalculation` (pure) → `ApplyDamage` (mutating) → `PostDamageStatus` → `MultipleAttack`
- [ ] Complete Grapple chain
  - [ ] ↳ Attack/compare/effect using `DiceEngine` + `ContextKeys`
- [ ] Complete Initiative chain
  - [ ] ↳ `InitiativeRoll` → `SurpriseCheck` → `InitiativeOrder` using `ContextKeys`

## Character Creation Pipeline

- [ ] CREATE_CHARACTER chain
  - [ ] ↳ `AbilityScoreGeneration` → `RacialAbilityAdjustment` → `ClassRequirement` → `CharacterInitialization`
- [ ] Ensure `CHARACTER_CREATION_DATA`/`CHARACTER_CREATION_PARAMS` usage across rules
- [ ] Remove creation-time mechanics from commands

## Spells Pipeline

- [ ] CAST_SPELL chain
  - [ ] ↳ Component check → Casting → Interruption → Effects (align names to contract; no adapters)
- [ ] MEMORIZE_SPELL chain
  - [ ] ↳ Memorization → Progression/slots update
- [ ] READ_SCROLL chain
  - [ ] ↳ Validate reading/usage → resolve success/failure → cast spell effect if applicable
- [ ] IDENTIFY_MAGIC_ITEM chain
  - [ ] ↳ Identification mechanics → result publishing; use `SPELL_MAGIC_ITEM_USER` when needed
- [ ] Ensure all spell rules use `DiceEngine.roll` and `ContextKeys`

## Exploration/Environment Pipelines

- [ ] MOVE chain
  - [ ] ↳ `MovementRates` → `Encumbrance` → `Movement` (consuming movement params)
- [ ] SEARCH chain wired and command normalized
- [ ] FALLING_DAMAGE chain is pure calculation; apply HP only when appropriate
- [ ] TERRAIN_NAVIGATION chain
  - [ ] ↳ Navigation → `SurvivalChecks` → publish outcomes
- [ ] WEATHER_CHECK chain
  - [ ] ↳ Weather effects/visibility; align with exploration visibility rules
- [ ] FORAGING chain
  - [ ] ↳ Foraging → `SurvivalChecks`; consume time/terrain inputs

## NPC/Treasure Pipelines

- [ ] REACTION_ROLL chain wired; ensure `DiceEngine` usage
- [ ] Treasure generation rules
  - [ ] ↳ Ensure `DiceEngine` and `ContextKeys`
  - [ ] ↳ Add a chain if a command exists (else defer to Phase 3 API pruning)

## System and Ongoing Effects

- [ ] ROUND_TICK chain
  - [ ] ↳ `BleedingTick` (−1 HP/round) and death at −10
  - [ ] ↳ Consider stabilization handling in a follow-up rule
- [ ] Ensure status effects are additive and consistent
  - [ ] ↳ Unconscious, Bleeding, Dead, Comatose

## Error Model

- [ ] Introduce `DomainError` (code/message/details) and adopt it
  - [ ] ↳ Commands: parameter/validation failures → `DomainError`
  - [ ] ↳ Rules: mechanics violations → `DomainError` where user-facing
  - [ ] ↳ RuleEngine boundary: normalize thrown errors to `DomainError`
- [ ] Replace ad-hoc errors; update callers to expect `DomainError`

## Cleanup and Consistency

- [ ] Remove deprecated aliases/APIs
  - [ ] ↳ `createEngine`, legacy registrars, wrappers
- [ ] Eliminate duplicate or embedded rule definitions
  - [ ] ↳ e.g., no duplicate `DamageCalculation`
- [ ] Normalize imports to `@osric/*`; remove legacy barrels if present
- [ ] Ensure file and class names match intent
  - [ ] ↳ Rule filename mirrors `RULE_NAMES` purpose

## Contracts and Validation

- [ ] Update `RuleContractValidator` for newly added/renamed rules
- [ ] Ensure each command’s `getRequiredRules` aligns with its chain
- [ ] Run a chain audit
  - [ ] ↳ No missing-required rules
  - [ ] ↳ No unused rules in chains

## Documentation and Guidance (Defer Until Stabilized)

- [ ] Dev Guide Phase 2 checklist updates when tasks complete
- [ ] No additional
