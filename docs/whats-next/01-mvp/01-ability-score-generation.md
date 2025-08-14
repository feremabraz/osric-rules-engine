# Ability Score Generation

Summary: Defines methods to generate the six core ability scores for a new character prior to racial adjustments and exceptional strength determination.

Inputs:
- Chosen method: `standard3d6` | `arranged3d6` | `4d6-drop-lowest`
- (arranged3d6) Optional pre-arranged ordered ability scores (exactly six integers 3–18)

Outputs:
- Raw ability scores object: { STR, DEX, CON, INT, WIS, CHA } each 3–18 (before racial/class mods or exceptional strength parsing)
- Metadata: chosen method identifier

Tables / Values:
- Standard roll: `3d6` per ability in fixed order STR, DEX, CON, INT, WIS, CHA.
- Arranged 3d6: Roll six times `3d6`, player assigns each value to an ability (spec requires consumer UI/selection; if absent, keep rolled order).
- 4d6 drop lowest: Roll four d6, discard single lowest die, sum remaining three. Repeat six times. Player assigns or keep order (same assignment logic as arranged3d6).

Procedure:
1. Read selected method.
2. If `standard3d6`: for each ability in canonical order, roll `3d6` and record.
3. If `arranged3d6`: if six provided integers pass validation (range 3–18), accept as final; else roll six `3d6`. If assignment step is interactive, allow reordering; spec assumes final ordered list ready.
4. If `4d6-drop-lowest`: for i in 1..6 roll 4d6, discard single lowest die (exactly one), sum remaining three; collect six results. Allow assignment as above.
5. Package scores into object mapping with final order.
6. Emit result; no modifications or validations beyond bounds.

Edge Cases:
- Provided arranged list not length 6 or out-of-range → invalid selection (consumer handles error) – generation not performed.
- All dice identical: still discard only one for 4d6-drop-lowest.
- No assignment UI: retain rolled order.

Future Extensions:
- Alternate OSRIC optional generation methods (e.g. 3d6 in order with reroll 1s, point-buy variants) can be appended with new identifiers.
