# Spell Memorization

Summary: Governs preparing spells into available daily slots after rest.

Inputs:
- Caster class & level
- Available spell slots per level (from Spell Progression)
- Known spell list (authorized spells)
- Rest state (must have completed required rest hours) and previous daily usage

Outputs:
- Memorized spell inventory (slots filled with selected spells)
- Remaining unfilled slots

Tables / Values:
- Required rest: typically 8 hours; additional 15 minutes per spell level to study (Magic-User) / pray (Cleric) (confirm OSRIC specifics).
- Spell slot table by class & level.

Procedure:
1. Verify rest requirement met and no disruptive events (encounters) resetting rest.
2. Present available slots; player selects spells from known list obeying restrictions (e.g., alignment).
3. Record selections; mark slots filled.
4. Output prepared list.

Edge Cases:
- Partially expended day: cannot rememorize mid-day without full rest (except read magic etc. per class exceptions).
- Forgotten spells (scroll mishaps) removed from known list.

Future Extensions:
- Optional specialization extra slots.
