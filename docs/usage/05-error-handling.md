# 5. Error Handling Patterns

## Distinguish Structural vs Domain
```ts
const res = await engine.command.gainExperience(charId, { amount: 500 });
if (!res.ok) {
  if (res.kind === 'domain') {
    switch (res.error.code) {
      case 'CHARACTER_NOT_FOUND': /* ask user to create character */ break;
      default: /* generic domain feedback */
    }
  } else {
    // Log + alert; indicates misconfiguration or internal problem
  }
}
```

## Validation Failures
When params are invalid you receive `kind: 'engine', code: 'PARAM_INVALID'`. The message contains Zod issue formatting (keep developer-facing; avoid exposing raw schema errors directly to players).

## Retrying
Domain failures are usually retryable after user correction. Structural failures typically require code changes / investigation.

Next: Deterministic Testing (6).
