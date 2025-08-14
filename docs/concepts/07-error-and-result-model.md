# 7. Error & Result Model

Prior: Execution Lifecycle (6). Now the distinction between engine failures and domain failures.

## Result Discriminant
Every command resolves to:
```
{ ok: true, data: <ResultData> }
{ ok: false, kind: 'engine', error: { code, message } }
{ ok: false, kind: 'domain', error: { code, message } }
```

### Engine (Structural) Failures
Codes: `PARAM_INVALID`, `RULE_EXCEPTION`, `DEPENDENCY_MISSING`, `CONFLICTING_RESULT_KEY`.
These indicate configuration / structural issues or thrown rule exceptions.

### Domain Failures
Examples: `CHARACTER_NOT_FOUND`, `NO_LEADER`, `STORE_CONSTRAINT`.
Produced by author code calling `ctx.fail(code, message)`. Domain failures stop further rule execution but are semantically distinct—useful for UI messaging without implying system corruption.

## Handling Patterns
```ts
const res = await engine.command.gainExperience(charId, { amount: 500 });
if (!res.ok) {
  if (res.kind === 'domain') {
    // User-facing problem (e.g. missing character)
  } else {
    // Engine problem – likely log / escalate
  }
} else {
  console.log('XP now', res.data.newXp);
}
```

Next: RNG & Determinism (8).
