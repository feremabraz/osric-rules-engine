# Execution Pipeline

`runCommand(descriptor, params, ctx)` performs:
1. Seed advance: RNG draws once to decouple sequences.
2. Stage loop in fixed order.
3. For each rule: invoke; on domain failure short-circuit (discard fragments & effects).
4. Merge returned fragment (if any) after deep-freezing; detect duplicate keys.
5. Integrity hash recomputed & verified after each merge.
6. On success: drain effects buffer.

Thrown exceptions become engine failures (`RULE_EXCEPTION`). Accumulator tamper after merge becomes `INTEGRITY_MUTATION`.

## Context
- `rng`: deterministic
- `effects`: buffer with `add(type, target, payload?)`
- `store`: provided by engine facade (domain-specific shape not known to core)

## Failures Recap
- Domain: expected business condition; no effects commit.
- Engine: structural / invariant breach; indicates authoring bug.
