# Phase 05 – Stabilization & Metrics

Goal: Harden systems, ensure determinism, add observability and finalize MVP edge cases from 01-mvp docs (saving throws base coverage, post-damage follow-ups).

## Item 1: Saving Throws Expansion
Purpose: Provide unified API to request a saving throw with class base values + ability modifiers.
Dependencies: Phase 01 class base saves placeholders (will be populated by progression) & RNG.
Specification:
- Utility `performSavingThrow(characterId, type:'death'|'wands'|'petrification'|'breath'|'spells', modifiers?:number[])`.
- Calculate target number ascending: store saves as target value to meet or exceed (if stored descending convert). Choose ascending consistent with attack: `roll = d20 + mods >= target`.
- Return `{ success:boolean; roll:number; target:number; total:number }`.
Acceptance: Deterministic given seed snapshot.

## Item 2: Status Post-Damage Edge Cases
Purpose: Add wounded thresholds & stabilization placeholder.
Dependencies: Damage system.
Specification:
- Add `unconscious` state for HP ==0 but not dead (switch death condition from <=0 to <0 to allow 0 = unconscious). For simplicity in MVP: subtracting to 0 sets `unconscious:true` else below 0 sets `dead:true` (negative HP possible). Cap negative HP at -10 (floor) for record.
- Adjust damage application rules and events accordingly.
Acceptance: Damage bringing HP exactly to 0 sets unconscious not dead.

## Item 3: Logging Hooks
Purpose: Expose lightweight instrumentation reflecting design doc events.
Dependencies: Execution context events.
Specification:
- Build on existing `engine.events.trace` array: wrap with emitter interface and accumulate metrics.
- Provide `engine.metrics.snapshot()` returning `{ commandsExecuted, commandsFailed, avgDurationMs, last:N }` (N configurable internal constant) without adding heavy deps.
Acceptance: After running a few commands snapshot reflects counts & mean duration.

## Item 4: Final MVP Validation Script
Purpose: End-to-end scenario verifying all MVP functional paths.
Dependencies: All prior.
Specification:
- Script (test) that: creates characters, levels one up, starts battle, runs several rounds, performs attacks, damage, saving throws, logs outcomes, ensures metrics increments and deterministic digest stable.
Acceptance: Single assertion on final digest equality to stored snapshot.

## Out-of-Scope
- Real persistence adapter.
- Full spell system.
- AI / morale resolution.
