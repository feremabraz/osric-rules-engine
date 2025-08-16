# 9. Registry & Auto-Discovery

## Registration Flow
1. Internal command modules invoke an internal `registerCommand` during module evaluation (no longer a public API).
2. Command constructor not used at registration; only static metadata captured.
3. `engine.start()` builds registry via `buildRegistry()`:
   - Validates unique command keys.
   - Assembles rule metadata and output schemas (every rule MUST provide a concrete `output` schema; plain `z.any()` is disallowed and enforced by tests).
   - Validates rule dependency references.
   - Merges rule output schemas (enforces unique keys).
   - Ensures each rule's `apply` internally casts `ctx` to `RuleCtx<Params, Acc>`; public signature stays `unknown` for structural compatibility.

## Auto-Discovery (Ergonomics vs Explicit Control)
Auto discovery is an opt-in ergonomic that loads a curated list of built-in command modules automatically when:
1. `engine` is constructed with `autoDiscover: true` (default), and
2. No commands have been registered yet (so explicit registration always takes precedence).

### Why It Exists
- Removes boilerplate for simple game sessions / prototypes.
- Ensures built-in commands remain available with a single Engine instantiation.
- Keeps deterministic seeding behavior (importing does not execute commands; only registers metadata).

### When to Disable
Set `autoDiscover: false` in `Engine` config when you want to:
- Trim bundle size (tree-shake unused built-ins).
- Enforce an explicit whitelist of commands for a scenario/editor.
- Replace stock commands with custom variants sharing keys (prevent accidental shadowing).

External extension (without forking) is intentionally restricted to preserve structural guarantees. Local experimentation inside the repo may use the internal utilities, but treat them as unstable.

### Interaction With Tests
Most tests explicitly call the internal `resetRegisteredCommands()` and then register only the commands they need; this produces minimal, deterministic registries and faster startup. Auto discovery stays silent in those cases because the registry is already non-empty when `start()` runs.

### Future Considerations
If command set grows large, code generation (static manifest) can replace the handcrafted list for better tree shaking. Public contract deliberately excludes any API to introspect undiscovered modules; only registered commands form the structural surface.

## Initialization Hooks
During startup a deterministic ID generator is wired to the engine RNG ensuring stable entity & battle IDs for a given seed (benefits snapshot tests). Additional lifecycle hooks (metrics reset, future plugin hooks) may be added without expanding the public surface.

## Topological Sort
`topoSortRules` performs DFS for each command on startup and again per execution (no caching yet). If performance becomes a concern, cache ordered arrays in the built meta. Metrics counters are minimal (executed / failed plus recent ring) and increment for every execute path (success or failure) including parameter parse failures.

End of authoring docs.
