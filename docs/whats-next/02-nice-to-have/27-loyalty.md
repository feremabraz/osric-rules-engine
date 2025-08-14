# Loyalty

Summary: Determines retention and obedience of hirelings, henchmen, and retainers.

Inputs:
- Base loyalty score (2–18) (derived from employer CHA, treatment, pay)
- Trigger event (danger, command, poor treatment, rich opportunity elsewhere)
- Modifiers (recent fair pay +, dangerous mission -)

Outputs:
- Loyalty check result: Obeys, Hesitates, Desert, Betray
- Adjusted loyalty score (may shift over time)

Tables / Values:
- Loyalty check: Roll 3d6; success if <= loyalty.
- Modifiers: Late pay -2, Generous bonus +2, Witnessed employer cowardice -2, Shared treasure +1.

Procedure:
1. On trigger, compute effective loyalty = base + cumulative modifiers (cap 3–18).
2. Roll 3d6.
3. If roll <= effective loyalty: Obeys.
4. If slight failure (1–2 over): Hesitates (retry possible next round).
5. Larger failure: Desert (attempt to leave); extreme failure (≥5 over) with betrayal conditions: Betray.
6. Adjust loyalty upward after consistent good treatment; downward after mistreatment.

Edge Cases:
- Magical compulsion overrides loyalty.
- Fanatical loyalty (18+) may auto succeed except extreme hazard (GM override).

Future Extensions:
- Morale integration (loyalty influences morale modifiers).
