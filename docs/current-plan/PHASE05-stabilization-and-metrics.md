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

## Item 3: Logging & Metrics Hooks
Purpose: Expose lightweight instrumentation reflecting design doc events.
Dependencies: Execution context events.
Specification (final):
- Build on existing `engine.events.trace` array and accumulate minimal metrics.
- Provide `engine.metricsSnapshot()` returning `{ commandsExecuted, commandsFailed, recent[] }` (average duration removed during scope trim).
Acceptance: After running a few commands snapshot reflects executed/failed counts and recent list.

## Item 4: Final MVP Digest Test
Purpose: End-to-end scenario verifying all MVP functional paths.
Dependencies: All prior.
Specification:
- End-to-end digest test creating characters, leveling, performing inspire, attack, damage, saving throw; captures minimized JSON digest (IDs, levels, trace, metrics) with snapshot.
Acceptance: Inline snapshot passes deterministically for fixed seed; excludes volatile HP for reduced churn.

## Completion Notes
- Metrics trimmed (removed avg & cumulative duration fields).
- Deterministic ID injection added at start for reproducible snapshots.
- HP 0 => unconscious, <0 (>= -10) => dead, implemented in damage flow & store invariant.

## Out-of-Scope (unchanged)
- Real persistence adapter.
- Full spell system.
- AI / morale resolution.
