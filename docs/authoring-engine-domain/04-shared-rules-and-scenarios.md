# Shared Rules & Scenarios

## Shared Rules
`shared-rules/characterExist.ts` demonstrates a reusable guard. Guidelines:
- Keep parameterized (id field, failure code override) for versatility.
- Return minimal empty fragment `{}`; do not couple to unrelated accumulator data.

## Adding Another Shared Rule
1. Implement function returning rule fn.
2. Replace duplicate inline logic across ≥2 commands.
3. Add/adjust tests confirming consistent failure codes.

## Deterministic Scenarios
`scenarios/determinism.ts` aggregates a fixed command sequence and returns JSON snapshot of outcomes/effects/finalState.

Use scenarios to:
- Assert cross-command invariants.
- Prevent accidental RNG drift.
- Provide integration examples for new domain consumers.

## Extending Scenarios
Add new scenario file or extend existing sequence; update tests with selective expectations (avoid overfitting exact object order for large expansions—focus on critical fields).
