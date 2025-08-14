# Spell Learning

Summary: Determines whether a caster can add a new spell to their known repertoire (spellbook or prayer list limitations).

Inputs:
- Candidate spell (level, school)
- Caster class, level, INT (or WIS for cleric restrictions) score
- Source type (teacher, scroll, research)

Outputs:
- Learn success/failure
- Time & cost (for study) if applicable

Tables / Values:
- Chance to learn spell by INT (e.g., INT 9: 45%, INT 18: 85%; confirm OSRIC table).
- Max spells per level by INT.

Procedure:
1. If already known or at max per level: auto-fail with reason.
2. Roll percentile vs chance to learn.
3. On success: add to spellbook (with scribing time/cost) or accessible list.
4. On failure: mark permanently unlearnable (unless optional re-attempt rule) until higher INT change or research.

Edge Cases:
- Duplicate attempt disallowed if permanently failed unless rule variant.
- Insufficient materials interrupts process.

Future Extensions:
- Specialization bonuses to learn chance.
