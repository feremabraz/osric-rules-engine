# 05. Testing Strategy

## Objectives
Guarantee correctness, determinism, and structural integrity of the new engine and OSRIC domain behaviors.

## Test Layers
1. **Unit (Engine Core)** – hash, freeze, executor edge cases.
2. **DSL** – stage ordering, accumulator merging, duplicate key detection.
3. **Integration (Engine + Domain Store)** – single command flows.
4. **Domain Scenario** – battle rounds, XP progression, saving throws.
5. **Property / Determinism** – same seed + inputs => identical results & effects.

## Engine Unit Tests
| Test | Assertion |
|------|-----------|
| Param invalid | Engine failure PARAM_INVALID; no rule executed |
| Duplicate key | Engine failure DUPLICATE_RESULT_KEY |
| Integrity tamper | Manual mutation after rule merge triggers INTEGRITY_MUTATION |
| RNG determinism | Two runs with same seed identical outputs |
| Batch atomic rollback | After injected failure, store state unchanged |
| Batch non-atomic | Prior successes retained, later failures isolated |

## DSL Tests
- Multiple rules per stage produce expected merged accumulator keys.
- Stage ordering enforced (mutate cannot run before load if both included in chain context – ensured by build order).
- No manual dependency path available (attempting to call non-existent feature should not compile or runtime fail gracefully).
- Empty command (no stages used) is invalid (must have ≥1 rule). Test builder enforces.

## Domain Tests
- grantXp: success increments xp; failure when character not found.
- createCharacter: baseline entity creation; deterministic ID with seed.
- attackRoll: repeatable deterministic sequence using RNG.
- battle flow: startBattle -> attackRoll -> round progression; effect mirroring uniqueness.
- savingThrow: domain failure codes propagated.

## Simulation Tests
- simulate(grantXp) does not mutate store but returns expected diff (mutated id list empty or correct).
- simulate(attackRoll) same results as actual execution aside from persistent changes.

## Effect Mirroring Tests
- Single command emitting multiple identical effects per round only mirrors unique set.
- Batch atomic sequence with multiple commands mirrors once at batch end.

## Determinism Property Test
- Snapshot JSON: { seed, initialStore, sequenceOfCommands } -> outputs/effects.
- Re-run same script; deep equality.

## Performance Smoke
- Run N=1000 trivial commands; ensure no unbounded memory growth (effects buffer cleared, timers stable).

## Tooling Notes
- Use Vitest for unit/integration.
- Provide test helper to build ephemeral domain engine with seeded config.

## Coverage Goals
- 100% lines in core hash + executor + DSL builder.
- ≥90% statements in domain commands (balance readability vs exhaustive branches).

## Non-Goals (Explicit)
- Benchmark-level performance tuning (defer until functional parity reached).
- Mutation testing (can be considered later).

