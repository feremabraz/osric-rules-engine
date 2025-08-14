# Two-Weapon Fighting

Summary: Modifies attack routine when wielding a weapon in each hand.

Inputs:
- Main-hand weapon stats
- Off-hand weapon stats (typically light)
- DEX score (affects penalties)
- Feats/abilities (none in vanilla OSRIC; house rules optional)

Outputs:
- Adjusted attack penalties main/off-hand
- Off-hand attack inclusion flag

Tables / Values:
- Base penalties: -2 main / -4 off-hand.
- DEX adjustment bands (example placeholder, verify OSRIC or remove if not present): DEX 15–16 reduce each penalty by 1; 17–18 reduce by 2.

Procedure:
1. Validate off-hand weapon qualifies (size/lightness requirement).
2. Determine base penalties.
3. Apply DEX adjustments.
4. Add off-hand attack to Multiple Attacks schedule with its penalties.

Edge Cases:
- Shields not considered off-hand weapons for this unless configured.
- Incompatible heavy off-hand weapon: disallow or treat as improvised penalty (configurable).

Future Extensions:
- Weapon style specializations.
