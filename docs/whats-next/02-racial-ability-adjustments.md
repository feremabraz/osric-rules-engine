# Racial Ability Adjustments

Summary: Apply OSRIC racial modifiers to raw ability scores post-generation, enforcing minimums/maximums and eligibility for race/class combinations.

Inputs:
- Raw abilities: { STR, DEX, CON, INT, WIS, CHA }
- Selected race (core: Human, Dwarf, Elf, Halfling, Half-Orc, Half-Elf, Gnome)

Outputs:
- Adjusted abilities (after racial modifiers and caps)
- Flags: any raised or lowered ability, any cap enforcement

Tables / Values (Typical OSRIC / 1E Style):
- Dwarf: +1 CON (max 19), -1 CHA (min 3, max 17 among non-dwarves reaction), STR max 18/99, DEX max 17.
- Elf: +1 DEX (max 19), -1 CON (min 3), STR max 18, CON max 17.
- Halfling: +1 DEX (max 19), -1 STR (min 3), STR max 17, CON max 18.
- Half-Orc: +1 STR (max 19), +1 CON (max 19), -2 CHA (min 3, effective cap 12 vs non half-orcs), INT max 17.
- Half-Elf: No numeric mods; certain ability minimums for some classes still relevant elsewhere.
- Gnome: +1 INT (max 19), -1 WIS (min 3), STR max 18, DEX max 18.
- Human: No adjustments, standard 3–18 (STR exceptional allowed if 18).

Procedure:
1. Clone raw ability object.
2. Apply race-specific additive modifiers (ensure within 3–18 before cap extension for 19 cases where race permits).
3. Enforce racial maximums (if value exceeds, clamp and record cap event).
4. Enforce racial minimums implicitly via later eligibility checks (do not raise here unless a rule grants minimum baseline; none do by default).
5. Record changes list (field, old, new, reason: 'racial-mod' or 'racial-cap').
6. Output adjusted abilities + changes metadata.

Edge Cases:
- Multiple modifiers raising above racial cap: apply arithmetic then single clamp.
- Negative adjustments dropping below 3: clamp at 3.
- Exceptional Strength only evaluated after this step if STR == 18 and race permits exceptional (Human, Half-Orc, Dwarf? per OSRIC specifics) – deferred to Exceptional Strength spec.

Future Extensions:
- Optional sub-race packages (e.g., High Elf, Hill Dwarf) layering further adjustments.
