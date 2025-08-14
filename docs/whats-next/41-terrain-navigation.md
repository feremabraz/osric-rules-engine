# Terrain Navigation

Summary: Determines travel success, time adjustments, and getting lost chances in wilderness.

Inputs:
- Terrain type (forest, desert, mountains, swamp, plains)
- Weather conditions
- Navigator skill/ability (WIS or proficiency)
- Use of maps

Outputs:
- Chance to become lost
- Adjusted travel time multiplier
- Directional deviation (if lost)

Tables / Values (Examples):
- Base chance lost per terrain: Plains 5%, Forest 15%, Mountains 25%, Swamp 30%, Desert 35%.
- Map reduces chance by half (round down percentage points).
- Good visibility -5%, poor visibility +10%.

Procedure:
1. Determine base lost chance.
2. Apply map & weather modifiers.
3. Roll percentile; if <= final chance, mark lost.
4. If lost: pick random deviation direction (1d8) and apply for N hours before correction attempt (e.g., after 1d4 hours or next dawn).
5. Adjust total travel distance/time accordingly.

Edge Cases:
- Magical navigation (e.g., know direction) sets chance to 0%.
- Group splitting uses leader's navigation ability.

Future Extensions:
- Foraging integration affecting pace.
