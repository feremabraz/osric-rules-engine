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

Next: Extending Entities (8).
