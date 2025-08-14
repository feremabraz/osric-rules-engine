# Initiative

Summary: Determines order of actions in a combat round including party vs opponents and individual factors.

Inputs:
- Combatants (sides, individual DEX, modifiers)
- Surprise status (from Surprise Check)
- Weapon speed factors, spell casting segments, movement declarations

Outputs:
- Initiative order structure (round timeline) with segment indices
- Ties resolution data

Tables / Values:
- Base d6 roll per side (lower acts first) or variant individual d10 (choose mode; default side-based).
- Surprise: Surprised side loses 1–2 segments (roll 1d6: 1–2 surprised; lost segments equal roll) (confirm OSRIC specifics). Opponent may act during lost segments.
- Weapon Speed Factor: Used to break ties; lower speed acts first; large differences may grant extra attack (optional rule).
- Spell Casting Time: Number of segments equal to casting time; resolution at end of that segment.

Procedure:
1. Resolve surprise.
2. Roll initiative per side (or per combatant if using individual mode).
3. Order sides by result (ascending if lower=faster).
4. Within same segment, order spells (finishing this segment), missiles, melee (weapon speed), movement (variant ordering configurable).
5. Apply surprise delay segments.
6. Produce timeline of (segment, actor, action).

Edge Cases:
- Exact tie after all tie-breakers: simultaneous.
- Interrupted casting handled by Spell Interruption spec.

Future Extensions:
- Segment event queue integration.
