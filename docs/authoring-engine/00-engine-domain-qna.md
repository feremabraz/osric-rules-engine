# Engine & Domain Q&A

A concise, up‑to‑date question & answer reference for the present architecture. Purely describes what exists.

---
### What overarching pattern does the system use?
A command + fixed stage pipeline pattern. Each user intent is a command identified by a string key and realized as an ordered collection of stage rule functions.

### What is a fixed stage pipeline?
A deterministic five‑stage sequence executed in this exact order: validate → load → calc → mutate → emit. Each stage may have zero or more rule functions. At least one rule overall is required.

### What is a command?
A registered key plus a chain of stage rule functions defining how to validate input, fetch data, compute values, mutate state, and emit effects. It produces a structured result: success (with merged data + effects) or failure (domain or engine).

### What is a rule function?
A plain function `(acc, params, ctx) => fragment | failure | void` attached to a specific stage. It returns either:
- `undefined` (no fragment)
- An object fragment with NEW keys for the accumulator
- A domain failure signal (returned via `domainFail`)
Throwing or returning overlapping keys triggers an engine failure.

### How are fragments merged?
Shallow merge into a single accumulator object. Every returned fragment’s keys must be unique within the command execution. Duplicate key → engine failure `DUPLICATE_RESULT_KEY`.

### Are fragments mutable?
No. Each merged fragment (and nested values) is deep‑frozen immediately, preventing later mutation and ensuring deterministic integrity checks.

### What is the accumulator?
The evolving immutable object assembled from all prior successful fragments. It becomes the `data` field of a successful command result.

### What kinds of failures exist?
- Domain failure: Expected business constraint violation (e.g., missing character). Halts execution; no effects commit.
- Engine failure: Structural or invariant breach (duplicate key, rule exception, integrity mutation). Indicates an authoring or system defect.

### How are parameters validated?
Via rule functions in the validate stage. If a validate rule returns a domain failure, the pipeline stops before later stages.

### What is the effect system?
Rule functions can enqueue side‑effects using an effects buffer (`ctx.effects.add`). Effects accumulate during execution and are only committed (returned on success) if the command (or an atomic batch) succeeds.

### How does randomness stay deterministic?
A seeded RNG instance lives in the engine. Each command advances the RNG once at start (stabilizing downstream draw positions). Additional draws occur inside calc stage rule functions that need random numbers.

### What guarantees reproducibility?
Given the same initial store snapshot, identical command params sequence, and identical seed, the resulting success data and effects arrays are byte‑identical (JSON) due to ordered stages, immutable fragments, deterministic RNG, and structural hashing.

### What is the integrity guard?
After each fragment merge the accumulator is structurally hashed (FNV‑1a). A final recompute verifies no out‑of‑band mutation occurred. Mismatch → engine failure `INTEGRITY_MUTATION`.

### What is simulation?
`simulate(key, params)` runs the same pipeline against a deep‑cloned store + RNG state and returns `{ result, diff, effects }` without committing state or effects. The diff lists created, mutated, and deleted entities (heuristic: arrays of objects with `id`).

### How does batch execution work?
`batch([{ key, params }, ...], { atomic? })` executes multiple commands:
- Atomic: Roll back store & RNG on first failure; `ok=false` if any failure; effects empty on failure.
- Non‑Atomic: Execute all; successes commit; failures collected; `ok=true` iff ≥1 success. Effects = concat of successful command effects.

### When do effects get post‑processed?
In the domain wrapper (e.g., OSRIC) after successful execution or after batch completion. Core engine remains domain‑agnostic.

### What is a shared rule?
A reusable rule factory function placed in `shared-rules/` only after being used verbatim by multiple commands (e.g., character existence guard). It returns a stage-compatible rule function.

### When should I create a shared rule?
When identical validation/load logic appears in ≥2 commands AND is stable AND adds clarity by centralizing failure code conventions. Avoid premature extraction.

### How do I debug a failing command?
Check the result object:
1. If domain failure: inspect code/message from the earliest failing validate/load rule.
2. If engine failure: review code (`DUPLICATE_RESULT_KEY`, `RULE_EXCEPTION`, `INTEGRITY_MUTATION`). Log or temporarily instrument rule functions to isolate fragment collisions or thrown errors.
3. Use simulation to inspect would-be diff without mutating store.

### How are rule functions ordered within a stage?
In the exact order they are declared in the builder chain. No dependency metadata—keep each rule independent aside from reading prior accumulator fragments by key.

### Can a rule read accumulator fields from later rules?
No. Only previously merged fragments are present. Dependence on a not-yet-produced key is a logic error (will be `undefined`). Order carefully within stages.

### Can rules mutate previous fragments?
No. Fragments are frozen; attempted mutation throws or is prevented by freeze semantics.

### What belongs in each stage?
- Validate: param shape checks, existence guards (return domain failure early)
- Load: fetch entities or projections (usually no mutations)
- Calc: deterministic or RNG-based derivations
- Mutate: apply store changes
- Emit: enqueue effects (should not mutate store)

### Why separate calc and emit?
To isolate pure or deterministic calculations from side-effect description, simplifying tests and making RNG usage local.

### Does the engine support parallel rule execution?
No. Rules run sequentially by stage & declaration order.

### How does the domain layer extend the core?
By wrapping engine calls (execute / batch / simulate) and post-processing effects (e.g., battle mirroring) without modifying engine internals.

### How do we ensure we don’t regress structural guarantees?
Tests cover: duplicate key detection, integrity mutation, deterministic RNG, batch rollback, simulation diff, scenario determinism.

### How small should a rule be?
Single responsibility: one validation, one fetch, one calculation, one mutation, or one effect emission concern. If you need to return multiple unrelated keys, consider splitting.

### Can a command contribute no data fields?
Yes. Its rules may return empty fragments and only emit effects. Success result will have an empty `data` object.

### How do I test RNG-dependent commands?
Use a fixed seed when constructing the engine; assert exact roll values or scenario snapshot; avoid brittle deep snapshots by focusing on critical fields.
