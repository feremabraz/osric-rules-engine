# Phase 01 – Character Foundation (Revised)

Goal: Expand minimal current character implementation into full specification: deterministic ability score generation, racial/class constraints, secondary stats, inventory & equipment scaffolding, and validated insertion. Breaking changes allowed (no backward compatibility). All units internal metric (meters, kilograms).

Current Baseline (repo state):
- Character meta: race (`key`, partial `abilityMods { str,dex }`, `size`), class (`key`, `hitDie`, `primaryAbilities`).
- `prepare()` sets: `name, race, class, level=1, hp=maxHitDie, xp=0` only.
- No ability scores, saves, base attack, initiative, movement, inventory, encumbrance.
- `createCharacter` command only `Prepare` + `Persist` rules.

High-Level Breaking Additions This Phase:
1. Add full six ability scores & rolling service.
2. Replace static HP with rolled hit die + CON modifier pipeline.
3. Extend race & class meta (full ability modifiers, restrictions, progression scaffolds placeholders).
4. Introduce derived combat/movement placeholders (initiative base, movement speed, base attack, base saves).
5. Introduce inventory/equipment & encumbrance scaffolding.
6. Expand `createCharacter` into multi-rule sequence; result shape changes.

Implementation Order (strict). Item 0 introduces schema refactor prerequisites.

## Item 0: Character Schema Refactor
Purpose: Introduce structural fields for subsequent items.
Breaking Changes:
- Extend `CharacterDraft` with new fields:
  - `ability: { str; dex; con; int; wis; cha }`
  - `stats: { initiative: { base:number }; movement: { speedMps:number }; baseAttack:number; saves: { death; wands; petrification; breath; spells } }` (initial zeros / placeholders)
  - `inventory: ItemId[]` & `equipped: { weapon?: ItemId; armor?: ItemId }`
  - `encumbrance: { totalWeightKg:number }`
- Remove direct HP assignment from `prepare()` (set temporary placeholder; real value computed later rules).
- Update validation schema accordingly (old stored entities invalid — acceptable).
Acceptance: `prepare()` returns structurally valid draft with placeholders; tests updated.

## Item 1: Ability Score Generation Service
Purpose: Provide deterministic ability score arrays for new characters using RNG adapter with reproducible seeds.
Dependencies: Existing RNG (`rng/`), `storeFacade`, `entities/character` schemas.
Specification:
- Add `AbilityScoreMethod` enum: `STANDARD_3D6`, `FOCUSED_4D6_DROP_LOWEST`, `HEROIC_2D6_PLUS_6`.
- Implement `rollAbilityScores(method, rng) -> { str,dex,con,int,wis,cha }`.
- Use metric neutrality (no unit conversions needed – numeric scores).
- Determinism: Sequence of RNG calls must be isolated; wrap in helper that logs rolls for potential replay (optional future feature).
- Validation: Ensure each stat within 3..18 (or 8..18 for HEROIC) else throw `ENGINE_INVARIANT`.
Data Structures:
```ts
interface AbilityScores { str:number; dex:number; con:number; int:number; wis:number; cha:number; }
```
Acceptance (Happy Path): Calling with seed S and method M yields same scores across runs.
Edge Cases: Invalid method (compile-time via enum), RNG exhaustion (not applicable), negative results (guard).

## Item 2: Racial Ability Adjustments
Purpose: Apply race-based modifiers to raw rolled scores.
Dependencies: Item 1, race metadata in `entities/character` (extend with `abilityMods`).
Specification:
- Extend race meta objects (e.g., `human`, `dwarf`, `elf`) with `abilityMods` map; zero for unaffected.
- Function `applyRacialAdjustments(base:AbilityScores, race:RaceMeta) -> AbilityScores` returning new frozen object.
- Validate post-adjustment bounds (3..18 unless OSRIC-specific racial max extends; if later expansions needed list TBD).
- Immutable: Do not mutate input objects.
Acceptance: Dwarf with +1 CON, -1 CHA reflects adjustments.
Failure: If adjustment pushes score <3 or >18 -> creation failure `RACIAL_ADJUSTMENT_RANGE`.

## Item 3: Racial Restrictions Enforcement
Purpose: Enforce race-based prohibited classes or minimum/maximum ability thresholds.
Dependencies: Item 2; class meta definitions (extend if missing) with requirement descriptors.
Specification:
- Race meta: add `allowedClasses?: string[]` (omit => all).
- Class meta: add `prerequisites?: { ability: keyof AbilityScores; min?: number; max?: number }[]`.
- Function `validateRaceClassChoice(race, klass, scores)` returning void or throwing `CLASS_RESTRICTION` / `ABILITY_REQUIREMENT` (error codes already container or add new ones).
Acceptance: Choosing disallowed class -> failure before Item 5 assembly.
Edge: Multiple failing prereqs aggregate messages.

## Item 4: Class Requirements & Derived Base Values
Purpose: Confirm ability / alignment prerequisites and compute initial class-derived values (hit die, base saves, attack progression row 0).
Dependencies: Item 3.
Specification:
- Class meta extended with: `hitDie: 'd4'|'d6'|'d8'|'d10'`, `baseAttackAtLevel: number[]`, `baseSaves: { death:number; wands:number; petrification:number; breath:number; spells:number }[]` (index 0 => level 1).
- Function `deriveClassBase(klass, level=1)` returns initial pack `{ hitPointsRoll: number; baseAttack: number; saves: SaveBlock }`.
- HP roll uses RNG with distribution determined by hitDie (min 1). Apply CON modifier later (Item 5) not here to keep layering explicit.
Acceptance: Level 1 warrior (d10) roll between 1..10.
Edge: Arrays must contain at least index 0 else startup validation error.

## Item 5: Character Initialization Assembly
Purpose: Combine previous outputs into a `CharacterDraft` matching existing entity schema; compute secondary stats; ensure invariants.
Dependencies: Items 1–4; existing `createCharacter` command skeleton.
Specification:
- Extend `createCharacter` command pipeline rules (or add new rules) in order:
  1. Roll ability scores (unless provided override in params `method` or direct `scores`).
  2. Apply racial adjustments.
  3. Validate race/class restrictions & requirements.
  4. Derive class base values + roll HP.
  5. Apply CON modifier to HP (min 1 HP at level 1 after modifier).
  6. Compute initiative base (DEX modifier placeholder; full initiative system deferred to Phase 03) store as `stats.initiative.base`.
  7. Compute movement speed: Race meta supplies base speed in meters/round (store in `movement.speedMps`). Convert any legacy feet (e.g., 30 ft) to meters immediately (30 ft -> 9.144 m) rounding to two decimals but keeping internal exact float.
- Output draft frozen object; ID assigned only when persisted via `store.setEntity`.
Validation: All required fields populated; HP >=1; movement speed >0.

## Item 6: Starting Equipment Allocation
Purpose: Assign default starting gear impacting later combat calculations (Phase 04) while keeping abstractions simple.
Dependencies: Item 5; existing `item` entity definitions.
Specification:
- Define minimal weapon & armor catalogs (sword, dagger, mace, leather, chain) in `entities/item` with fields: `key`, `type: 'weapon'|'armor'`, `weightKg`, `damage: { dice:'d6'; bonus:number }`, `armorClassBase` (for armor), `weaponVsArmor?: Record<string, number>` placeholder for Phase 04.
- Extend character draft with `inventory: ItemId[]`, `equipped: { weapon?: ItemId; armor?: ItemId }`.
- Starting set chosen via class table mapping (e.g., warrior => sword+chain; cleric => mace+chain; wizard => dagger+none). Implement function `assignStartingEquipment(draft, klass)` returning updated draft.
- Weight tracking: Add `encumbrance.totalWeightKg` sum of item weights; leave thresholds TBD future.
Acceptance: Warrior inventory has two item IDs, equipped references them, weights sum correctly.

## Item 7: Final Validation & Store Insertion Path
Purpose: Ensure pipeline integrities before first external usage.
Dependencies: Items 1–6.
Specification:
- Add a final rule in `createCharacter` that validates: all previous computed fields present, ability scores within range, class & race coherence, inventory consistency (equipped IDs in inventory), no duplicate item IDs.
- On success, command returns `{ characterId, summary }` where summary includes `scores`, `hp`, `movement.speedMps`, `encumbrance.totalWeightKg` (metric emphasis).
- On failure, returns structured errors per earlier rules.
Acceptance: New character creation returns deterministic reproducible summary given fixed seed & method.

## Metric System Policy (Applies to All Items)
- Internal canonical units: meters (m), kilograms (kg), rounds (6s or OSRIC standard 1 minute? Choose constant `ROUND_SECONDS = 60` if OSRIC uses 1-minute rounds; clarify before Phase 03), seconds for time, joules not required.
- Immediate conversion of any legacy feet/yards constants using exact factors (1 ft=0.3048 m, 1 yd=0.9144 m). Store both original (for display) only if necessary; otherwise derive on demand.

## Acceptance Test Sketches
- Deterministic ability scores snapshot test with seed.
- Character creation full pipeline returns expected structure.
- Racial restriction failure path.
- Starting equipment weight calculation.

## Out-of-Scope (Deferred to Later Phases)
- Initiative full ordering logic.
- Weapon vs Armor adjustments.
- Post-damage status effects.
- Level advancement beyond level 1.
