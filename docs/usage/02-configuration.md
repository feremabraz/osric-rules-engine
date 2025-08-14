# 2. Configuration

Pass a partial config object to the `Engine` constructor. Zod validation normalizes defaults.

```ts
const engine = new Engine({
  seed: 42,
  autoDiscover: true,
  features: { morale: true, weather: false },
});
await engine.start();
```

### Fields
- `seed` – deterministic randomness.
- `autoDiscover` – automatically import built-in command modules if none registered.
- `logging.level` – reserved for future logging integration.
- `features` – enable/disable optional subsystems (currently placeholders).
- `adapters` – planned extension points (RNG choice, persistence adapter, etc.).

Next: Working With Entities (3).
