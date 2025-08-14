# Phase 04 – Advanced Combat & Progression

Goal: Introduce deeper combat fidelity (weapon vs armor, criticals, fully specified morale system) and basic level progression including experience gain integration.

## Item 1: Weapon vs Armor Table Integration
Purpose: Apply per-weapon adjustments against target armor type.
Dependencies: Phase 02 item catalogs; character armor data.
Specification:
- Extend armor items with `armorTypeKey` (e.g., 'cloth','leather','chain','plate','shield').
- Extend weapon items with `weaponVsArmor?: Record<string, number>`.
- Modify attackRoll rule computing `attackTotal` by adding adjustment if mapping present.
- Result extend with field `armorAdjustmentApplied` (number).
Acceptance: Weapon with +2 vs chain increments total.

## Item 2: Critical Hits & Fumbles
Purpose: Introduce natural roll interpretation.
Dependencies: Attack roll command natural value placeholder.
Specification:
- Natural 20: auto-hit, flag `critical:true` attach `criticalMultiplier` (default 2) – damage command reads this context to double dice result (before STR mod).
- Natural 1: auto-miss, flag `fumble:true` (no extra effects yet).
- Update dealDamage to accept `attackContext.critical`.
Acceptance: Critical doubles dice only (not modifiers).

## Item 3: Experience Gain & Level Progression
Purpose: Implement basic XP thresholds and level-up effects (HP, base attack, saves).
Dependencies: Character class meta with progression arrays; existing `gainExperience` command (currently simple XP increment + eligibility flag) will be expanded (breaking change to its result shape and rule list) to handle actual level ups.
Specification:

## Item 4: Morale System (Full Implementation)
Purpose: Determine if NPCs / monsters continue fighting or attempt to disengage based on battlefield stressors (not a placeholder).
Dependencies: Damage & effects, battle state (round), character `moraleRating`, RNG.
Specification:
- Data:
  - `character.moraleRating` (2–12 typical; PCs may ignore by setting very high or flag to skip).
  - Status: `status.moraleState?: 'hold'|'fallBack'|'flee'|'surrender'` (default 'hold').
  - `status.nextMoraleCheckRound?: number` for scheduled reassessments.
- Triggers:
  1. `firstBlood`: first time character takes damage (hp < max for first time).
  2. `woundedHalf`: hp drops to ≤ 50% max.
  3. `allyDeath`: an ally in same battle dies.
  4. `leaderDeath`: designated / highest-morale ally dies (+2 penalty).
  5. `scheduled`: round == `nextMoraleCheckRound`.
- Check:
  - Roll 2d6 + modifiers; success if total ≤ moraleRating.
  - Modifiers (add to roll; higher roll = worse):
    - Leader present: -1 (helps hold).
    - Outnumbered 2:1: +1; 3:1 or worse: +2 (living enemy vs allies).
    - Fear aura: +2 (future hook flag).
    - Recent victory (enemy slain this round by allies): -1.
    - LeaderDeath trigger: +2 (additional).
  - Outcome by failure margin (total - moraleRating when > rating):
    - Margin ≤0: `hold`.
    - 1–2: `fallBack`.
    - 3–4: `flee`.
    - ≥5: `surrender` (or `flee` if surrender not plausible).
- Scheduling:
  - If `hold` and total within 1 of moraleRating (close) mark shaken implicitly and set `nextMoraleCheckRound = currentRound + 2`.
  - Non-`hold` outcomes also schedule reassessment every 2 rounds while still on field.
- Effects:
  - Always emit `moraleCheck` with `{ character, trigger, roll, modifiersApplied:number[], total, moraleRating, outcome, margin }`.
  - If outcome changed: emit `moraleStateChanged` `{ character, outcome }`.
  - If battle `recordRolls` enabled, append each d6 roll with type `morale`.
- Store mutations: update `status.moraleState`, `status.nextMoraleCheckRound`.
Acceptance:
- Deterministic with seed.
- FirstBlood on low rating under penalties can yield flee/surrender consistent with margin table.
- Scheduling respected (check fires again on correct later round).

## Item 5: Death & Post-Damage Status Extensions
Purpose: Refine death handling establishing stable semantics for later resurrection or stabilization.
Dependencies: Damage command.
Specification:
- Introduce `status:{ dead:boolean; unconscious:boolean; stable:boolean }` in character entity.
- On damage reducing HP to 0: set `dead:true` (simple model); future phases (Phase 05 Item 2) may differentiate unconscious vs dead.
- Update damage event payload including `wasCritical` flag.
Acceptance: Killing blow with critical flagged in effects.

## Item 6: Combat Log Aggregation Utility
Purpose: Provide aggregated structured log for a battle for UI.
Dependencies: Initiative & effects system.
Specification:
- Collect emitted combat-related effects into `battle.log` array with timestamp (round, order index).
- Expose via `getBattleSnapshot` extended field `log` shallow-copied.
Acceptance: After several attacks log length equals events emitted.

## Item 7: Documentation & Test Coverage Expansion
Purpose: Cement advanced behaviors.
Dependencies: All earlier items.
Specification:
- Add docs sections referencing weapon vs armor, criticals, and progression under authoring guide.
- Tests: weapon vs armor adjustment, critical damage doubling, multi-level XP gain, death status, log accumulation.

## Out-of-Scope
- Spellcasting system.
- Detailed morale outcome effects.
- Resurrection mechanics.
