# Falling Damage

Summary: Resolves damage from falls and secondary effects.

Inputs:
- Fall distance (feet)
- Surface type (stone, earth, water)
- Mitigating factors (feather fall, slope, cushioning)

Outputs:
- Damage dice rolled
- Final damage after mitigation
- Status effects (prone, unconscious)

Tables / Values (Example placeholder):
- Damage: 1d6 per 10 ft (first 10 ft minimal?), cap at 20d6.
- Soft landing halves damage; deep water (>= 10 ft) first 30 ft treated as soft; beyond full damage.

Procedure:
1. Compute dice count = floor(distance / 10) (min 1 if distance >= 10).
2. Roll damage.
3. Apply mitigation (feather fall sets to 0; soft halves, round down).
4. Apply to HP; if > half current HP single fall, require CON check vs stun (optional rule).
5. Set prone if any damage taken >0.

Edge Cases:
- Partial distances <10 ft typically no damage (optional 1d3 if >=5 ft).
- Falling into water with armor may impose drowning risk.

Future Extensions:
- Velocity tracking for chained falls.
