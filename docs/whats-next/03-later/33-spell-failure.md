# Spell Failure

Summary: Covers cases where a spell fails after casting attempt due to miscast, wrong components, hostile environment, or resistance.

Inputs:
- Casting attempt result (from Spell Casting)
- Target saving throw outcomes
- Environmental factors (anti-magic field, wild magic zone, planar conditions)
- Scroll use mishaps (if scroll casting)

Outputs:
- Failure reason code (component-missing, interrupted, save-success, resistance, miscast)
- Consequence (slot lost? backlash? partial effect?)

Procedure:
1. If component missing check earlier flagged: failure component-missing; no effect; slot typically lost.
2. If anti-magic or null field present: failure resistance; slot lost.
3. If target succeeded saving throw: effect negated or reduced per spell definition; mark partial if half-damage, etc.
4. If wild zone triggers miscast: roll on miscast table to determine alternate effect (future table).
5. Output structured failure with severity.

Edge Cases:
- Spell with no save: skip saving throw branch.
- Multi-target spells: partial success per target; treat each target separately but overall spell not failed globally.

Future Extensions:
- Detailed wild magic / corruption effects.
