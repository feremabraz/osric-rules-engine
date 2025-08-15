# Core Concepts

This document explains the ideas that shape the engine. It avoids step‑by‑step authoring instructions and focuses instead on the mental model.

---

## Pattern & Architecture

### What is the command–rule pattern?
It is a decomposition pattern where each user‑level action (a command) is realized as a graph (a DAG) of rule nodes. Each rule performs one narrow concern (validate, load, compute, mutate, emit) and contributes an isolated typed fragment (a delta) to the final result. The engine orchestrates ordering, accumulation, determinism, and error semantics.

### What is a directed acyclic graph (DAG)?
It is a structural model for rule execution:
- Directed: each edge points from a prerequisite rule to a dependent rule (ordering flows forward).
- Acyclic: you can’t start at a rule and follow dependencies back to it; cycles are rejected at registration.
- Graph: a set of nodes (rules) plus edges (declared dependencies) capturing only the needed ordering, not an arbitrary list.
Why it matters: prevents infinite loops, encodes the minimal partial order (allowing independent branches), enables topological sorting (the engine’s execution order), supports introspection/snapshot tests, and leaves room for parallel execution of independent rules without changing semantics.

### What is a command?
A named, typed entrypoint representing an intent like “gain experience” or “attack roll.” Conceptually it is: (1) a key identifying intent, (2) a parameter schema declaring the required shaped input, and (3) a set of rule classes that collectively realize the intent. Its public contract is a success or failure result; internal rule sequencing is private implementation detail.

### What is a rule?
A pure(ish) unit of domain logic with a unique name, a declared output schema, and (optionally) explicit dependency edges on earlier rules. It receives the evolving context (params, accumulated prior outputs, store facades, RNG, effect buffer) and returns a fresh object whose keys must not overlap previous contributions.

### What is a delta?
A delta is the object fragment a single rule returns:
- Disjoint: its keys must be new within the command run.
- Typed: validated against the rule’s output schema.
- Immutable: once merged, not mutated by later rules.
Together all deltas shallow‑merge to form the command’s final data payload.

Exception: some builder pipelines (e.g. character creation) pass a mutable `draft` object across several rules to incrementally assemble a complex aggregate before persistence. The engine deep‑freezes every returned delta value except those keyed `draft`. Treat this as a deliberate escape hatch; avoid introducing additional mutable fragments.

### Why split logic into multiple rules instead of one function?
Granularity yields: clearer responsibility boundaries; type‑safe incremental result construction; deterministic introspection (graph snapshots); easier test isolation; and the ability to reorder or extend behavior without rewriting monoliths.

### Can a command have multiple rules?
Yes—most real commands do. Ordering is derived from declared dependencies plus default topological ordering.

### Can a command have zero rules?
No. Commands must declare at least one rule (even if it returns an empty object) so that instrumentation, introspection, and future cross‑cutting concerns (timing, logging) have a concrete execution unit. Zero‑rule commands were removed to eliminate ambiguous “did anything run?” semantics.

### Is rule order important?
Yes, but you do not manually number them. The engine builds a dependency graph from `after` declarations and performs a topological sort. When two rules are independent their relative order is stable but not semantically relied upon—avoid hidden coupling through shared mutation.

### What ensures rules stay independent?
They cannot mutate prior output fragments (accumulator pieces are immutable by convention) and they only communicate through declared dependencies or the store/effects interfaces. Overlapping output keys produce a structural failure, surfacing unintended coupling early.

### Do rules share context?
They see a composed view: original params plus a read‑only accumulation of every previous rule’s outputs and shared facades (store, RNG, effects, logger). They do not get direct references to mutate previous outputs.

### How do rules contribute to the final result?
Each returns an object validated by its output schema. The engine shallow‑merges these fragments (disjoint key union) to form the final `data` payload on success.

### What happens if two rules return the same key?
It is treated as a structural error (engine failure) because that would make result assembly ambiguous. The command aborts before side‑effects commit.

### Are rules pure functions?
They are pure with respect to their explicit inputs and outputs except when performing sanctioned mutations through the store facade or registering effects. Purity is encouraged for validation and calculation rules; mutation/effect rules intentionally change state.

### How are side‑effects handled?
Rules add entries to an effects buffer. The buffer commits atomically only if the command (or atomic batch) succeeds. This decouples “decide to emit” from “commit emission”, supporting rollback on failure.

### Can a rule perform store mutations directly?
Yes, via provided helpers or the store facade. Convention: validate and load first, then mutate in later rules to keep failure semantics clean and reduce partial state risks.

### How does randomness fit in?
The engine gives a deterministic RNG stream (seeded). Rules that need randomness draw from `ctx.rng`. Because draws advance the stream, inserting or removing a rule shifts subsequent values. Snapshot tests or rule graph locking protect critical sequences.

### What is the engine?
It is the runtime coordinator: it loads and registers command definitions, compiles each command’s rule DAG, validates params, executes rules in dependency order, merges outputs, buffers and (conditionally) commits effects, handles failures, and exposes introspection utilities.

### What happens when the engine starts?
Startup typically loads configuration, discovers and registers commands, precomputes or validates their rule graphs (ensuring acyclicity & unique rule names), seeds RNG, and prepares internal indices for fast execution and introspection. After start, command invocation is a pure in‑memory graph walk.

### How are failures modeled?
Two broad kinds:
1. Domain failures: A rule deliberately calls `fail(code, message?)` to signal an expected business constraint violation. Effects are discarded; batch semantics decide broader impact.
2. Structural / engine failures: Parameter schema mismatch, rule graph cycles, duplicate keys, thrown exceptions, invariant violations. Treated as system issues—usually escalate in logs/tests.

### Why distinguish domain vs structural failure?
Because callers can branch on domain outcomes predictably (e.g. “insufficient funds”) while structural issues indicate authoring or system defects requiring remediation, not user messaging logic.

### What are branded IDs and why not raw strings?
Branded IDs carry a phantom type tag (e.g. `CharacterId`) so the type system can prevent mixing unrelated identity spaces. They also pass through schema validation, tightening invariants at the perimeter. This curbs entire classes of mix‑up bugs.

### How does typing stay accurate across rule accumulation?
Each rule’s output schema contributes a distinct object type; the engine composes them via intersection/merging so the final success `data` type is inferred from the static list of rule classes. Adding or removing a rule instantly reshapes the result type.

### What is the dependency graph used for beyond ordering?
Introspection (explaining why a rule runs after another), snapshot testing (guarding against accidental reordering), and impact analysis (understanding which rules must be revisited when a dependency changes).

### How does introspection work?
The engine can emit a description of each command’s DAG: nodes (rule names) and edges (dependencies). This view never exposes runtime state—only structure—making it safe for test fixtures and documentation.

### Do rules know which rules will run after them?
No. They declare only what must come before. This keeps them forward‑agnostic and promotes extensibility: new rules can be inserted later without refactoring existing logic if dependencies are satisfied.

### How are concurrent commands handled? 
Each command invocation builds its own ephemeral execution context and effect buffer. Shared mutable state resides in the store; concurrency strategy (optimistic, locking, etc.) is abstracted behind the store facade so rules focus on domain logic.

### What provides atomicity?
Single command execution plus its effect commit is atomic from the caller’s perspective. For multi‑step flows, `batchAtomic` extends this: on first hard failure, created entities, staged updates, and queued effects are rolled back (best‑effort according to store guarantees). Non‑atomic batches (`batch`) allow some steps to fail while others succeed.

### Can a rule depend on multiple earlier rules? 
Yes. It lists all required predecessors in its dependency array. All must complete successfully before it runs. Failures short‑circuit later nodes.

### What happens if a dependency chain creates a cycle?
Graph validation at registration/start catches cycles and raises an engine failure preventing command execution until resolved.

### How are parameters validated?
The command’s parameter schema enforces shape and branded IDs before any rule executes. If params fail, no rule runs, no effects buffer is created, and the result is a structured engine failure.

### Why separate validation and mutation rules?
Separation keeps failure paths predictable: domain failures ideally occur before mutations, reducing rollback complexity and side‑effect confusion. It also clarifies intent—readers can scan a set of rules and immediately see where state may change.

### How do effects differ from direct mutations?
Mutations alter persistent domain state immediately during the rule that performs them (within command scope). Effects describe external or deferred consequences (notifications, logs, triggers) that are only published if the overall command succeeds.

### How are partial outputs handled if a later rule fails?
Accumulated fragments are discarded with the failed invocation; they are not visible outside the command’s result envelope. Side‑effects are also withheld.

### Can a rule intentionally return an empty object?
Yes. Some rules exist purely for validation, gating, or mutation without contributing new data fields. They still must declare an output schema (often an empty object) to keep type merging sound.

### How is logging integrated?
The context provides a logger so each rule can record diagnostic messages tied to the command execution without polluting return types or effect channels.

### How do I reason about performance?
Rule granularity allows you to measure execution time per rule if instrumented. Because rules are sequential according to dependencies, large hotspots can be isolated and refactored without altering unrelated logic.

### How is reproducibility achieved?
Deterministic RNG + ordered rule graph + pure parameter schemas mean given the same starting store state, command params, and seed, you obtain identical outputs and effects. This supports replay/testing.

### How do branded IDs aid maintainability as the model grows?
As new entity kinds emerge, their IDs cannot be accidentally substituted in existing commands; compiler errors prompt explicit conversions or refactors, preserving semantic boundaries.

### What makes adding a new rule low risk?
Locality (rule file), explicit dependencies, enforced output key uniqueness, and type inference. If you forget a dependency, either your rule receives insufficient accumulated data (type signal) or a runtime failure occurs early; if you collide keys the engine stops you.

### Why not let rules mutate previous outputs for efficiency?
Immutability of accumulated fragments simplifies reasoning: any fragment is final once produced. This avoids hidden temporal coupling and allows safe structural introspection and potential caching.

### How does the engine guard against silent drift when editing rules?
Snapshot tests of the introspected rule graph and the final result schema can detect unintended ordering or shape changes, prompting review.

### Are there global rules?
No. Reuse is through conventional rule classes imported into multiple commands. Each command instantiates its own graph referencing those classes, keeping dependency context explicit per command.

### Can two commands share result shape keys?
Yes. Namespacing is per command execution; only within a single command must rule output keys be disjoint.

### How do batches relate to single commands conceptually?
They are higher‑order orchestration: a batch describes a sequence (or set) of commands with policy about failure propagation and atomicity. Conceptually, batches treat each command as a node; the internal rule graphs remain opaque at that level.

### What are typical rule categories?
1. Validation (check params / invariants)  
2. Loading (fetch entities / projections)  
3. Calculation (derive numbers / decisions; may consume RNG)  
4. Mutation (apply state changes)  
5. Effect emission (enqueue side‑effects)  
They remain separate to maintain clarity and testability.

### Why keep calculation separate from effect emission?
It isolates deterministic decision making from observability side‑effects, simplifying reproducibility and allowing pure calculation retests without external noise.

### How are errors localized?
Because each rule is narrow, the origin of a failure (domain or structural) is usually the throwing rule, and logs/effect absence make post‑mortem simpler than tracing a large monolithic handler.

### What is the mental model to debug a failing command?
Think of a pipeline of labeled stages (rules). Param validation passes → each rule either contributes a fragment or stops the pipeline with a failure. Examine which was last scheduled to run, inspect its dependencies, and review its guard conditions.

### How does the system stay extensible over time?
Adding a feature becomes: create a new rule class, declare dependencies, add it to the command’s rule list. Absence of cross‑rule mutation and explicit dependency edges keep existing rules stable.

### Where do cross‑cutting concerns (metrics, tracing) live conceptually?
At the engine layer around rule execution boundaries, not inside each rule’s business logic. This preserves conceptual separation: rules talk domain; engine adds operational wrappers.

### Why a DAG instead of a simple list always? 
Some rules only depend on a subset of earlier results; the DAG model makes that explicit and prevents accidental ordering constraints, enabling future parallelization or selective re‑runs (even if currently executed sequentially).

### Are there hidden implicit dependencies?
No—if a rule reads something another rule produces, that relationship should be declared. Relying on incidental order is considered a design smell that may surface via tests or code review.

### How does determinism interact with future parallelism?
By expressing explicit dependencies, any future parallel execution model can respect order where needed while freely parallelizing independent branches—still yielding the same merged result because fragments do not overlap.

---

## Recap (Conceptual Snapshot)
Commands = intents. Rules = isolated, typed, dependency‑ordered units. Engine = orchestrator providing validation, deterministic execution, accumulation, effect buffering, failure semantics, and introspection. Determinism, immutability of accumulated outputs, branded identity, and explicit dependencies underpin reliability and extensibility.

If you now want procedural guidance (how to write one), consult the dedicated authoring guide; this page is only for *what the pieces mean*.

