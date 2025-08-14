# Weather Effects

Summary: Applies environmental weather modifiers to movement, visibility, survival, and encounters.

Inputs:
- Weather state (temperature band, precipitation, wind strength)
- Terrain
- Travel mode (on foot, mounted, ship)

Outputs:
- Movement multiplier
- Visibility adjustments (feed to Visibility rule)
- Survival check difficulty modifiers

Tables / Values (Examples):
- Heavy rain: Movement *0.75 road / *0.5 wilderness; visibility -50%.
- Snow (deep): Movement *0.5; CON-based fatigue checks every 4 hours.
- High wind: Missile range penalties (-20% range) or disallow flight below STR threshold.
- Temperature extreme: Adds Survival check (heat/cold) every X hours.

Procedure:
1. Identify weather category.
2. Apply movement multiplier to base (post-encumbrance) movement.
3. Adjust visibility parameters.
4. Determine if survival checks required and set DC or target numbers.
5. Output modifications for downstream rules.

Edge Cases:
- Shelter (indoors) negates most effects.
- Magical environmental protection nullifies specific penalties.

Future Extensions:
- Seasonal weather generation tables.
