# Character Initialization

Summary: Finalizes a new character after ability generation, racial adjustments, class validation, exceptional strength, and starting equipment allocation.

Inputs:
- Adjusted abilities (with exceptional strength if applicable)
- Race, Class
- Level (initial, usually 1)
- Starting gold (rolled)
- Chosen starting equipment set purchases

Outputs:
- Character entity draft with: abilities, hit points, armor class, attack matrix reference, saving throw table reference, inventory, encumbrance baseline, movement rate, languages, initial status effects (none), XP = 0.

Tables / Values:
- Starting HP: Roll class hit die once; apply CON modifier (minimum 1 HP after modifier).
- Movement base: Race + encumbrance tier; e.g., Human 12" base, Dwarf 9" base (spec placeholder — confirm values). Convert to internal units (feet per round etc.).
- Languages: Common + racial; INT may grant bonus languages (see INT table spec future file).
- Starting gold: Class-based dice (e.g., Fighter 5d4×10 gp, Magic-User 2d4×10 gp; placeholders) rolled prior to purchases.

Procedure:
1. Receive validated inputs from prior rules.
2. Roll starting HP; apply CON modifier; ensure minimum 1.
3. Determine base movement from race; compute initial encumbrance tier (empty inventory) = light.
4. Assign languages.
5. Initialize inventory with purchased items from Starting Equipment spec; set carried weight.
6. Compute derived AC (armor + DEX adjustment) and attack matrix reference index.
7. Initialize saving throw table reference.
8. Assemble character draft object, mark immutable (until stored).

Edge Cases:
- Multiple classes at start (rare): HP = average of hit dice (round down) or highest? (Clarify OSRIC; placeholder: roll each, average, min 1).
- Zero starting gold after purchases: allowed.

Future Extensions:
- Background packages modifying starting equipment/languages.
