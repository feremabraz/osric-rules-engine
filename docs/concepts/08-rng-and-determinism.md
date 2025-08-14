# 8. RNG & Determinism

Prior: Error & Result Model (7). Deterministic randomness enables reproducible tests and controlled simulations.

## RNG Implementation
A simple LCG (linear congruential generator) provides:
- `int(min, max)` inclusive
- `float()` in [0,1)
- `clone()` to snapshot state
- `getState()` / `setState()` (testing)

Seed is optional; absent seed means default internal seed.

## Progression Strategy
- The Engine advances RNG once per command invocation up front (via `rng.float()`) so even commands that *don't* use RNG still consume a value — ensuring consistent divergence when later commands are added or rules change.
- Every rule can access `ctx.rng` and draw additional numbers.

## Test Overrides
The test harness can override RNG state after engine construction but before command execution to guarantee expected outputs (e.g., forcing `durationRounds`).

Next: Effects & Event Tracing (9).
