# 6. RNG Usage

## Accessing RNG
Rules receive `ctx.rng` when the engine was seeded. Use it for deterministic calculations:
```ts
const roll = ctx.rng.int(1, 6);
```

## Determinism Strategy
Because the engine advances RNG once per command baseline, adding a new rule that does not itself use RNG will not desynchronize existing probabilistic behaviors.

## State Control (Testing)
The test harness can set RNG state just before start. Avoid manual `setState` calls in production code.

Next: Testing New Commands (7).
