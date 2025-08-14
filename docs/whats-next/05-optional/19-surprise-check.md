# Surprise Check

Summary: Determines if one or more sides are surprised at encounter start and number of surprise segments.

Inputs:
- Participating sides (party, monsters, others)
- Surprise modifiers (racial abilities, scouting, noise, illumination)

Outputs:
- Surprise result per side: surprised? (bool), surprise segments lost (0–? typically 1–2)
- Initiative adjustment context for first round

Tables / Values:
- Base mechanic: Each side rolls 1d6; result 1–2 = surprised for that many segments (confirm OSRIC specifics). Modifiers may shift surprised range (e.g., Elves surprise others on 1–4, are surprised only on 1). Use canonical OSRIC ranges.

Procedure:
1. Roll surprise die for each side simultaneously applying modifiers to range.
2. Determine surprise segments for each surprised side.
3. Non-surprised side may act in those early segments; surprised side cannot act (cannot cast, move, attack) except passive defenses.
4. Feed surprise segment data to Initiative rule for timeline adjustment.

Edge Cases:
- Both sides surprised: treat as normal round (or both lose same segments) depending on OSRIC guidance.
- Ambush with automatic surprise: skip roll; assign fixed segments.

Future Extensions:
- Partial party surprise (split handling) if scouting ahead.
