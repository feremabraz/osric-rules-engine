# Thief Skills

Summary: Defines percentile-based thief skill chances by level with ability, race, and situational modifiers.

Inputs:
- Character level (thief or assassin variants)
- Base ability scores (DEX, INT for languages/reading, etc.)
- Armor worn, encumbrance tier, light conditions, tools quality
- Race (adjustment table)

Outputs:
- Final success percentages per skill: Pick Pockets, Open Locks, Find/Remove Traps, Move Silently, Hide in Shadows, Hear Noise (d6 or %), Climb Walls, Read Languages (%, gating at level), Backstab multipliers (separate table)
- Modifier breakdown per skill

Tables / Values:
- Base percentages per level (1–20) for each skill.
- Racial modifiers (e.g., Halfling bonuses to Hide/Move Silently).
- DEX adjustments: High DEX adds %, low DEX subtracts per band.
- Armor penalties: Leather 0, Studded -10%, Chain -30%, etc. (confirm OSRIC specifics).
- Light penalties: Darkness prevents certain checks; dim light bonus to Hide if race has infravision? (spec placeholder).

Procedure:
1. Retrieve base level row for each skill.
2. Apply racial modifiers.
3. Apply DEX modifier.
4. Apply armor penalty.
5. Apply situational (tools quality, light, encumbrance).
6. Clamp final to 1–99% (unless 0 is permitted for impossible).
7. Output breakdown list.

Edge Cases:
- Skill exceeding 99% displays 99% (natural 00 still failure) or cap per rule.
- Multiple armor sources: use heaviest.

Future Extensions:
- Environment-specific adjustments (wet walls for Climb -25%).
