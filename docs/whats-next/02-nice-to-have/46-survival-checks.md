# Survival Checks

Summary: Resolves success at enduring harsh environmental conditions (extreme heat/cold) or finding shelter.

Inputs:
- Environment severity index
- Character CON, relevant proficiencies
- Protective gear

Outputs:
- Success/failure
- Consequences: fatigue, HP loss, status (exhausted, frostbite)

Tables / Values (Examples):
- Base check: d20 <= CON modified by severity.
- Severity modifiers: Mild 0, Moderate +2, Severe +5 (harder), Extreme +8.
- Failure consequences: 1d3 non-lethal HP or fatigue level increase.

Procedure:
1. Determine severity.
2. Compute modified target.
3. Roll d20; compare.
4. Apply consequences on failure.
5. Repeat at frequency (every hour/day) depending on environment.

Edge Cases:
- Magical protection bypasses checks.
- Group shelter reduces severity by 1 tier.

Future Extensions:
- Detailed fatigue stacking interacting with movement.
