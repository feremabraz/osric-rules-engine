# Movement Rates

Summary: Computes overland, dungeon, and combat movement speeds from base race speed and encumbrance.

Inputs:
- Race base speed (e.g., Human 12", Dwarf 9")
- Encumbrance multiplier (from Encumbrance)
- Terrain type (dungeon, road, wilderness, difficult)
- Time scale (round, turn, day)

Outputs:
- Movement distances per scale (feet per round, per turn, miles per day)

Tables / Values (Examples):
- Base 12" = 120 feet per round (10 rounds per turn) → 1200 ft/turn → 24 miles/day (march) (confirm OSRIC conversion factors).
- Difficult terrain halves rate; road multiplies by 1.25 over long distances.

Procedure:
1. Convert base speed to feet/round (10 ft per 1").
2. Apply encumbrance multiplier.
3. Apply terrain adjustments.
4. Derive other scales (turn/day) via standard conversions.
5. Output structured distances.

Edge Cases:
- Mounts or vehicles override base; treat separately.
- Magical haste multiplies post-encumbrance movement.

Future Extensions:
- Fatigue accumulation reducing daily miles.
