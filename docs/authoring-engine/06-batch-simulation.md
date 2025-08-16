# Batch & Simulation

## Batch
`engine.batch(commands, { atomic?: boolean })`
- Atomic: first failure rolls back all prior mutations & effects; `ok=false` when any failure.
- Non-Atomic: successes commit; failures collected; `ok` true if ≥1 success.

Result shape: `{ ok, results: CommandOutcome[], effects, failed? }`.

## Simulation
`engine.simulate(key, params)` returns `{ result, diff, effects }` where diff lists created/mutated/deleted entities (array items with `id`). No state or RNG change persists.
