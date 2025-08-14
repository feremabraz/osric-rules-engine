# 7. Testing New Commands

## Pattern
1. Build test engine with only the command(s) under test.
2. Seed RNG for determinism.
3. Pre-create required entities.
4. Execute command and assert on result, store state, events, and effects.

```ts
const { engine, start } = testEngine({ seed: 123 })
  .register(MyCommand)
  .withCharacter('hero', 'human', 'fighter', { name: 'Hero' })
  .finalize();
const { ids } = await start();
const res = await engine.command.myCommand(ids.hero, { foo: 'bar' });
expect(res.ok).toBe(true);
expect(engine.events.effects).toHaveLength(1);
```

## Failure Path Assertions
Trigger domain failures intentionally (e.g. invalid id) and assert `res.kind === 'domain'` and correct code.

## Timing Assertions
Use `expectAllDurationsUnder(engine, 5)` to guard against performance regressions in micro-bench scenarios.

## Digest / Snapshot Tests
For broader regression coverage, construct a minimized digest:
```ts
const digest = {
  chars: engine.store.snapshot().characters.map(c => ({ id: c.id, lvl: c.level })),
  trace: engine.events.trace.map(e => ({ c: e.command, ok: e.ok })),
  metrics: engine.metricsSnapshot().commandsExecuted,
};
expect(JSON.stringify(digest, null, 2)).toMatchInlineSnapshot();
```
Keep the digest lean: omit HP if damage volatility is not pertinent, and avoid including timestamps.

## Metrics Simplification
Metrics expose counts + recent list only (no average duration). Use `events.trace` if you need per-command durations for assertions.

Next: Extending Entities (8).
