# Drowning & Suffocation

Summary: Handles countdown and damage while a creature is deprived of air.

Inputs:
- Constitution score
- Activity level (strenuous, passive)
- Environment (underwater, vacuum, choking gas)

Outputs:
- Rounds of air remaining
- Onset of unconsciousness and death time markers

Tables / Values (Examples):
- Breath-holding: Rounds = CON (passive) or CON/2 (strenuous) before checks.
- After capacity: each round make CON check (d20 <= CON) or fall unconscious; death after 2 more failed rounds.

Procedure:
1. Initialize remaining air counter per formula.
2. Each round decrement; when 0 begin checks.
3. On failed check: unconscious; continue tracking; on second failure after unconsciousness: death.
4. If air restored: reset counters and remove unconsciousness if revived.

Edge Cases:
- Partial air (pockets) extends by fraction.
- Magical water breathing sets infinite air.

Future Extensions:
- Different gases with poisoning effects.
