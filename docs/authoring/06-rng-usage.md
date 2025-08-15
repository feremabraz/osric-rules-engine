# 6. RNG Usage

## Accessing RNG
Rules receive `ctx.rng` when the engine was seeded. Use it for deterministic calculations:
```ts
const roll = ctx.rng.int(1, 6);
```

## Determinism Strategy
Because the engine advances RNG once per command baseline, adding a new rule that does not itself use RNG will not desynchronize existing probabilistic behaviors. Entity ID generation is also tied into the same seeded RNG during `start()` so snapshots remain stable.

Rules that DO use RNG should keep randomness localized and return the rolled value via their output schema so later rules can reference it deterministically (`ctx.acc.rollValue`). Never call RNG in two different rules for the same logical roll—compute once, pass through the accumulator.

## State Control (Testing)
The test harness can set RNG state just before start. Avoid manual `setState` calls in production code.

### Snapshot-Friendly Tips
- Omit volatile numeric results (raw damage rolls) from snapshot digests unless explicitly under test.
- Prefer asserting derived invariants (e.g. character leveled to 2) over raw intermediate rolls.

Next: Testing New Commands (7).
