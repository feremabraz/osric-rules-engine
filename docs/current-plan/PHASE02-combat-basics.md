# Phase 02 – Combat Basics

Goal: Introduce core combat calculations (initiative scaffolding, attack roll, damage application, post-damage status) consistent with design and leveraging revised Phase 01 character schema (now includes ability scores, baseAttack placeholder, inventory/equipment scaffolding). Maintain metric conversions (reach distances, movement speeds in meters).

Order Strictness: Each item builds on prior items' types & data stored in entities/store.

## Item 1: Initiative Framework (Scaffold Only)
Purpose: Prepare initiative value calculation for later full turn sequencing.
Dependencies: Phase 01 (DEX ability score for modifiers, movement speed field (placeholder may be 0 until Phase 01 Item 5 completes), equipment weight from inventory items).
Specification:
- Add `initiative` field to `ExecutionContext` ephemeral data when resolving combat-related commands.
- Utility `computeInitiativeBase(character)`: uses DEX modifier + armor penalty (armor meta adds `initiativePenalty` integer) + encumbrance penalty (placeholder 0 for now) producing integer base; persists to `stats.initiative.base`.
- Store per-character `stats.initiative.base` during character creation (already placeholder). Add recalculation function if equipment changes.
Acceptance: Changing armor triggers recalculation to new value.

## Item 2: Attack Roll Command Framework
Purpose: Implement `attackRoll` command producing structured result (hit/miss, attack total, target AC snapshot).
Dependencies: Item 1; character base attack values from Phase 01.
Specification:
- New command source file `attackRoll.ts` with params schema: `{ attacker: CharacterId; target: CharacterId; weaponId?: ItemId }`.
- Rules (ordered):
  1. Validate entities exist & attacker equipped weapon resolution (fallback to unarmed weapon meta with `damage:d2`).
  2. Compute attack modifiers: base attack (from class progression), STR or DEX modifier (finesse weapons flagged `finesse: true`), situational placeholders (0), weapon bonus.
  3. Roll d20 via RNG + modifiers => `attackTotal`.
  4. Snapshot target Armor Class: base 10 - armor `armorClassBase` adjustments (store AC as ascending is harder to hit or remain descending? Choose ascending modern style: AC = 10 + armorBonus + shield + dexMod). Convert OSRIC THAC0 concept internally into ascending result for consistency; note that Phase retains compatibility shim if needed.
  5. Determine hit: `attackTotal >= targetAC` => success.
- Result Data (on success): `{ attackTotal, targetAC, weapon:{ key, damage }, hit:true }`; on miss: `{ attackTotal, targetAC, hit:false }`.
Acceptance: Deterministic given seed.
Edge: Critical hits deferred (Phase 04). Natural 1/20 still flagged via `natural` field for future rules.

## Item 3: Damage Calculation Command
Purpose: Separate command `dealDamage` applying weapon damage to a target (allows alternate damage sources later).
Dependencies: Item 2; character HP in store.
Specification:
- Params: `{ source: CharacterId; target: CharacterId; weaponId?: ItemId; attackContext?: { natural:number; hit:boolean } }`.
- Rules:
  1. Validate source/target existence and HP>0.
  2. Resolve weapon damage dice & STR mod for melee.
  3. Roll damage dice, add modifiers; min 1.
  4. Apply damage in deferred commit: subtract HP; if HP <=0 set status: `dead` else if HP <= (maxHP*0.25) set `wounded:true`.
  5. Produce result: `{ damage, targetRemainingHp, targetStatus }`.
- Metric: Damage is unitless (abstract). Time to apply is within same round.
Acceptance: HP never negative (floor at 0).

## Item 4: Post-Damage Status & Effects Integration
Purpose: Standardize post-damage effect emission for future morale or conditions.
Dependencies: Item 3.
Specification:
- Extend effects types with `damageApplied` event: `{ target: CharacterId; amount:number; remaining:number; status: 'alive'|'dead' }`.
- Emitted during commit phase of `dealDamage`.
- Consumers (none yet) can subscribe; placeholder test ensures emission.
Acceptance: After killing blow event has status `dead`.

## Item 5: Combat Snapshot Utility
Purpose: Provide a single function to derive all basic combat-relevant fields for UI/logging.
Dependencies: Items 1–4.
Specification:
- `getCombatSnapshot(characterId)` returns `{ hp:{ current,max }, attack:{ base, strMod, dexMod }, ac, initiativeBase, movementMps, encumbranceKg }`.
- Uses existing stored or derivable data; no new rolls.
Acceptance: Snapshot values stable across consecutive calls without state change.

## Item 6: Integration Tests
Purpose: Validate cross-command coherence.
Dependencies: All prior Items.
Specification:
- Test flow: create two characters (warrior vs cleric) with fixed seeds; perform attackRoll then if hit call dealDamage; assert HP decreased consistently and events emitted.
- Edge test: attack miss does not allow unconditional damage application unless forced parameter (future) – attempt calling `dealDamage` with `attackContext.hit=false` returns failure code `ATTACK_NOT_HIT`.

## Out-of-Scope (Deferred)
- Multiple attacks / iterative attacks.
- Area damage, spells.
- Critical hit multipliers.
- Morale checks.
