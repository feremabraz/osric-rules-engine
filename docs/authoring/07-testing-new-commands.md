# 7. Testing New Commands

## Pattern
1. Build test engine with only the command(s) under test.
2. Seed RNG for determinism.
3. Pre-create required entities (use `baselineCharacter` where possible).
4. (Optional) Run `simulate` first to inspect accumulator / diff / diagnostics.
5. Execute command via `engine.command.<key>` *or* wrapped in a `batch` if orchestrating.
6. Assert using result helpers (`isOk`, `assertOk`) & effect helpers (`getEffects`, `effectStats`).

```ts
const { engine } = testEngine({ seed: 123 })
  .register(MyCommand)
  .finalize();
const heroId = await baselineCharacter(engine, { name: 'Hero' });
const res = await engine.command.myCommand(heroId, { foo: 'bar' });
expect(res.ok).toBe(true);
expect(effectStats(engine).total).toBe(1);
```

## Failure Path Assertions
Trigger domain failures intentionally (e.g. invalid id) and assert `res.kind === 'domain'` and correct code.

When asserting IDs use branded schemas instead of manual string casting:
```ts
import { characterIdSchema } from '@osric';
const heroId = characterIdSchema.parse(res.value.newCharacterId);
```

## Timing Assertions
Use `expectAllDurationsUnder(engine, 5)` to guard against performance regressions in micro-bench scenarios.

## Digest / Snapshot Tests
For broader regression coverage, construct a minimized digest (omit volatile fields like HP if not needed). Use rule graph snapshots (`explainRuleGraph`) for structural assurances distinct from state digests. Functional result helpers (`mapResult`, `tapResult`, etc.) were removed—inline simple branching with `isOk`.
```ts
const digest = {
  chars: snapshotWorld(engine).characters.map(c => ({ id: c.id, lvl: c.level })),
  trace: engine.events.trace.map(e => ({ c: e.command, ok: e.ok })),
  metrics: engine.metricsSnapshot().commandsExecuted,
};
expect(digest).toMatchInlineSnapshot();
```

## Metrics Simplification
Metrics expose counts + recent list only. Use `events.trace` for per-command durations; prefer effect helpers for effect assertions.

Next: Extending Entities (8).
