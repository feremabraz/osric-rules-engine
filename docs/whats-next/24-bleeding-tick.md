# Bleeding Tick

Summary: Applies periodic hit point loss to entities with Bleeding status each round until death threshold.

Inputs:
- Entities list with statuses & current HP
- Round tick event

Outputs:
- Updated HP values
- Newly dead entities list

Tables / Values:
- Bleed rate: 1 HP per round.
- Death threshold: -10 HP → Dead status applied, remove Bleeding.

Procedure:
1. Iterate entities with Bleeding and not Dead.
2. Subtract 1 HP (not below -10 via this rule).
3. If HP <= -10 set Dead status.
4. Emit list of affected entities.

Edge Cases:
- Healing during same round after tick may revive above -10 but Dead status persists (requires resurrection) – enforce Dead permanence.
- Stabilized entities (future rule) excluded from bleed.

Future Extensions:
- Variable bleed rates for severe wounds.
