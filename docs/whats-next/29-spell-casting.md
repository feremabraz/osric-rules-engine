# Spell Casting

Summary: Resolves the act of casting a prepared (memorized) spell including casting time, components, and delivery.

Inputs:
- Caster class & level
- Spell selected (level, school, range, duration, components V/S/M)
- Casting time (segments or rounds)
- Target info (range, line of sight/effect, saving throw type)
- Concentration state (if prior ongoing spell maintained)
- Environmental modifiers (silence, underwater, restraints)

Outputs:
- Casting start & completion segment
- Spell effect seed (passed to Spell Effects rule)
- Component consumption list
- Saving throw prompt (if applicable)
- Failure reason (if failed)

Procedure:
1. Validate spell is prepared & not already expended (or available slot for spontaneous caster if variant).
2. Check components: verbal (no silence/gag), somatic (hands free), material (present & not consumed previously).
3. Mark casting as in-progress for casting time duration segments.
4. On completion segment: if uninterrupted (see Spell Interruption), produce effect seed and consume slot/components.
5. Queue saving throw for targets as defined.
6. Emit completion outcome.

Edge Cases:
- Casting in armor restrictions (e.g., Magic-User in armor prohibited) causes automatic failure if violated.
- Underwater verbal components fail unless adaptation.
- Scroll spells use Scroll Spell Casting spec; not here.

Future Extensions:
- Metamagic-like adjustments (advanced optional subsystem).
