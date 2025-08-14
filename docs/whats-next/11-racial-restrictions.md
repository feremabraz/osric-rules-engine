# Racial Restrictions

Summary: Specifies race-based prohibitions and level caps for certain classes.

Inputs:
- Race
- Class (or multi-class combination)

Outputs:
- Allowed: boolean
- Level cap (number or null if none)
- Notes (explanatory text)

Tables / Values (Examples – verify OSRIC):
- Dwarf: May be Fighter (cap 9?), Thief (cap 12?), Cleric (as NPC?), cannot be Paladin, Ranger, Druid, Illusionist (adjust to canonical list). Exceptional STR allowed.
- Elf: May be Fighter (cap), Magic-User (no cap), Thief, Ranger (cap), cannot be Paladin, Monk. Multi-class options: Fighter/Magic-User, etc.
- Halfling: May be Fighter (cap), Thief, cannot be Paladin, Monk, Druid.
- Half-Orc: May be Fighter, Cleric (cap), Thief, Assassin; Paladin prohibited.
- Gnome: May be Illusionist, Thief, Fighter (cap), Cleric (cap).
- Half-Elf: Broad multi-class options, some caps.
- Human: No restrictions, no caps.

Procedure:
1. Lookup race entry; determine if class allowed.
2. If multi-class, verify combination exists in allowed matrix.
3. Return allowed flag + level cap (null if none) + notes.

Edge Cases:
- Level cap only applies to advancement; initial creation still allowed.
- Human exception overrides any generic prohibitions.

Future Extensions:
- Sub-race distinct tables.
