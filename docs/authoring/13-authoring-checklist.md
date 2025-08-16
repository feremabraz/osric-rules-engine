# 13. Authoring Checklist & Design Guarantees

A concise flow for adding or modifying a command while preserving engine invariants.

## Checklist
1. Define Params Schema
   - Use `z.object({...})`; avoid `z.any()`.
2. Author / Update Rules
   - Each rule gets a unique `ruleName`.
   - Provide an `output` schema (no silent structural drift).
   - Declare `after` only for true data dependencies (keep graph minimal).
   - Categorize implicitly by naming (validate/load/calc/mutate/emit); override with static `category` if needed.
3. Register Command
   - `registerCommand(MyCommand)` (tests) or rely on auto discovery (runtime) if enabled.
4. Start Engine & Inspect Structure
   - `await engine.start()`
   - `explainRuleGraph('myCommand')` for human ordering.
   - `getCommandDigests()` for structural hash.
5. Simulate Before Committing
   - `await simulate(engine, 'myCommand', params)` to view diff & diagnostics without state mutation.
6. Write / Update Tests
   - Happy path (ok result + expected keys).
   - Domain failure path using `ctx.fail`.
   - Structural guard (e.g. duplicate output key) if you touched rule outputs.
7. Approve Structural Snapshots (Selective)
   - Only snapshot core procedural commands to avoid noise.
8. Enforce Immutability Expectations
   - Non-`draft` outputs are deeply frozen; `draft` stays mutable for staged assembly.
9. Remove Deprecated Helpers
   - Inline result mapping/tap logic using `isOk` (functional helpers removed).
10. Update Docs (If Public Behavior Changes)
    - Public API additions require whitelist test update.

## Design Guarantees
- Acyclic Rule Graph: Cycles rejected at `engine.start()`.
- Deterministic RNG: Seeded; command invocation advances RNG once even if no randomness consumed internally.
- Atomic Command: Either all rule outputs & effects applied or none (failures short‑circuit).
- Batch Atomic: `batchAtomic` rolls back all on first failure.
- Immutable Accumulator: Deep frozen per key except `draft` escape hatch.
- Structural Stability: `getCommandDigests` only shifts on intentional rule/output changes.
- Diagnostics Clarity: Domain & structural failures populate `diagnostics.failedRule`.

## Anti-Patterns
- Overusing `after` to force ordering when category suffices.
- Returning broad `z.any()` schemas (loses structural change visibility).
- Mutating frozen accumulator entries (will silently do nothing or fail integrity hash if tampered externally).

## Quick Reference
```ts
import { defineCommand, simulate, isOk } from 'osric';

class Validate extends class {} { static ruleName = 'Validate'; static output = z.object({ base: z.number() }); apply(){ return { base: 1 }; } }
class Compute extends class {} { static ruleName = 'Compute'; static after = ['Validate']; static output = z.object({ total: z.number() }); apply(ctx:any){ return { total: (ctx.acc as any).base + 1 }; } }

export const MyCmd = defineCommand({ key: 'myCmd', params: z.object({}), rules: [Validate, Compute] });

registerCommand(MyCmd as any);
await engine.start();
const sim = await simulate(engine, 'myCmd', {});
if (isOk(sim.result)) console.log(sim.result.data.total);
```

## Future Enhancements (Not Guaranteed Yet)
- Parallel rule execution.
- Digest extension to include param schema hash.
- Pluggable persistence adapter contract stabilization.
