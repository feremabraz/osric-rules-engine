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

Helpers exported from `@osric` can streamline checks:
```ts
import { isOk, isFail, assertOk } from '@osric';
const r = await engine.command.gainExperience(charId, { amount: 100 });
if (isOk(r)) console.log(r.data.newXp);
if (isFail(r) && r.kind === 'domain') console.warn(r.error.code);
```

## Validation Failures
When params are invalid you receive `kind: 'engine', code: 'PARAM_INVALID'`. The message contains Zod issue formatting (keep developer-facing; avoid exposing raw schema errors directly to players).

`ctx.fail` in a rule short-circuits execution; no further rules run and no effects are committed. Structural failures (exceptions, validation) also prevent effect commits.

## Retrying
Domain failures are usually retryable after user correction. Structural failures typically require code changes / investigation.

Next: Deterministic Testing (6).
