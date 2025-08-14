# Foraging & Hunting

Summary: Determines success at locating food and water in wilderness.

Inputs:
- Terrain type
- Time spent (hours)
- Skill/proficiency or WIS modifier
- Season/weather

Outputs:
- Food units gathered (rations equivalent)
- Water units gathered

Tables / Values (Examples):
- Base hourly success chance per terrain (Plains 40%, Forest 50%, Desert 10%, Mountain 30%, Swamp 40%).
- Modifier: +5% per +1 WIS mod; -10% severe weather; +15% abundant season.
- Food units on success: 1d4 per hour; water similar but desert 1d2.

Procedure:
1. For each hour allocated: roll percentile vs success chance.
2. On success add resource units (roll appropriate dice).
3. Sum totals; cap by carrying capacity unless containers available.
4. Output totals.

Edge Cases:
- Multiple foragers reduce chance if over-harvesting same area (apply -5% per extra after first).
- Depleted area reduces base chance by half until moved.

Future Extensions:
- Rare resource findings (herbs) table.
