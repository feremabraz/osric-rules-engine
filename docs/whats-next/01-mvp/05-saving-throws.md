# Saving Throws

Summary: Resolves a character's target number for a saving throw attempt and enumerates situational modifiers and special immunities/resistances.

Inputs:
- Character state (class(es), level(s), race, abilities, status effects)
- Save category: Paralyzation/Poison/Death, Petrification/Polymorph, Rod/Staff/Wand, Breath Weapon, Spell
- Situational modifiers (magic items, spells, class/racial bonuses, difficulty adjustment)
- Optional override target (rare scenario)

Outputs:
- Base save target (before modifiers)
- Final save target (after modifiers & clamp 2–20)
- Modifier breakdown list (source, value, description)
- Flags: automaticSuccess?, automaticFailure?, canAttempt?
- Special rule notes (e.g., racial magic resistance, paladin bonuses)

Tables / Values:
- Class-based saving throw progression arrays per category (levels 1–20). Use OSRIC canonical tables (see source book). Multi-class: take best (lowest) target per category among component classes at their respective levels.
- Difficulty adjustments: Easy -2 (improves chance), Hard +2, Very Hard +4 to target number.
- Ability Modifiers (typical ranges; confirm):
  - CON vs Poison/Death: High CON reduces target (e.g., 14:-1, 15:-2, 16:-3, 17+:-4; low CON increases)
  - WIS vs Spells/Rod/Staff/Wand: 13:-1, 15:-2, 17+:-3; low WIS penalties
  - DEX vs Breath: 13:-1, 15:-2, 17+:-3; low DEX penalties
- Racial resistances (Dwarf/Halfling vs Spells/Rods/Wands) treated as situational modifiers (value TBD from OSRIC text; placeholder +1 to +4 scaling by CON—clarify in final data entry).
- Natural 1 automatic fail; natural 20 automatic success after all computation.

Procedure:
1. Determine candidate base targets for each relevant class/level; select lowest (best) target.
2. Initialize final target = base target.
3. Apply class features (e.g., Paladin +2 all saves from level 2+, Monk immunities at thresholds) adjusting modifiers list and final target.
4. Apply racial bonuses.
5. Apply ability-based modifiers by category.
6. Apply situational modifiers input (magic items, spells, difficulty).
7. If override target present: record difference as modifier; set final target.
8. Clamp final target to 2–20 inclusive.
9. Check for automatic success/failure conditions (immunities, statuses) setting flags.
10. Output structured result.

Edge Cases:
- Character dead/unconscious: cannot attempt (flag canAttempt false).
- Multiple sources same description: aggregate or list individually (implementation decision; spec allows either with clarity).
- Multi-class level arrays shorter than needed: cap at highest defined.

Future Extensions:
- Integration with effect system for temporary advantage-like stacking rules.
