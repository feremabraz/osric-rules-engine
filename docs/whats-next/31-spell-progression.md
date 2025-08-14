# Spell Progression

Summary: Provides number of spell slots per level for each casting class.

Inputs:
- Class
- Level
- Ability score (INT for Magic-User max spell level access; WIS for Cleric bonus spells?)

Outputs:
- Slots per spell level (array/map)
- Maximum spell level accessible
- Bonus spells (if ability grants)

Tables / Values:
- Progression tables per class: rows = character level, columns = spell level (0–9 where applicable).
- Ability score maximum accessible level (e.g., INT 9 allows up to 5th; confirm OSRIC chart).
- Wisdom bonus spells levels (if OSRIC grants; specify mapping by WIS).

Procedure:
1. Lookup row for level & class.
2. Determine max spell level accessible via ability; cap slots above this.
3. Add bonus spells into appropriate levels (cannot exceed cap of 1 per level unless chart allows).
4. Output structure.

Edge Cases:
- Multi-class casters: maintain separate progression per class; no slot sharing.
- Low ability score may restrict learning higher-level spells even if level qualifies.

Future Extensions:
- Domain or sphere-based slot differentiation.
