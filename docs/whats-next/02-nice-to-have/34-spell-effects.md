# Spell Effects

Summary: Applies a spell's mechanical outcomes (damage, healing, buffs, debuffs, summoning) after successful casting and saving throw resolution.

Inputs:
- Spell effect descriptor (range, area, duration, type, scaling)
- Targets & their save results
- Caster level, relevant ability modifiers
- Existing overlapping effects (for stacking rules)

Outputs:
- Applied changes (HP delta, conditions added/removed, summoned entities, environmental alterations)
- Duration timers scheduled

Procedure:
1. Determine effect scaling by caster level (e.g., damage dice per level up to cap).
2. For each target: apply save outcome logic (full/half/negate) adjusting damage or duration.
3. Apply resistances/immunities (e.g., fire resistance halves fire damage before save adjustments if OSRIC ordering requires—define consistent order: save first then resistance or vice versa; choose save then resistance).
4. Enforce stacking rules (e.g., same buff does not stack; refresh duration or ignore).
5. Summon entities or create zones; register with engine store.
6. Schedule expiration events.

Edge Cases:
- Fractional durations: round down to nearest segment or round.
- Area partly obstructed: line of effect needed; exclude blocked targets.

Future Extensions:
- Over-time damage/healing tick integration.
