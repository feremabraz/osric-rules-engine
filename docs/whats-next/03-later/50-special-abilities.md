# Special Abilities

Summary: Catalog and resolution framework for monster and class special abilities (breath weapons, gaze attacks, regeneration).

Inputs:
- Ability descriptor (type, usage frequency, area/range, save type, damage/effect formula)
- Cooldown or recharge timer
- Target states

Outputs:
- Ability use eligibility (can use now?)
- Effect seed (damage, condition, summon) forwarded to Spell Effects or Damage Calculation
- Updated recharge timer

Tables / Values:
- Breath weapon recharge: every X rounds or 1d4 rounds after use.
- Gaze attack range: 30 ft; save each round when looking.
- Regeneration rate: e.g., Troll 3 HP/round (fire/acid prevent).

Procedure:
1. Check recharge/cooldown.
2. Validate conditions (line of sight, charges, form).
3. If eligible, create effect parameters and mark usage (start cooldown timer).
4. Resolve saving throws/ damage via shared systems.
5. Apply ongoing effects (e.g., regeneration tick scheduling).

Edge Cases:
- Multiple abilities share resource pool; using one locks others (flagged in descriptor).
- Suppressed abilities (silence on sonic breath) blocked temporarily.

Future Extensions:
- Ability synergy combos (triggered enhancements).
