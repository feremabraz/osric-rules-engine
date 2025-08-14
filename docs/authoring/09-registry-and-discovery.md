# 9. Registry & Auto-Discovery Internals

## Registration Flow
1. Author module imports `registerCommand` and calls it with the Command class.
2. Command constructor not used at registration; only static metadata captured.
3. `engine.start()` builds registry via `buildRegistry()`:
   - Validates unique command keys.
   - Assembles rule metadata and output schemas (every rule MUST provide a concrete `output` schema; plain `z.any()` is disallowed and enforced by tests).
   - Validates rule dependency references.
   - Merges rule output schemas (enforces unique keys).

## Auto-Discovery & Initialization Hooks
If `autoDiscover` is true and no commands are registered yet, `start()` dynamically imports built-in command modules. During the same startup phase a deterministic ID generator is wired to the engine RNG ensuring stable entity & battle IDs for a given seed (benefits snapshot tests). This pattern minimizes boilerplate in consumer apps while allowing explicit registration in tests.

## Topological Sort
`topoSortRules` performs DFS for each command on startup and again per execution (no caching yet). If performance becomes a concern, cache ordered arrays in the built meta. Metrics counters are minimal (executed / failed plus recent ring) and increment for every execute path (success or failure) including parameter parse failures.

End of authoring docs.
