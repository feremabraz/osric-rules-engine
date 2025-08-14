# Weapon vs Armor Adjustments

Summary: Applies modifiers based on weapon category vs target armor category.

Inputs:
- Weapon category
- Target armor (armor type + shield presence or mapped natural armor)

Outputs:
- Attack modifier (or adjustment to needed target)
- Source note

Tables / Values:
- Matrix (weapon rows x armor columns) with modifiers -3 to +3 (populate from OSRIC canonical table at data load time).
- Armor columns: Leather, Studded/Scale, Chain, Chain+Shield, Plate, Plate+Shield, Unarmored.

Procedure:
1. Map defender gear/natural AC to armor column.
2. Lookup modifier from matrix.
3. Return modifier for inclusion in attack computation.

Edge Cases:
- Natural armor mapping heuristic stored separately (e.g., AC 5 -> Chain).
- Shield spell counts as shield for matrix.

Future Extensions:
- Exotic weapons expansion.
