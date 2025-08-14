# Encumbrance

Summary: Tracks carried weight to determine movement rate and associated penalties.

Inputs:
- Carried items (weight each)
- Character strength (for capacity thresholds)
- Armor worn

Outputs:
- Total carried weight
- Encumbrance tier (Light, Moderate, Heavy, Severe, Max)
- Movement rate adjustment

Tables / Values (Example placeholders; confirm OSRIC):
- Light: <= 1/3 STR * 10 coins
- Moderate: <= 2/3 STR * 10
- Heavy: <= STR * 10
- Severe: <= 1.5 * STR * 10
- Max: <= 2 * STR * 10 (immobile beyond)
- Movement modifiers: Light 100%, Moderate 75%, Heavy 50%, Severe 33%, Max 0% (dragging)

Procedure:
1. Sum weights (armor + gear + treasure) to total.
2. Compare total to threshold table deriving tier.
3. Set movement multiplier.
4. Output tier & multiplier.

Edge Cases:
- Temporary effects increasing STR recalc thresholds.
- Bulk items (large furniture) impose fixed tier regardless of weight.

Future Extensions:
- Detailed coin weight scaling and container capacity.
