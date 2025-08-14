# Visibility

Summary: Determines detection distances and perception penalties based on lighting and conditions.

Inputs:
- Light source types & ranges
- Environmental conditions (fog, darkness, daylight, underground)
- Creature vision modes (normal, infravision)

Outputs:
- Maximum detection distance categories (sight, recognition, surprise adjustments)
- Perception modifiers

Tables / Values (Examples):
- Torch radius: Bright 30 ft, Dim 60 ft.
- Infravision: 60 ft in darkness (heat sources only).
- Fog: halves all ranges.
- Darkness without vision: 0 ft (cannot see).

Procedure:
1. Determine brightest overlapping light for each observer-target pair.
2. Compute base detection distance by environment & light.
3. Apply visibility penalties to surprise and perception checks.
4. Output structured distances & modifiers.

Edge Cases:
- Multiple light sources overlapping: use highest.
- Invisible targets ignore visibility Distance (handled by other rules).

Future Extensions:
- Weather dynamic updates to visibility (rain, snow).
