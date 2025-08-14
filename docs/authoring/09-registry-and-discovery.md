# 9. Registry & Auto-Discovery Internals

## Registration Flow
1. Author module imports `registerCommand` and calls it with the Command class.
2. Command constructor not used at registration; only static metadata captured.
3. `engine.start()` builds registry via `buildRegistry()`:
   - Validates unique command keys.
   - Assembles rule metadata and output schemas.
   - Validates rule dependency references.
   - Merges rule output schemas (enforces unique keys).

## Auto-Discovery
If `autoDiscover` is true and no commands are registered yet, `start()` dynamically imports built-in command modules. This pattern minimizes boilerplate in consumer apps while allowing explicit registration in tests.

## Topological Sort
`topoSortRules` performs DFS for each command on startup and again per execution (no caching yet). If performance becomes a concern, cache ordered arrays in the built meta.

End of authoring track.
