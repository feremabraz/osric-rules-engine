# Reaction Adjustment

Summary: Determines initial disposition of encountered intelligent creatures.

Inputs:
- Base reaction roll (2d6)
- CHA modifier of party spokesperson
- Circumstantial modifiers (bribes, prior reputation, alignment clash, language barrier)

Outputs:
- Reaction category: Immediate Attack, Hostile, Uncertain, Neutral, Friendly, Helpful, Enthusiastic Ally (depending on scale granularity)
- Suggested behavior script seed

Tables / Values:
- Reaction Table (2d6 adjusted): Low results hostile, mid uncertain/neutral, high friendly/helpful.
- CHA Adjustment: e.g., CHA 3 (-2) to 18 (+3).

Procedure:
1. Roll 2d6.
2. Apply CHA and situational modifiers.
3. Clamp into table range.
4. Map to category.
5. Output category and seed for behavior (used by Monster Behavior rule).

Edge Cases:
- Language barrier may cap maximum result to Neutral.
- Magical influence (Charm) overrides natural reaction; set Friendly/Helpful automatically.

Future Extensions:
- Multi-stage negotiation tracking.
