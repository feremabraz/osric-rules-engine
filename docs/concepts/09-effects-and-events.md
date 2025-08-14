# 9. Effects & Events

Prior: RNG & Determinism (8). Effects capture intent to mutate or notify after successful rule execution.

## Effect Collector
`ctx.effects.add(type, target, payload?)` appends an effect descriptor. Examples:
- `inspired` buff applied to a character

Currently, effects are not applied to entities directly: on success they are recorded in `engine.events.effects` for external consumption / future dispatching.

## Event Trace
`engine.events.trace` gathers lightweight timing entries per command:
```
{ command, startedAt, durationMs, ok }
```
Useful in tests for performance assertions.

Future expansions may add per‑rule timings or structured logging based on `logging.level`.

Next: Testing Utilities (10).
