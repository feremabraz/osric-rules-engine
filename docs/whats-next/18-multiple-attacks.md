# Multiple Attacks

Summary: Determines number and scheduling of attacks from class progression, dual wielding, weapon rate of fire, and haste/slow effects.

Inputs:
- Class & level
- Weapon(s) (including rate of fire for missile)
- Dual-wield flag
- Active haste/slow
- Prior round fractional carry (for 3/2 style progressions)

Outputs:
- Attack count this round
- Schedule order indices

Tables / Values:
- Fighter progression: 1/round (1–6), 3/2 (7–12), 2/round (13+). (Confirm OSRIC).
- Missile rate of fire: e.g., Shortbow 2, Longbow 2, Heavy Crossbow 1.
- Two-Weapon penalties default: -2 main / -4 off (modifiable by high DEX).
- Haste doubles, Slow halves (round fractions: up after multiplication for haste, down for slow).

Procedure:
1. Compute base class attacks (include fractional state from previous rounds).
2. Merge with weapon rate: select maximum, not additive (except off-hand treated separately).
3. Add off-hand attack if dual wielding.
4. Apply haste/slow multiplier.
5. Resolve fractional (store remainder for next round if 3/2 style).
6. Produce even distribution schedule across timeline (initiative segments or abstract indices).
7. Output result.

Edge Cases:
- Stacking haste ignored; take highest single effect.
- Switching weapons mid-round does not add rate-of-fire attacks.

Future Extensions:
- Cleave style bonus attacks on kill.
