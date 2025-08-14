# 5. Commands & Rules

Prior: Store & Mutation (4). Now the execution building blocks.

## Commands
A Command class declares:
- `static key: string` – unique registry key (e.g. `gainExperience`).
- `static params: ZodSchema` – runtime validation for input.
- `static rules: RuleClass[]` – ordered list (pre‑toposort) of rule classes.

The base constructor parses raw input; however the Engine itself chiefly uses the static metadata (it does not instantiate the Command during execution in current code).

## Rules
Rule classes are structural: any class with required static fields & an `apply(ctx)` method is accepted.
- `static ruleName: string`
- `static after?: string[]` – dependency names referencing other rules' `ruleName`.
- `static output: ZodObject` – schema describing the shape of the delta this rule adds to the accumulator.
- `apply(ctx)` – returns the delta object (keys must be unique across all rules in a command) or `undefined`.

### Accumulator / Result Keys
The Engine constructs a composite result schema by merging each rule's `output` schema. Duplicate keys throw a build error (`CONFLICTING_RESULT_KEY`). The final command result is the union of all contributed keys.

### Dependency Resolution
At startup the Engine performs a DFS topological sort. Cycles or missing dependencies throw and prevent start.

## Registration
Authors call `registerCommand(MyCommand)` (idempotent). On `engine.start()` the registry is built from all registered commands.

Next: Execution Lifecycle (6).
