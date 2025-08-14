# Strength Comparison

Summary: Provides relative advantage modifier when two beings contest physical force (grappling, pushing, opening doors, overbearing).

Inputs:
- Contestant A STR (or exceptional band)
- Contestant B STR
- Size categories (if relevant)

Outputs:
- Modifier applied to A (negative for B advantage)
- Optionally success probability directly if using table lookup

Tables / Values:
- Matrix (rows STR/percentile for A, columns for B) yields modifier -10 to +10 (placeholder). Actual OSRIC may utilize Open Doors / Bend Bars percentages; adapt by computing differential.
- Open Doors: Base success numbers on 1d6 (e.g., STR 10: 1–2, high STR expands range). Bend Bars: % chance baseline used for extreme feats.

Procedure:
1. If used for open doors: Roll 1d6 vs threshold derived from STR (see ability table) with adjustments for assistance.
2. For head-to-head: Determine differential STR band; map to modifier.
3. Apply size adjustments before mapping (each size category difference grants +/-2 STR equivalent).
4. Output modifier or probability.

Edge Cases:
- Exceptional STR converts to numeric band (18/00 highest within STR 18 tier).
- Magical enhancement temporary: use current effective STR.

Future Extensions:
- Unified contested check system for all physical contests.
