# Exceptional Strength Determination

Summary: For characters with base STR 18 in eligible classes/races, determine percentile exceptional strength (18/01–18/00) and map to combat / encumbrance bonuses.

Inputs:
- STR (post racial adjustment)
- Class (eligible: Fighter, Paladin, Ranger; optionally Fighter sub-classes; some half-orc clerics if allowed? follow OSRIC)
- Race (must permit exceptional: typically Human, Half-Orc, Dwarf; confirm OSRIC scope)

Outputs:
- Strength rating: either integer 3–18 or tuple { base:18, percentile:1–100 }
- Derived bonuses: to-hit, damage, weight allowance, open doors, bend bars/lift gates percent

Tables / Values (Representative – align with OSRIC text):
Percentile Bands:
- 18/01–50
- 18/51–75
- 18/76–90
- 18/91–99
- 18/00 (treated as 100)
Example Bonus Mapping (placeholder – validate):
| Band | Hit Bonus | Damage Bonus | Weight Allow + (lbs) | Open Doors (d6) | Bend Bars % |
|------|-----------|--------------|----------------------|-----------------|-------------|
| 01–50 | +1 | +3 | +125 | 1–3 on 1d6 | 25% |
| 51–75 | +1 | +4 | +150 | 1–3 on 1d6 | 30% |
| 76–90 | +2 | +5 | +200 | 1–4 on 1d6 | 35% |
| 91–99 | +2 | +6 | +300 | 1–4 on 1d6 | 40% |
| 00 | +3 | +6 | +350 | 1–5 on 1d6 | 50% |

Procedure:
1. If STR != 18 → no exceptional; return as-is with standard 18 bonuses.
2. Check class eligibility; if not eligible, keep STR 18 (no percentile).
3. Roll percentile (d100) once; 100 maps to 00 band.
4. Determine band, lookup bonuses.
5. Output structured rating + bonuses.

Edge Cases:
- Rerolls not permitted unless house rule (future extension).
- Multiclass character: if any class eligible (e.g., Fighter/Magic-User), allow exceptional.

Future Extensions:
- Detailed encumbrance interactions.
