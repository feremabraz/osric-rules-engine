# 3. Rule Design Guidelines

## Single Responsibility
Each rule should perform one cohesive step: validation, calculation, persistence, effect emission.

## Naming
`ruleName` must be unique within the command. Use imperative or descriptive forms: `ValidateLeader`, `CalcDuration`, `Persist`.

## Dependencies
Use `after` to declare prerequisites. Keep chains shallow; avoid large webs of interdependencies. A linear chain is often clearest.

## Output Schema Discipline
Every rule needs an `output` schema—even if empty. This enforces explicitness and ensures the registry constructs a composite result shape. Empty object: `z.object({})`.

## Accumulator Usage
- Read prior rule outputs via `ctx.acc`.
- Do not mutate objects from `ctx.acc` directly; produce new data if transformation needed.
- Keys must not collide across rules.

## Error Emission
- Domain issues: `return ctx.fail('CODE', 'message')` (stop execution gracefully).
- Developer errors (unexpected states) should throw; these surface as structural `RULE_EXCEPTION` failures.

## Effects
Only emit effects in the final rule(s) after all validation/calculation rules have run, to avoid partial side effects when upstream rules might fail.

Next: Error Semantics (4).
