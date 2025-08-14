# Magic Item Charges & Usage

Summary: Tracking, decrementing, and recharging item charges (wands, staves, rods, some miscellaneous items).

Inputs:
- Item type & current charges
- Usage attempt (ability invoked)
- Recharge attempt (if allowed)

Outputs:
- New charge count
- Failure or depletion flags

Tables / Values:
- Wand typical initial charges: 50.
- Staff: 20–50 (varies by item).
- Recharge success chance: low (e.g., 20%) and risk of item destruction (e.g., failure 10% destroys) – placeholder, verify OSRIC.

Procedure:
1. On use: if charges >0 decrement by cost (some abilities cost multiple charges).
2. If charges reach 0 mark depleted (inert) until potential recharge.
3. Recharge attempt: validate allowed; roll success; on success add charges (1d6+1 or fixed); on catastrophic failure item destroyed.
4. Output new state.

Edge Cases:
- Over-consumption (attempt use at 0): fails; no negative charges.
- Partial multi-charge ability when insufficient charges: disallow or consume remaining with reduced effect (spec: disallow).

Future Extensions:
- Charge sharing pools among linked items.
