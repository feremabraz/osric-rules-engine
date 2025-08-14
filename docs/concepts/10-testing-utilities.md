# 10. Testing Utilities

Prior: Effects & Events (9). Dedicated helpers streamline deterministic, isolated tests.

## testEngine Builder
```ts
const { engine, start } = testEngine({ seed: 42 })
  .register(GainExperienceCommand)
  .withCharacter('hero', 'human', 'fighter', { name: 'Hero' })
  .finalize();
await start();
```

### Features
- Registers only the specified commands (bypasses auto discovery).
- Seeds RNG.
- Pre-populates named character drafts and persists them on start (returns alias → id map).
- Optional RNG override hook for advanced deterministic scenarios.

## Snapshot / Timing Helpers
- `filterEvents(engine, command)` – subset of trace entries.
- `expectAllDurationsUnder(engine, ms)` – assertion helper throwing on slow events.
- `normalizeSnapshot(entity)` – zeroes time fields to ease deep equality comparisons.

## When To Use
Use these utilities in integration and rule tests rather than spinning a full engine with unrelated commands or manual entity creation.

Next: Putting It Together (11).
