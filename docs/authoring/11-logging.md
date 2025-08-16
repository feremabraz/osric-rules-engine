# Logging

The engine exposes an optional pluggable logger so that command and rule execution can be observed without baking in a concrete logging dependency. If you do nothing, the engine uses a no-op implementation and produces no output.

## Goals
- Zero required dependency (no implicit console noise)
- Cheap to disable (undefined logger => no work beyond a couple of branches)
- Compatible with structured loggers (e.g. pino) including child/bound loggers
- Stable event vocabulary so external tooling (debug viewers, metrics) can key off it later

## Logger Interface
```ts
export interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  trace?: (...args: unknown[]) => void; // optional; not currently emitted
  child?: (bindings: Record<string, unknown>) => Logger; // optional
}
```
All methods accept variadic arguments to accommodate both printf- and object-style structured logging.

A `NoopLogger` constant is provided internally; you normally will not import it.

## Engine Configuration
Provide a `logger` property when constructing the engine:
```ts
import pino from 'pino';
import { Engine } from 'osric';

const root = pino({ level: 'debug' });

const engine = new Engine({
  // ...normal config (entities, commands, rules, etc.)
  logger: root,
});
```
The logger is not validated by the Zod config schema; it is simply read if present.

## Child Loggers
If the supplied logger has a `child` method (as pino does) the engine will create scoped children:
- Command scope: `child({ command: CommandName, correlationId })`
- Rule scope: `child({ rule: RuleName })`

This produces nested contextual bindings in structured log outputs.

If `child` is absent the engine reuses the provided logger for all emissions.

## Emitted Events
Current lifecycle emissions (all at `debug` unless noted):
- `command.start`, command name, params snapshot
- `command.success`, duration ms, result summary (omits large data)
- `command.error` (level = `error`), duration ms, error object
- `rule.start`, rule name
- `rule.done`, rule name, duration ms

Exact argument shapes are intentionally loose (simple first-position event tag + supplemental objects) to avoid a premature contract freeze. Treat the first string as the stable event key.

Example with pino (pretty printed for clarity):
```jsonc
{"level":"debug","msg":"command.start","command":"gainExperience"}
{"level":"debug","msg":"rule.start","rule":"GainExperienceRule"}
{"level":"debug","msg":"rule.done","rule":"GainExperienceRule","ms":0}
{"level":"debug","msg":"command.success","command":"gainExperience","ms":1}
```

## Pino Integration Notes
Pino already matches the interface (debug/info/warn/error + child). You can add redaction or transport options freely. If you want pretty output in dev:
```ts
const logger = pino({ transport: { target: 'pino-pretty', options: { colorize: true } } });
```
Supply that logger in config; nothing else required.

## Custom Logger Example
```ts
const logger: Logger = {
  debug: (...a) => console.debug(...a),
  info: (...a) => console.info(...a),
  warn: (...a) => console.warn(...a),
  error: (...a) => console.error(...a),
  child(bindings) {
    return {
      debug: (...a) => console.debug(...a, bindings),
      info: (...a) => console.info(...a, bindings),
      warn: (...a) => console.warn(...a, bindings),
      error: (...a) => console.error(...a, bindings),
      child: this.child, // simple reuse
    };
  },
};
```

## Non-Goals / Out of Scope
The initial implementation deliberately excludes:
- Correlation / request IDs generation (you can add in your own root logger)
- Structured result truncation policies
- Timing histograms / metrics export
- Log level customization per event type
- Rule-level filtering / inclusion lists
- Colorized console formatting (delegate to your logger)
- Async buffering / batching
- Integration with tracing systems (OpenTelemetry spans, etc.)

These can be layered on later without breaking the basic contract.

### Failure Context
On any failure the logger emits `command.error`; inspect the execution result (domain vs structural) and diagnostics `failedRule` to pinpoint the stopping rule.

