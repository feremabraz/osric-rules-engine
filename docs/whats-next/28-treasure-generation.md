# Treasure Generation

Summary: Generates treasure hoards and individual drops based on encounter level / monster type.

Inputs:
- Encounter context: dungeon level, monster type(s), treasure type codes
- Party size (for optional scaling)

Outputs:
- Treasure contents list: coins by denomination, gems (count + values), jewelry, magic items (slots for later item generation), special items, mundane goods
- Total GP value estimate

Tables / Values:
- Treasure Type Tables (A–Z or OSRIC-equivalent) with % chances and quantity dice for each category (coins, gems, jewelry, magic).
- Gem/Jewelry value tables: roll d6/d8 for base, potential multipliers.
- Magic item category table weights (armor, weapons, potions, scrolls, rings, rods/staves/wands, miscellaneous) leading to sub-tables.

Procedure:
1. Identify treasure type(s) from monsters or keyed area.
2. For each category in treasure type: roll % to determine presence; if present roll quantity dice.
3. For gems/jewelry: roll count then for each determine value (and potential special qualities).
4. For magic item slots: defer to Magic Item Generation spec to populate details.
5. Sum total GP equivalent.
6. Output structured list.

Edge Cases:
- Multiple treasure types: process each and merge results.
- Empty result (all % failed) allowed.

Future Extensions:
- Hoard theming (elemental, undead) adjusting magic item category weights.
