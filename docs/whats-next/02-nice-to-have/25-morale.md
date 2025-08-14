# Morale

Summary: Determines if NPCs/monsters continue fighting or attempt to flee/surrender based on morale checks.

Inputs:
- Creature morale rating (2–12 typical)
- Trigger event (first blood, 50% casualties, leader death, fear effect)
- Modifiers (leader present, high ground, outnumbered, fear aura)

Outputs:
- Morale check result: Hold, Fall Back, Flee, Surrender
- Next check schedule (if hold but shaken)

Tables / Values:
- Morale Rating vs 2d6 roll: Success if roll <= rating (continue), failure escalates response.
- Modifiers: Leader present +1, Outnumbered 2:1 -1, 3:1 -2, Fear aura -2, Recent victory +1.

Procedure:
1. On trigger, roll 2d6 + modifiers.
2. Compare to rating.
3. If success: Hold (maybe mark shaken if close to threshold; optional).
4. If failure margin small (1–2): Fall Back; greater margin: Flee; extreme margin or surrounded: Surrender.
5. Schedule next morale check if holding under pressure (e.g., every 2 rounds after 50% casualties).

Edge Cases:
- Mindless undead, summoned elementals may ignore morale entirely.
- Charm/domination overrides morale.

Future Extensions:
- Differentiated morale tables per creature type.
