# Attack Roll Resolution

Summary: Resolves a melee or missile attack to determine hit or miss and critical effects.

Inputs:
- Attacker: class, level/HD, THAC0 or attack matrix row, ability mods (STR melee, DEX missile), status effects, proficiency/specialization
- Defender: Armor Class (armor, shield, DEX, magic), size, cover/concealment
- Weapon data: type, speed, damage dice, vs-armor modifiers, range
- Situational modifiers: charging, flanking, rear, invisibility, prone target, illumination
- Multi-attack index

Outputs:
- d20 roll (natural + modified)
- Needed target number (descending) or final attack total (ascending)
- Outcome: miss, hit, critical
- Modifier breakdown

Tables / Values:
- Attack matrix / THAC0 progression by class & level.
- Cover: +2/+4/+7 AC (half/three-quarter/near-total cover) (confirm OSRIC).
- Invisibility: attacker +4, defender loses DEX.
- Rear attack: +2 bonus.

Procedure:
1. Determine base needed roll from matrix vs defender AC.
2. Accumulate modifiers (STR/DEX, specialization, situational, weapon vs armor).
3. Roll d20; note natural.
4. Apply concealment/miss chance (if fails, auto miss).
5. Check natural 20 (auto hit) / natural 1 (auto miss) baseline.
6. Determine hit; if hit pass to Damage Calculation.
7. Output structured result.

Edge Cases:
- Needed roll <=1 means all but natural 1 hit.
- Simultaneous resolution for tied initiative can cause mutual kills.

Future Extensions:
- Critical confirmation variant.
