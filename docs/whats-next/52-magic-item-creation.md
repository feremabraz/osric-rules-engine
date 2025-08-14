# Magic Item Creation

Summary: Crafting permanent magic items via time, gold, rare components, and spells.

Inputs:
- Desired item template (type, bonus, properties)
- Caster level, spells known
- Workshop/lab quality
- Rare components inventory

Outputs:
- Creation progress %
- Time & cost spent
- Item produced or failure/mishap outcome

Tables / Values (Examples):
- Base time: Weeks = Bonus^2 (weapon/armor) or fixed per item type.
- Base cost: 1000 gp * Bonus^2 + component costs.
- Failure chance per phase if missing optimal lab: 10%.

Procedure:
1. Validate prerequisites (level threshold, required spells/components).
2. Deduct initial component cost.
3. For each phase (week): spend time & incremental cost; roll mishap if conditions suboptimal.
4. On final phase, finalize item: set magical properties and charges (if any).
5. On failure: partial item (non-magical) or cursed variant (roll on table) depending on severity.

Edge Cases:
- Multiple creators cooperating: reduce time by factor (e.g., / number of qualified casters, min 50%).
- Interruptions pause progression.

Future Extensions:
- Alignment-bound item attunement steps.
