# 2. Configuration & Startup

Prior: Overview (1). Now we focus on how an Engine instance is configured and started.

## Configuration Schema
Configuration is validated immediately via `EngineConfigSchema` (Zod). This ensures early, centralized failure.

Relevant fields (current implementation):
- `seed?: number` – optional deterministic RNG seed.
- `logging.level` – one of `trace|debug|info|warn|error` (future use; presently not wired to a logger).
- `features.morale`, `features.weather` – feature flags (placeholders for conditional logic).
- `adapters.rng` – enum of planned RNG backends (only `default` implemented yet).
- `adapters.persistence` – reserved for future persistence adapter.
- `autoDiscover` – boolean (default true). When true and no commands were manually registered yet, startup will import the known command modules to self‑register.

## Startup Steps
1. `new Engine(rawConfig)` – parses config (`EngineConfigSchema.parse`).
2. `engine.start()`:
   - If `autoDiscover` and registry empty: dynamic imports of bundled command modules.
   - Build registry (enumerates registered command classes, validates uniqueness & rule schemas).
   - Validate each command's rule dependency graph (topological sort; throws on cycles / missing deps).
   - Construct command proxy (`engine.command.<key>` methods) for ergonomic invocation.

`start()` is idempotent: subsequent calls are no‑ops.

## When To Start
Call `await engine.start()` once during app initialization (before executing commands). Test helpers (see later chapters) wrap this for convenience.

Next: Entities & Draft Preparation (3).
