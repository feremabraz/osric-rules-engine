# Experience Gain

Summary: Defines sources of XP and calculation adjustments prior to applying to class progression.

Inputs:
- Encounter outcomes (monsters defeated, treasure recovered, objectives achieved)
- Roleplay / story awards
- Prime requisite adjustment percentage
- Party size & average level (for scaling if applied)

Outputs:
- Total XP award per character
- Breakdown (monster, treasure, bonus, penalty)

Tables / Values:
- Monster XP: Base value + per hit point increment (reference OSRIC monster appendix). This spec lists structure, not the full monster table.
- Treasure XP: 1 gp value = 1 XP (standard), optional caps/ratios determined by campaign guidelines.
- Prime Requisite: +5% or +10% as computed earlier.
- Level Disparity Adjustments: Optional rule; if used, characters above party average may receive reduced %; below average may receive bonus.

Procedure:
1. Tally monster XP from encounter log.
2. Tally treasure XP (convert GP equivalent) if rule active.
3. Add discretionary/story awards.
4. Sum baseXP.
5. Apply prime requisite modifier (baseXP * (1 + pct)).
6. Apply party scaling adjustments (if enabled).
7. Output final XP (round down) with breakdown.

Edge Cases:
- Character absent: may receive reduced or zero share (campaign option, not enforced here—flag only).
- Fractional XP after modifiers: floor.
- Multi-class: divide award equally among classes (rounded; distribute remainders deterministically e.g., highest prime requisite priority).

Future Extensions:
- XP for magic item creation, spell research separate specs.
