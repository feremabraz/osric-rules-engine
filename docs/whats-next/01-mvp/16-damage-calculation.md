# Damage Calculation

Summary: Determines damage from a successful attack, applies modifiers, resistances, and updates target HP and statuses.

Inputs:
- Weapon damage dice (size-adjusted)
- Strength / specialization / magic bonuses
- Critical flag & model (multiplier or extra dice)
- Damage type (slashing, piercing, bludgeoning)
- Target resistances, vulnerabilities, DR, immunities
- Additional effect bonuses (spell buffs, situational)

Outputs:
- Dice results
- Modified damage pre-mitigation
- Final applied damage
- Threshold flags: unconscious (<=0), bleeding (<0), dead (<=-10)

Tables / Values:
- Strength damage bonus table
- Exceptional STR expanded bonuses
- Damage reduction subtracts before vulnerability doubling (state consistent order)

Procedure:
1. Roll base dice.
2. Add bonuses (STR, specialization, magic, situational).
3. Apply crit model.
4. Apply resistances/immunities; then vulnerabilities; then subtract DR; floor at 0.
5. Subtract from HP; set status flags.
6. Trigger Post-Damage Status rule for bleed/death checks.
7. Output breakdown.

Edge Cases:
- Immunity sets damage to 0 before vulnerability.
- Negative HP tracking limited to -10 baseline.

Future Extensions:
- Limb/Location damage.
