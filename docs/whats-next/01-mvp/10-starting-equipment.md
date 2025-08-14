# Starting Equipment

Summary: Determines initial purchasing phase and default kits for first-level characters using starting gold.

Inputs:
- Starting gold (gp)
- Class (for recommended kit templates)
- Player selections of items with costs & weights

Outputs:
- Purchased item list (name, quantity, total cost, total weight)
- Remaining gold
- Encumbrance contribution (sum weight)

Tables / Values:
- Equipment price list (reference external data table).
- Suggested Kits (examples):
  - Fighter Basic: Longsword, Shield, Chainmail, Backpack, Rations (1wk), Waterskin, 50' Rope, Bedroll.
  - Magic-User Basic: Dagger, Spellbook, Robes, Backpack, Rations, Waterskin, 10 Candles.
  - Thief Basic: Short Sword, Leather Armor, Thieves' Tools, Backpack, Rations, Rope.

Procedure:
1. Present suggested kit; player may accept baseline then modify.
2. Validate each selected item exists in price list; compute extended cost = unit cost * quantity.
3. Sum cost; ensure <= starting gold.
4. Sum weight; produce encumbrance tally (hand off to Encumbrance rule later).
5. Output list + remaining gold.

Edge Cases:
- Duplicate items aggregated by quantity.
- Fractional cost (e.g., silver pieces) convert to gp with consistent rounding (down).
- Overweight single item without sufficient carrying capacity flagged for later (not rejected here).

Future Extensions:
- Random starting packages variant.
