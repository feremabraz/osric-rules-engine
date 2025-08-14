# Monster Behavior

Summary: Provides decision framework for monster/NPC actions each round factoring morale, goals, environment.

Inputs:
- Monster instincts (aggressive, territorial, cautious)
- Current morale state
- Tactical situation (HP %, ally status, enemy numbers, terrain)
- Special abilities available

Outputs:
- Chosen action category (attack melee, attack ranged, use ability, withdraw, pursue, negotiate, flee)
- Target selection rationale

Procedure:
1. Evaluate immediate triggers (morale failure → flee attempt, command from controller, charm effect).
2. Score potential actions using weighted criteria (threat proximity, effectiveness, survival).
3. Select highest scoring action; tie broken by instinct priority.
4. Choose target: lowest AC vs highest damage threat vs random depending on monster type behavior pattern.
5. Output action.

Edge Cases:
- Mindless creatures skip scoring; default to nearest enemy attack.
- Confused/charmed override selection rules.

Future Extensions:
- Learning behavior adaptation over rounds.
