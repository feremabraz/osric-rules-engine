# Class Requirement Validation

Summary: Determine if adjusted abilities and race satisfy OSRIC class entry requirements and note prime requisite(s) for experience adjustments.

Inputs:
- Adjusted abilities
- Race
- Desired class (Fighter, Cleric, Magic-User, Thief, Assassin, Ranger, Paladin, Druid, Monk, Illusionist, Bard, etc.)

Outputs:
- Eligibility: boolean
- Failure reasons (array of { requirement: string, needed: value, actual: value })
- Prime requisites list
- Experience adjustment bracket (e.g., +10%, +5%, 0%, -10%) based on prime requisite(s)

Tables / Values (Representative OSRIC thresholds – refine against source text):
- Fighter: STR ≥ 9 (Prime: STR)
- Ranger: STR ≥ 13, INT ≥ 13, WIS ≥ 14, CON ≥ 14 (Primes: STR, INT, WIS)
- Paladin: STR ≥ 12, WIS ≥ 13, CHA ≥ 17 (Primes: STR, CHA)
- Cleric: WIS ≥ 9 (Prime: WIS)
- Druid: WIS ≥ 12, CHA ≥ 15 (Prime: WIS, CHA)
- Magic-User: INT ≥ 9 (Prime: INT)
- Illusionist: INT ≥ 15, DEX ≥ 16 (Prime: INT, DEX)
- Thief: DEX ≥ 9 (Prime: DEX)
- Assassin: DEX ≥ 12, STR ≥ 12, INT ≥ 11 (Prime: DEX, STR)
- Monk: DEX ≥ 15, STR ≥ 15, WIS ≥ 15, CON ≥ 11 (Prime: DEX, WIS)
- Bard (if used): DEX ≥ 15, CHA ≥ 15, STR ≥ 12, WIS ≥ 12, CON ≥ 10, INT ≥ 13 (Primes: DEX, CHA)

Experience Adjustment (example mapping; confirm OSRIC specifics):
- Single prime ≥ 16: +10%
- Single prime 13–15: +5%
- All primes ≥ 16 (multi-prime classes): +10%
- Any prime ≤ 5: -10% (if allowed)
- Otherwise: 0%

Procedure:
1. Lookup requirement set for class.
2. For each required ability, compare actual vs threshold; record failures.
3. Determine eligibility (no failures, race not prohibited for class—racial prohibitions listed below).
4. Identify prime requisites; compute experience adjustment by evaluating prime values.
5. Output structured result.

Race/Class Prohibitions (sample – verify OSRIC):
- Dwarf: Cannot be Paladin, Ranger, Druid, Illusionist (adjust per canon).
- Halfling: Cannot be Paladin, Monk, Druid.
- Half-Orc: Typically cannot be Paladin.
- Elf: Cannot be Paladin, Monk.

Edge Cases:
- Multi-class selection handled elsewhere; this spec is single-class validation.
- Ability temporarily boosted (magic) should not count for entry (only permanent scores) – assume raw adjusted base.

Future Extensions:
- Multi-class combination validation matrix.
