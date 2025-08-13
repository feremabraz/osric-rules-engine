# Phase 2: Behavior and Structure Normalization

Comprehensive task list to complete Phase 2.

## Architecture and Wiring (Chains)

- [ ] Make chains mandatory
  - [ ] ↳ Remove legacy builders and aliases
  - [ ] ↳ Use `buildRuleEngine` as the only entry point
- [x] Ensure every command type has a registered chain under `osric/chains` by domain
  - [x] ↳ Domains: combat, character, exploration, npc, spells, system
- [x] Align `RuleContractValidator` with actual chains
  - [x] ↳ Update contracts or chains to match (no adapters)
- [x] Verify rule order and stop-on-failure semantics per command
  - [x] ↳ Fix priorities if needed

## Commands (Thinness and Delegation)

- [ ] Ensure all commands validate/delegate and contain no mechanics
  - [ ] ↳ Validate params via co-located validators
  - [ ] ↳ Delegate execution to the `RuleEngine`
  - [ ] ↳ No dice, no direct HP mutation, no internal resolution
- [ ] Normalize temporary inputs into `ContextKeys` before delegation
  - [x] ↳ MoveCommand normalized to `EXPLORATION_MOVEMENT_REQUEST_PARAMS`
  - [x] ↳ SearchCommand normalized to `EXPLORATION_SEARCH_REQUEST_PARAMS` (+ context)

## Rules (Single Responsibility, Naming, Layout)

- [x] One file → one rule; split any multi-export files
  - [x] ↳ Split UnderwaterCombatRules: movement rule extracted to `UnderwaterMovementRules.ts`
  - [x] ↳ Split AdvancedSpellRules into dedicated files (`SpellComponentManagementRules.ts`, `SpellFailureRules.ts`, `SpellConcentrationRules.ts`, `SpellInteractionRules.ts`, `AdvancedSpellResearchRules.ts`)
  - [x] ↳ Split MagicItemRules into dedicated files (`MagicItemChargeCalculationRules.ts`, `MagicItemChargeUsageRules.ts`, `MagicItemSavingThrowRules.ts`, `MagicItemIdentificationRules.ts`)
  - [x] ↳ Split ScrollCreationRules into dedicated files (`ScrollCreationRequirementsRules.ts`, `ScrollCreationStartRules.ts`, `ScrollCreationProgressRules.ts`, `ScrollUsageValidationRules.ts`, `ScrollCastingFailureRules.ts`, `ScrollSpellCastingRules.ts`)
  - [x] ↳ Split SpellResearchRules into dedicated files (`SpellResearchRequirementsRules.ts`, `SpellResearchStartRules.ts`, `SpellResearchProgressRules.ts`, `SpellResearchSuccessRules.ts`, `SpellLearningRules.ts`)
  - [x] ↳ Split GrapplingRules into `GrappleAttackRules.ts`, `StrengthComparisonRules.ts`, `GrappleEffectRules.ts`
  - [x] ↳ Split MountedCombatRules into `MountedChargeRules.ts`, `MountedCombatCoreRules.ts`, `DismountRules.ts`, `MountedCombatEligibilityRules.ts`; keep shared types in `MountedCombatRules.ts`
  - [x] ↳ Trim AerialCombatRules to single class and move shared/util rules to `AerialCombatShared.ts`; add `AerialMovementRules.ts` and `DiveAttackRules.ts`
- [x] Use `RULE_NAMES` only; no ad-hoc strings
- [x] Remove “adapter” rules by aligning real rule names to contract names
- [ ] Centralize shared helpers (dice done); add modifiers/util calcs if duplicated

## Context Keys and Flow

- [x] Replace remaining raw string context keys with `ContextKeys`
- [ ] Standardize per-flow context shapes and usage
  - [ ] ↳ Combat: `COMBAT_ATTACK_CONTEXT`, `COMBAT_ATTACK_ROLL_RESULT`, `COMBAT_DAMAGE_RESULT`, `COMBAT_DAMAGE_APPLIED`
  - [ ] ↳ Aerial: all `COMBAT_AERIAL_*` keys
  - [ ] ↳ Two-weapon: `COMBAT_MAIN_HAND_WEAPON`, `COMBAT_OFF_HAND_WEAPON`
  - [ ] ↳ Character creation: `CHARACTER_CREATION_DATA`, `CHARACTER_CREATION_PARAMS`
  - [ ] ↳ Initiative: `COMBAT_INITIATIVE_CONTEXT`, `COMBAT_INITIATIVE_RESULTS`, `COMBAT_INITIATIVE_ORDER`
  - [x] ↳ Exploration: movement/search parameter keys standardized
- [ ] Ensure rules publish/consume context consistently; remove orphan keys

## Randomness and Dice

- [ ] Enforce `DiceEngine.roll(notation)` everywhere
  - [x] ↳ No `rollD20`/`rollExpression`/percentile wrappers
  - [x] ↳ No `Math.random`
- [x] Remove deprecated dice wrappers if no longer referenced

## Combat Pipeline Polish

- [x] Confirm ATTACK chain
  - [x] ↳ `AttackRoll` → `DamageCalculation` (pure) → `ApplyDamage` (mutating) → `PostDamageStatus` → `MultipleAttack`
- [x] Complete Grapple chain
  - [x] ↳ Attack/compare/effect using `DiceEngine` + `ContextKeys`
- [x] Complete Initiative chain
  - [x] ↳ `InitiativeRoll` → `SurpriseCheck` → `InitiativeOrder` using `ContextKeys`

## Character Creation Pipeline

- [x] CREATE_CHARACTER chain
  - [x] ↳ `AbilityScoreGeneration` → `RacialAbilityAdjustment` → `ClassRequirement` → `CharacterInitialization`
- [ ] Ensure `CHARACTER_CREATION_DATA`/`CHARACTER_CREATION_PARAMS` usage across rules
- [ ] Remove creation-time mechanics from commands

## Spells Pipeline

- [x] CAST_SPELL chain
  - [x] ↳ Component check → Casting → Interruption → Effects (align names to contract; no adapters)
- [x] MEMORIZE_SPELL chain
  - [x] ↳ Memorization → Progression/slots update
- [x] READ_SCROLL chain
  - [x] ↳ Validate reading/usage → resolve success/failure → cast spell effect if applicable (imports updated to dedicated scroll rule files)
- [x] IDENTIFY_MAGIC_ITEM chain
  - [x] ↳ Identification mechanics → result publishing; use `SPELL_MAGIC_ITEM_USER` when needed (imports updated to dedicated identification rule file)
- [ ] Ensure all spell rules use `DiceEngine.roll` and `ContextKeys`

## Exploration/Environment Pipelines

- [x] MOVE chain
  - [x] ↳ `MovementRates` → `Encumbrance` → `Movement` (consuming movement params)
- [x] SEARCH chain wired and command normalized
- [x] FALLING_DAMAGE chain is pure calculation; apply HP only when appropriate
- [x] TERRAIN_NAVIGATION chain
  - [x] ↳ Navigation → `SurvivalChecks` → publish outcomes
- [x] WEATHER_CHECK chain
  - [x] ↳ Weather effects/visibility; align with exploration visibility rules
- [x] FORAGING chain
  - [x] ↳ Foraging → `SurvivalChecks`; consume time/terrain inputs

## NPC/Treasure Pipelines

- [x] REACTION_ROLL chain wired; ensure `DiceEngine` usage
- [ ] Treasure generation rules
  - [ ] ↳ Ensure `DiceEngine` and `ContextKeys`
  - [ ] ↳ Add a chain if a command exists (else defer to Phase 3 API pruning)

## System and Ongoing Effects

- [ ] ROUND_TICK chain
  - [ ] ↳ `BleedingTick` (−1 HP/round) and death at −10
  - [ ] ↳ Consider stabilization handling in a follow-up rule
- [ ] Ensure status effects are additive and consistent
  - [ ] ↳ Unconscious, Bleeding, Dead, Comatose

## Cleanup and Consistency

- [ ] Remove deprecated aliases/APIs
  - [ ] ↳ `createEngine`, legacy registrars, wrappers
- [ ] Eliminate duplicate or embedded rule definitions
  - [ ] ↳ e.g., no duplicate `DamageCalculation`
- [ ] Normalize imports to `@osric/*`; remove legacy barrels if present
- [ ] Ensure file and class names match intent
  - [ ] ↳ Rule filename mirrors `RULE_NAMES` purpose

## Additional wiring done

- [x] Registered `UNDERWATER_MOVE` chain (`buildUnderwaterMoveChain`) with `UnderwaterMovementRules`

## Contracts and Validation

- [x] Update `RuleContractValidator` for newly added/renamed rules
- [ ] Ensure each command’s `getRequiredRules` aligns with its chain
- [ ] Run a chain audit
  - [ ] ↳ No missing-required rules
  - [ ] ↳ No unused rules in chains

## Error Model

- [ ] Introduce `DomainError` (code/message/details) and adopt it
  - [ ] ↳ Commands: parameter/validation failures → `DomainError`
  - [ ] ↳ Rules: mechanics violations → `DomainError` where user-facing
  - [ ] ↳ RuleEngine boundary: normalize thrown errors to `DomainError`
- [ ] Replace ad-hoc errors; update callers to expect `DomainError`
