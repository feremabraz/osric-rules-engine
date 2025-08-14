# 7. Observability

## Timing Trace
`engine.events.trace` collects lightweight timing per command:
```ts
for (const ev of engine.events.trace) {
  console.log(ev.command, ev.durationMs, ev.ok);
}
```

## Effects Log
`engine.events.effects` contains lists of effects committed by each successful command.

## Custom Instrumentation
Wrap command calls to add logging, or inspect the registry via `engine.getRegistry()` for metadata-driven dashboards.

Next: Advanced Patterns (8).
