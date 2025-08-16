# 4. Error Semantics

## Domain Failures
Use for user-correctable conditions (missing entity, invalid state for action). They do not indicate engine misconfiguration.
```ts
return ctx.fail('NO_LEADER', 'Leader character not found');
```
`ctx.fail` returns a structured domain failure result (it does NOT throw). The engine stops further rule execution for that command and no effects are committed. Prefer early `fail` over accumulating multiple domain problems; report the first decisive blocker.

Diagnostics now include a `failedRule` field for both domain and structural failures so you can immediately identify the stopping point (available on normal execution result diagnostics and via `simulate`).

## Structural Failures
Caused by:
- Parameter validation failures (`PARAM_INVALID`)
- Thrown exceptions inside rules (`RULE_EXCEPTION`)
- Startup dependency issues (`DEPENDENCY_MISSING`, `CONFLICTING_RESULT_KEY`)
- Store invariant violations (`STORE_CONSTRAINT`) like attempting to push HP below the allowed floor (currently -10) or invalid equip references.

Avoid catching and repackaging programmer bugs as domain failures; allow them to surface as structural issues. For store updates validate early and fail fast.

## Choosing Codes
Add new domain codes by extending the union in `errors/codes.ts` (ensure they are not part of the structural subset). Keep codes uppercase with underscores.

Next: Effects Authoring (5).
