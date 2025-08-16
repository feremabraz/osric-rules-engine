# 12. Structural Contracts: Rule Graph & Command Digest

The engine exposes only two stable structural surfaces intended as regression guards:

1. Rule Graph Snapshot – The dependency & category ordering of rules inside each command.
2. Command Digest – A short hash summarizing the structure (rule names, categories, output keys).

Everything else about execution is an implementation detail. These structural contracts let you detect accidental drift without freezing day‑to‑day iteration.

## 1. Rule Graph Snapshot

Each command assembles a directed acyclic graph (DAG) of rules. Edges come from explicit `after` dependencies plus the implicit category ordering (validate → load → calc → mutate → emit).

Use `explainRuleGraph(commandKey)` after the engine has started to obtain:
```
{
  command: "attackRoll",
  rules: [
    { name: "ValidateParticipants", category: "validate" },
    { name: "LoadWeaponFacts", category: "load" },
    { name: "ComputeAttackModifiers", category: "calc" },
    { name: "RollD20", category: "calc" },
    { name: "ResolveCritical", category: "mutate" },
    { name: "EmitEffects", category: "emit" }
  ],
  edges: [ ["LoadWeaponFacts","ValidateParticipants"], ... ],
  topoOrder: ["ValidateParticipants", "LoadWeaponFacts", ...]
}
```
Snapshot a handful of core procedural commands (attack, damage, turn advance) in tests and review diffs intentionally. Avoid snapshotting every trivial command to keep noise low.

### When Diffs Matter
- Reordering a rule earlier/later can change semantics (e.g., applying crit before the roll). A diff forces an explicit decision.
- Introducing a rule in the wrong category can violate ordering (an error will surface before execution).

### When Diffs Are Safe
- Adding a new rule in an expected category position (e.g., a new calc modifier) – accept the snapshot update if intentional.

## 2. Command Digest

`getCommandDigests()` returns an array: `[{ command, digest }]`. The digest hashes for each rule: `ruleName|category|sortedOutputKeysCSV` (sorted by rule name first). This is lightweight and resilient:

- Adding a new output key or rule changes the digest.
- Pure refactors that do not rename rules or alter output schemas leave the digest stable.

Use a small approval test to assert the digests for critical commands, or serialize them alongside rule graph snapshots.

## Relationship Between the Two
- Rule Graph gives you ordering & dependency shape (human readable).
- Digest gives you a compact integrity checksum.

You usually need both when auditing a breaking procedural change.

## 3. Simulate vs Execute

`simulate(engine, command, params)` runs the same pipeline in a transaction and reports an entity diff plus diagnostics without committing changes. Use it to:
- Inspect accumulator shape & effects safely.
- Validate that a new rule does not mutate unexpected entities.

Diagnostics on success include timing, entity diff counts, RNG draws, and effect emission counts. On failure they include `failedRule` to pinpoint the stop.

## 4. Author Workflow Checklist (Structural Focus)
1. Define / modify rules; assign meaningful `ruleName` and optional `after` dependencies.
2. Start engine; call `explainRuleGraph` to inspect ordering if you added dependencies or new categories.
3. Run simulate to sanity‑check diff & diagnostics.
4. Update / approve snapshots & digest tests only when the procedural change is intentional.

## 5. Non‑Goals
- The engine does not promise stable internal accumulator freezing mechanics beyond the observable invariant: non-`draft` keys are deeply frozen; `draft` is mutable until emission.
- No guarantee about internal RNG implementation; only deterministic seeding semantics are stable.

## 6. Migration Notes
Functional result helpers (`mapResult`, `tapResult`, `chain`) were removed. Inline these patterns using `isOk` guards where needed.

## 7. Future Extensions (Out of Scope for Contract)
- Parallel rule execution.
- Digest including param schema hash (could be added if schema churn is a concern).

Keep structural contracts narrow; resist adding transient implementation details.
