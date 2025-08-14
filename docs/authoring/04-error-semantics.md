# 4. Error Semantics

## Domain Failures
Use for user-correctable conditions (missing entity, invalid state for action). They do not indicate engine misconfiguration.
```ts
return ctx.fail('NO_LEADER', 'Leader character not found');
```

## Structural Failures
Caused by:
- Parameter validation failures (`PARAM_INVALID`)
- Thrown exceptions inside rules (`RULE_EXCEPTION`)
- Startup dependency issues (`DEPENDENCY_MISSING`, `CONFLICTING_RESULT_KEY`)

Avoid catching and repackaging programmer bugs as domain failures; allow them to surface as structural issues.

## Choosing Codes
Add new domain codes by extending the union in `errors/codes.ts` (ensure they are not part of the structural subset). Keep codes uppercase with underscores.

Next: Effects Authoring (5).
