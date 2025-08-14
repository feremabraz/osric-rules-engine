# Turn Undead

Summary: Cleric (and paladin at higher levels) ability to Turn, Dismiss, or Destroy undead based on a matrix of cleric level vs undead type.

Inputs:
- Cleric/Paladin level
- Undead type (skeleton, zombie, ghoul, wight, wraith, mummy, spectre, vampire, ghost, lich, special)
- Number and HD of undead present

Outputs:
- Required turn roll on 2d6 (or automatic "T" turn, "D" destroy) from matrix
- Result category: Fail, Turn (HD or # affected), Destroy (subset types), Control (if variant), No effect (if immune)

Tables / Values:
- Standard Turn Undead matrix (level rows vs undead type columns). Entries: target number (2–12) or "T" (auto turn) or "D" (auto destroy) or "—" (cannot affect yet).
- Maximum HD / number affected: Typically 2d6 creatures of a given type starting from lowest HD; confirm OSRIC rule ordering.

Procedure:
1. Determine matrix cell for level vs undead type.
2. If cell is "—": automatic fail.
3. If cell is "T": success (turn) without roll.
4. If cell is "D": destroy (if type eligible for destruction at that level) without roll.
5. Otherwise roll 2d6; if >= target, success.
6. On success: roll 2d6 for number affected; apply to closest/lowest-HD first; mark as Turned (fleeing) for duration (e.g., 3d4 rounds) or Destroy if applicable.

Edge Cases:
- Mixed groups: process type by type starting at weakest (implementation detail).
- Evil clerics controlling undead variant not included (future extension).

Future Extensions:
- Control undead variant.
