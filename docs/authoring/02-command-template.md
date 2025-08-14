# 2. Command File Template

We introduced `defineCommand` which replaces the need to author a bespoke subclass for the majority of commands. You still co‑locate your `Rule` classes; the factory wires the static metadata.

Old (subclass) pattern is now legacy. Prefer the factory below.

## Minimal Example
```ts
import { defineCommand, emptyOutput } from '@osric';
import { Rule, registerCommand } from '@osric';
import { z } from 'zod';
import { getCharacter, updateCharacter } from '@osric';

// Params MUST use branded schemas for IDs (guard test will fail otherwise)
const params = z.object({ characterId: z.string(), amount: z.number().int().positive() });

class Validate extends Rule<{ character: Record<string, unknown> }> {
  static ruleName = 'Validate';
  static output = z.object({ character: z.record(z.unknown()) });
  apply(ctx: any) {
    const ch = getCharacter(ctx.store, ctx.params.characterId as any);
    if (!ch) return ctx.fail('CHARACTER_NOT_FOUND', 'Missing');
    return { character: ch };
  }
}

class Apply extends Rule<{ newXp: number }> {
  static ruleName = 'Apply';
  static after = ['Validate'];
  static output = z.object({ newXp: z.number().int() });
  apply(ctx: any) {
    const updated = updateCharacter(ctx.store, ctx.acc.character.id, {
      xp: (ctx.acc.character as any).xp + ctx.params.amount,
    });
    return { newXp: (updated as any).xp };
  }
}

export const GrantXpCommand = defineCommand({
  key: 'grantXp',
  params,
  rules: [Validate, Apply],
});
registerCommand(GrantXpCommand as any);
```

## Empty Output Rules
If a rule contributes no accumulator keys, return `{}` and use `static output = z.object({})` or reuse `emptyOutput` object when building ad‑hoc meta.

## When To Still Use a Subclass
Only if you need custom constructor logic (rare).

Next: Rule Design Guidelines (3).
